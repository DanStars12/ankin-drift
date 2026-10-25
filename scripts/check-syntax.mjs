import { readFile } from 'node:fs/promises';
import { parse } from 'acorn';
import { nodes, attr, root } from './html.mjs';

let checked = 0;
for (const node of nodes.filter(n => n.tagName === 'script')) {
  const type = attr(node, 'type') || 'text/javascript';
  if (!['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
  const src = attr(node, 'src');
  const label = src || `index.html:${node.sourceCodeLocation.startLine}`;
  if (src && /^(?:[a-z]+:|\/\/)/i.test(src)) throw Error(`External script cannot be syntax checked: ${src}`);
  const code = src ? await readFile(new URL(src, root), 'utf8') : node.childNodes.map(n => n.value ?? '').join('');
  try {
    parse(code, { ecmaVersion: 'latest', sourceType: type === 'module' ? 'module' : 'script' });
  } catch (error) {
    throw Error(`${label}: ${error.message}`, { cause: error });
  }
  console.log(`PASS JavaScript syntax: ${label}`);
  checked++;
}
if (!checked) throw Error('No application scripts found');
parse(await readFile(new URL('sw.js', root), 'utf8'), { ecmaVersion: 'latest' });
console.log(`PASS ${checked} application scripts and sw.js`);
