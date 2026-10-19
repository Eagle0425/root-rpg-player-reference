import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('site/data.js', root), 'utf8');
const context = {window:{}};
vm.runInNewContext(source, context);
const data = context.window.ROOT_DATA;
const canonical = JSON.parse(readFileSync(new URL('scripts/reference.json', root), 'utf8'));
assert.equal(JSON.stringify(data), JSON.stringify(canonical), 'reference.json and data.js must match');
for (const [key,count] of Object.entries({basic:9,weapons:13,reputation:6,feats:9,risks:8,tags:45,premade:6,books:19,names:104,connections:6,creation:12,sessions:2})) {
  assert.equal(data[key].length,count,`${key} count`);
}
assert.equal(data.tags.filter(tag=>tag.title.includes('〔負面〕')).length,10);
for (const book of data.books) {
  assert.ok(existsSync(new URL(`site/${book.portrait}`,root)),book.portrait);
  assert.equal(book.stats.length,5);
  assert.ok(book.skills.every(i=>Number.isInteger(i)&&i>=0&&i<10));
  assert.ok(book.feats.every(i=>Number.isInteger(i)&&i>=0&&i<9));
  assert.equal(book.connections.length,book.connection_effects.length);
}
for (const file of data.downloads) assert.ok(existsSync(new URL(`site/downloads/${file.file}`,root)),file.file);
for (const file of ['site/index.html','site/styles.css','site/app.js','site/assets/favicon.svg']) assert.ok(existsSync(new URL(file,root)),file);
console.log('Validated 19 roles, 45 tags, all reference categories, 19 portraits and 3 PDF downloads.');
