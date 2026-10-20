const {spawnSync,spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
let runtime=process.execPath;
if(Number(process.versions.node.split('.')[0])<22){
  runtime=process.env.CONNECTA_NODE||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  if(!fs.existsSync(runtime)){console.error('Connecta needs Node.js 22.22 or newer. Set CONNECTA_NODE to its executable.');process.exit(1);}
}
const root=path.resolve(__dirname,'..');
const build=spawnSync(runtime,['scripts/build.cjs'],{cwd:root,stdio:'inherit'});
if(build.status!==0)process.exit(build.status||1);
const child=spawn(runtime,['--env-file-if-exists=.env','server.cjs'],{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
