import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const file = 'server/.env.local';
let env = await readFile(file, 'utf8');
const values = Object.fromEntries(
  env
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
if (values.LIVEKIT_URL && values.LIVEKIT_URL !== 'ws://127.0.0.1:7880')
  throw Error('A different LiveKit deployment is configured; no local settings changed.');
const key = values.LIVEKIT_API_KEY || 'connecta-local',
  secret = values.LIVEKIT_API_SECRET || randomBytes(32).toString('hex');
for (const [name, value] of Object.entries({
  LIVEKIT_URL: 'ws://127.0.0.1:7880',
  LIVEKIT_API_KEY: key,
  LIVEKIT_API_SECRET: secret,
}))
  if (!values[name]) env += `\n${name}=${value}\n`;
await writeFile(file, env);
await mkdir('infra', { recursive: true });
await writeFile(
  'infra/livekit.local.yaml',
  `port: 7880\nbind_addresses: ["0.0.0.0"]\nrtc:\n  tcp_port: 7881\n  udp_port: 7882\n  use_external_ip: false\n  node_ip: 127.0.0.1\nkeys:\n  ${JSON.stringify(key)}: ${JSON.stringify(secret)}\nlogging:\n  level: warn\n`,
);
console.log('Local LiveKit configuration ready. Credentials stay in ignored local files.');
