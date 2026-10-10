import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
const walk = path => readdirSync(path).flatMap(name => { const file = resolve(path, name); return statSync(file).isDirectory() ? walk(file) : [file]; });
const decoder = new TextDecoder('utf-8', { fatal: true });
const files = walk(resolve(root, 'app')).filter(f => /\.(ts|html|scss)$/.test(f));
const symbols = new Set([...readFileSync(resolve(root, 'assets/icons/sidebar-icons.svg'), 'utf8').matchAll(/id="icon-([\w-]+)"/g)].map(m => m[1]));
let components = 0, sidebarItems = 0, dialogs = 0;
for (const file of files) {
  const source = decoder.decode(readFileSync(file));
  for (const match of source.matchAll(/<dialog\b[\s\S]*?<\/dialog>/g)) {
    dialogs++;
    assert.ok(match[0].includes('appDialogFocus'), `Dialog must use shared top-layer behavior: ${file}`);
    assert.ok(match[0].includes('(click)='), `Dialog must handle outside clicks: ${file}`);
    assert.ok(match[0].includes('$event.stopPropagation()'), `Dialog content must preserve inside clicks: ${file}`);
    assert.ok(match[0].includes('(keydown.escape)='), `Dialog must handle Escape: ${file}`);
  }
  if (file.endsWith('.ts') && source.includes('@Component')) {
    components++;
    assert.match(source, /styles?\s*:|styleUrls?\s*:/, `Missing component styling: ${file}`);
    for (const match of source.matchAll(/['"]([^'"]+\.s?css)['"]/g)) assert.ok(statSync(resolve(dirname(file), match[1])).isFile());
  }
  if (/sidebar.*\.ts$|navigation\.ts$|academic\.routes\.ts$/.test(file)) {
    for (const match of source.matchAll(/icon:\s*'([^']+)'/g)) { sidebarItems++; assert.ok(symbols.has(match[1]), `Missing SVG ${match[1]} in ${file}`); }
  }
}
console.log(`UI asset checks passed: ${components} styled components, ${sidebarItems} sidebar references, ${dialogs} shared dialogs, valid UTF-8 source and existing stylesheets.`);
