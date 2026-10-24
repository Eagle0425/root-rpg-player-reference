// Explicitly shared player rules remain authored once in the GM source collection.
// The allowlist prevents prep notes, NPCs or clearing scenarios entering the player payload.
export function assemblePlayerData(canonical,gm){
 const data=structuredClone(canonical);
 for(const key of ['gm','gm_stuck','npc_tracks','mobs','npc_attacks','npc_drives'])delete data[key];
 const entries=new Map(gm.entries.map(e=>[e.id,e]));
 const allowed=/^(masteries|mastery-[a-z-]+|species-options|species-playbook-system|species-abilities-system|species-move-[a-z-]+|species-ability-[a-z-]+)$/;
 for(const id of data.shared_rule_refs||[]){
  if(!allowed.test(id))throw Error('Not an approved shared player rule: '+id);
  const e=entries.get(id);if(!e)throw Error('Missing shared player rule: '+id);
  data.rule_sections.push({id:'shared-'+id,en:'shared-'+id,title:e.title,body:e.body,source:e.source.book,pages:e.source.pages,category:id.startsWith('master')?'精通選項':'物種選項',tables:e.tables,editor_note:e.editor_note||'',sharedSource:id});
 }
 return data;
}
