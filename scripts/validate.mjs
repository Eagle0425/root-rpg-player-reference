import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('site/data.js', root), 'utf8');
const context = {window:{}};
vm.runInNewContext(source, context);
const data = context.window.ROOT_DATA;
const canonical = JSON.parse(readFileSync(new URL('scripts/reference.json', root), 'utf8'));
for (const key of ['gm','gm_stuck','npc_tracks','mobs','npc_attacks','npc_drives']) delete canonical[key];
assert.equal(JSON.stringify(data), JSON.stringify(canonical), 'reference.json and data.js must match');
assert.equal(data.gm,undefined,'Player payload must not contain the GM appendix');
const gmContext={window:{}};
vm.runInNewContext(readFileSync(new URL('site/gm-data.js',root),'utf8'),gmContext);
const gm=gmContext.window.ROOT_GM_DATA;
assert.equal(JSON.stringify(gm),JSON.stringify(JSON.parse(readFileSync(new URL('scripts/gm-reference.json',root),'utf8'))));
assert.ok(gm.entries.length>=85);
assert.equal(new Set(gm.entries.map(e=>e.id)).size,gm.entries.length);
for (const e of gm.entries) {
  assert.ok(gm.sections.some(s=>s.id===e.section),e.id);
  assert.ok(gm.books[e.source.book]&&e.source.pages,e.id);
  assert.ok(e.title&&e.summary&&e.body.trim(),'GM entry needs an actionable explanation: '+e.id);
  for (const t of e.tables) for (const row of t.rows) assert.equal(row.length,t.headers.length,e.id+' table column count');
}
assert.equal(gm.workflow.stages.length,6);
assert.equal(gm.entries.filter(e=>e.section==='playbooks').length,19);
for(const id of ['daring-exploit','setup-control','setup-marquisate','setup-eyrie','setup-alliance','setup-lizards','setup-riverfolk','setup-duchy','setup-corvid','setup-denizens','presence-control']) assert.ok(gm.entries.some(e=>e.id===id),id);
for(const e of gm.entries){assert.ok(e.translationStatus,e.id);if(e.example)assert.ok(e.exampleSource?.book&&e.exampleSource.pages,'Example needs book provenance: '+e.id);}
assert.match(data.load_rules.body,/超過上限兩倍/);
assert.equal(data.daring_exploit.tables[0].rows.length,6);
for (const stage of gm.workflow.stages) {
  const references=[...stage.references,...(stage.branches||[]).flatMap(b=>b.references)];
  for (const [id] of references) assert.ok(gm.entries.some(e=>e.id===id),'Broken workflow reference: '+id);
}
for (const f of ['gm.html','gm.js','gm.css']) assert.ok(existsSync(new URL('site/'+f,root)),f);
for (const [key,count] of Object.entries({basic:9,weapons:13,reputation:6,feats:9,risks:8,tags:45,premade:6,books:19,names:104,connections:6,creation:12,sessions:2})) {
  assert.equal(data[key].length,count,`${key} count`);
}
assert.equal(data.tags.filter(tag=>tag.title.includes('〔負面〕')).length,10);
for (const item of [...data.basic,...data.weapons,...data.reputation]) {
  const note=data.explanations[item.en];
  assert.ok(note?.pages && note.sections.length, `Missing explanation: ${item.en}`);
  for (const section of note.sections) assert.ok(section.title && section.body, item.en);
}
for (const key of ['Travel Through the Forest','Travel Along the Path',...data.glossary.map(row=>row[1]),'Equipment']) {
  assert.ok(data.explanations[key]?.sections.length, `Missing supporting explanation: ${key}`);
}
assert.equal(Object.keys(data.explanations).length,39);
assert.equal(data.factions.length,8);
assert.deepEqual(Array.from(data.factions.slice(4),f=>f.title),['河岸商會','陰謀羽黨','鼴鼠地國','蜥蜴神教']);
for (const faction of data.factions) {
  for (const key of ['title','en','overview','goal','tension','vagabonds','hook','pages','source']) assert.ok(faction[key],`Faction ${faction.title}: ${key}`);
  assert.ok(existsSync(new URL('site/'+faction.image,root)),faction.title+' image');
}
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
