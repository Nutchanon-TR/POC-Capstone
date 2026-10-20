const esbuild = require('esbuild');
Promise.all([
  esbuild.build({entryPoints:['src/hall.ts'],bundle:true,format:'iife',platform:'browser',target:'es2022',outfile:'dist/hall.js',sourcemap:true}),
  esbuild.build({entryPoints:['src/media.ts'],bundle:true,format:'iife',platform:'browser',target:'es2022',outfile:'dist/media.js',sourcemap:true}),
]).catch(error=>{console.error(error.message);process.exitCode=1;});
