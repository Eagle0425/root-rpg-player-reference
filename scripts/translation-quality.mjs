import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),dir=new URL('./translation/',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const d=read('scripts/reference.json'),g=read('scripts/gm-reference.json');
const terms=read('scripts/translation/terms.json'),reviews=read('scripts/translation/reviews.json');
const catalog=[],issues=[],failures=[];
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const hash=s=>createHash('sha256').update(s).digest('hex');
function add(id,kind,audience,item,pointer,book,pages){
 const text=JSON.stringify(item),sha256=hash(text);
 assert.ok(['core','exp'].includes(book),'Unknown source '+id);
 assert.ok(pages,'Missing printed pages '+id);
 const review=reviews.records.find(r=>r.id===id&&r.sha256===sha256);
 catalog.push({id,kind,audience,book,pages:String(pages),title:item.title||item.zh||item.en,category:item.category||kind,pointer,sha256,review:review?.status||'recorded'});
 if(item.editor_note)issues.push({id,kind:'source_ambiguity',note:item.editor_note,book,pages:String(pages)});
 // Mechanics aliases only; generic prose variants are flagged for contextual review instead of replaced.
 for(const [en,t] of Object.entries(terms.terms))for(const wrong of t.forbidden||[]){
  if(text.includes(wrong))failures.push({id,kind:'forbidden_term',en,wrong,expected:t.zh});
 }
}
for(const key of ['basic','weapons','reputation','risks','tags','premade','connections'])d[key].forEach((e,i)=>add(`player:${key}:core:${slug(e.en)}`,key,'player',{...e,explanation:d.explanations[e.en]},`reference.json#/${key}/${i}`,'core',e.pages));
for(const [key,items] of Object.entries(d.expansion||{}))items.forEach((e,i)=>add(`player:${key}:exp:${slug(e.en)}`,key,'player',e,`reference.json#/expansion/${key}/${i}`,'exp',e.pages));
d.feats.forEach(([title,en,use,risks],i)=>add(`player:feats:core:${slug(en)}`,'feats','player',{title,en,use,risks},`reference.json#/feats/${i}`,'core','69–72'));
for(const [i,e] of (d.rule_sections||[]).entries())add(`player:rules:${e.source}:${e.id}`,'rules','player',e,`reference.json#/rule_sections/${i}`,e.source,e.pages);
for(const [i,b] of d.books.entries()){
 add(`player:playbooks:${b.source}:${slug(b.en)}`,'playbook','player',b,`reference.json#/books/${i}`,b.source,b.pages);
 assert.ok(Array.isArray(b.full_sections||[]),'Malformed book sections '+b.en);
 for(const [j,s] of (b.full_sections||[]).entries())add(`player:playbook-guide:${b.source}:${slug(b.en)}:${s.id}`,'playbook-guide','player',s,`reference.json#/books/${i}/full_sections/${j}`,b.source,s.pages);
}
for(const [i,[title,en,body]] of d.glossary.entries())add(`player:glossary:${slug(en)}`,'glossary','player',{title,en,body,explanation:d.explanations[en]},`reference.json#/glossary/${i}`,'core',d.explanations[en]?.pages||'25–40');
for(const [i,e] of d.drive_explanations.entries())add(`player:drive:core:${i+1}`,'drive','player',e,`reference.json#/drive_explanations/${i}`,'core',e.pages);
for(const [i,[title,body]] of d.creation.entries())add(`player:creation:${i+1}`,'creation','player',{title,body},`reference.json#/creation/${i}`,'core','41–62');
for(const [i,e] of d.sessions.entries())add(`player:session:${i+1}`,'session','player',e,`reference.json#/sessions/${i}`,'core','130');
for(const [i,e] of d.factions.entries())add(`player:faction:${slug(e.en)}`,'faction','player',e,`reference.json#/factions/${i}`,i<4?'core':'exp',e.pages);
for(const [key,pages] of [['load_rules','183'],['daring_exploit','61–62'],['advancement_details','170–176']])add(`player:${key}`,'rules','player',{title:key,...d[key]},`reference.json#/${key}`,'core',pages);
for(const [key,pages] of [['forest_result','121–122'],['path_result','123–124']])add(`player:${key}`,'travel','player',{title:key,body:d[key]},`reference.json#/${key}`,'core',pages);
for(const [i,e] of g.entries.entries()){
 add(`gm:${e.id}`,e.section,'gm',e,`gm-reference.json#/entries/${i}`,e.source.book,e.source.pages);
 if(/摘要|索引|尚非/.test(e.translationStatus))issues.push({id:`gm:${e.id}`,kind:'summary_needs_source_review',note:e.translationStatus,book:e.source.book,pages:e.source.pages});
}
for(const id of d.shared_rule_refs||[]){
 const i=g.entries.findIndex(e=>e.id===id),e=g.entries[i];assert.ok(e,'Missing shared rule '+id);
 add(`player:shared:${id}`,'shared-rule','player',e,`gm-reference.json#/entries/${i}`,e.source.book,e.source.pages);
}
assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length,'Duplicate catalog ID');
for(const e of catalog){
 for(const key of ['id','kind','audience','book','pages','title','category','pointer','sha256','review'])assert.ok(typeof e[key]==='string'&&e[key].length,'Required index field '+key+' '+e.id);
 assert.ok(['player','gm'].includes(e.audience),e.id);
 assert.ok(['recorded','source_checked','semantic_reviewed'].includes(e.review),e.id);
 assert.match(e.sha256,/^[a-f0-9]{64}$/,e.id);
 assert.match(e.pointer,/^(reference|gm-reference)\.json#\//,e.id);
 const [file,fragment]=e.pointer.split('#');let value=file==='reference.json'?d:g;
 for(const part of fragment.slice(1).split('/'))value=value?.[part.replace(/~1/g,'/').replace(/~0/g,'~')];
 assert.notEqual(value,undefined,'Unresolved content pointer '+e.id);
}
for(const [key,count] of Object.entries({weapons:10,reputation:11,feats:5,drives:12,natures:12,connections:6,tags:31,premade:29}))assert.equal(d.expansion[key].length,count,'Expansion completeness '+key);
assert.equal(d.premade.length,17,'Core premade inventory');
const result={version:1,scope:'已收錄條目的結構及術語檢查；不是逐段翻譯完整性證明',items:catalog.length,books:{core:catalog.filter(e=>e.book==='core').length,exp:catalog.filter(e=>e.book==='exp').length},reviewStates:Object.fromEntries(['recorded','source_checked','semantic_reviewed'].map(s=>[s,catalog.filter(e=>e.review===s).length])),failures,issues};
const output=[['catalog.json',{version:1,items:catalog}],['quality-report.json',result]];
if(process.argv.includes('--write'))for(const [file,value] of output)writeFileSync(new URL(file,dir),JSON.stringify(value,null,2)+'\n');
else for(const [file,value] of output)assert.equal(readFileSync(new URL(file,dir),'utf8'),JSON.stringify(value,null,2)+'\n','Stale generated '+file+'; run --write');
console.log(JSON.stringify({items:result.items,books:result.books,reviewStates:result.reviewStates,sourceIssues:issues.length,failures:failures.length}));
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
