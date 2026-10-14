import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const outfile=new URL('../.tmp/school-sync.check.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('./school-sync.check.ts',import.meta.url))],outfile:fileURLToPath(outfile),bundle:true,platform:'node',format:'esm',packages:'external',tsconfig:fileURLToPath(new URL('../tsconfig.json',import.meta.url))});
await import(outfile.href);
