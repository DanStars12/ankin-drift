import { readFile } from 'node:fs/promises';
import { parse } from 'parse5';

export const root = new URL('../', import.meta.url);
export const html = await readFile(new URL('index.html', root), 'utf8');
export const parseErrors = [];
export const document = parse(html, {
  sourceCodeLocationInfo: true,
  onParseError: error => parseErrors.push(error),
});
export function* walk(node = document) {
  yield node;
  for (const child of node.childNodes ?? []) yield* walk(child);
  if (node.content) yield* walk(node.content);
}
export const nodes = [...walk()];
export const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
