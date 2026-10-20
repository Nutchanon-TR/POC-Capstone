import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
const container = process.env.POSTGRES_CONTAINER || 'engram-postgres';
const database = 'connecta_editor',
  role = 'connecta_editor_app';
const envFile = 'server/.env.local';
try {
  await access(envFile);
  console.log('Database configuration already exists. No credentials changed.');
  process.exit(0);
} catch {}
const info = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
const env = Object.fromEntries(
  info.Config.Env.map((v) => [v.slice(0, v.indexOf('=')), v.slice(v.indexOf('=') + 1)]),
);
const admin = env.POSTGRES_USER || 'postgres';
function sql(query) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      admin,
      '-d',
      env.POSTGRES_DB || admin,
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}
if (
  sql(`SELECT datname FROM pg_database WHERE datname='${database}';`) ||
  sql(`SELECT rolname FROM pg_roles WHERE rolname='${role}';`)
)
  throw new Error('Target database/role already exists; refusing to replace credentials.');
const password = randomBytes(32).toString('hex');
sql(
  `CREATE ROLE ${role} LOGIN PASSWORD '${password}'; CREATE DATABASE ${database} OWNER ${role}; REVOKE ALL ON DATABASE ${database} FROM PUBLIC;`,
);
const port = info.NetworkSettings.Ports['5432/tcp'][0].HostPort;
await mkdir('server', { recursive: true });
await writeFile(
  envFile,
  `DATABASE_URL=postgresql://${role}:${password}@127.0.0.1:${port}/${database}\nAPI_PORT=3102\n`,
  { flag: 'wx' },
);
console.log(
  `Created database ${database} and dedicated role ${role} on port ${port}. Credentials saved locally.`,
);
