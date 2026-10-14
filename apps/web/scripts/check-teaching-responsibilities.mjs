import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const out=new URL('../.tmp/teaching-responsibilities.check.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('./teaching-responsibilities.check.ts',import.meta.url))],outfile:fileURLToPath(out),bundle:true,platform:'node',format:'esm',packages:'external',tsconfig:fileURLToPath(new URL('../tsconfig.json',import.meta.url))});
await import(out.href);
