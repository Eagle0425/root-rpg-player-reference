import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import {assemblePlayerData} from './assemble-player-data.mjs';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('site/data.js', root), 'utf8');
const context = {window:{}};
vm.runInNewContext(source, context);
const data = context.window.ROOT_DATA;
const canonical = assemblePlayerData(JSON.parse(readFileSync(new URL('scripts/reference.json', root), 'utf8')),JSON.parse(readFileSync(new URL('scripts/gm-reference.json',root),'utf8')));
for (const key of ['gm','gm_stuck','npc_tracks','mobs','npc_attacks','npc_drives']) delete canonical[key];
assert.equal(JSON.stringify(data), JSON.stringify(canonical), 'reference.json and data.js must match');
assert.equal(data.gm,undefined,'Player payload must not contain the GM appendix');
assert.equal(data.rule_sections.filter(e=>e.sharedSource).length,data.shared_rule_refs.length);
assert.ok(data.rule_sections.filter(e=>e.sharedSource).every(e=>!e.id.includes('grove')&&!e.id.includes('npc')&&!e.id.includes('prep')),'Only approved player options may be shared');
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
assert.ok(!JSON.stringify(data).includes('originalPages'));
assert.ok(!JSON.stringify(gm).includes('originalPages'));
assert.equal(data.drive_explanations.length,15);
assert.ok(data.drive_explanations.every(t=>t.condition&&t.body));
assert.equal(gm.entries.filter(e=>e.id.startsWith('mastery-')).length,17);
assert.equal(gm.entries.filter(e=>e.id.startsWith('species-move-')).length,10);
assert.equal(gm.entries.filter(e=>e.id.startsWith('species-ability-')).length,10);
assert.ok(gm.entries.filter(e=>e.section==='clearings').every(e=>e.category));
for(const book of data.books) assert.equal(book.drive_explanations.length,book.drives_full.length);
for(const name of ['Depletion','Exhaustion','Injury','Wear']) assert.ok(data.explanations[name].sections.length>=6,name+' needs recovery details');
for (const stage of gm.workflow.stages) {
  const references=[...stage.references,...(stage.branches||[]).flatMap(b=>b.references)];
  for (const [id] of references) assert.ok(gm.entries.some(e=>e.id===id),'Broken workflow reference: '+id);
}
for (const f of ['gm.html','gm.js','gm.css']) assert.ok(existsSync(new URL('site/'+f,root)),f);
for (const [key,count] of Object.entries({basic:9,weapons:13,reputation:6,feats:9,risks:8,tags:45,premade:17,books:19,names:104,connections:6,creation:12,sessions:2})) {
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
for(const [key,count] of Object.entries({weapons:10,reputation:11,feats:5,drives:12,natures:12,connections:6,tags:31,premade:29})){
  assert.equal(data.expansion[key].length,count,'Expansion '+key);
  assert.ok(data.expansion[key].every(e=>e.source==='exp'&&e.pages&&e.title&&e.body),'Expansion provenance '+key);
}
for(const b of data.books)assert.ok(['core','exp'].includes(b.source)&&b.pages,b.en);
for(const rule of data.rule_sections)assert.ok(rule.id&&rule.pages&&rule.source&&rule.body,rule.id);
console.log('Validated core and expansion inventories, provenance, GM separation, tables, portraits and PDF downloads.');
