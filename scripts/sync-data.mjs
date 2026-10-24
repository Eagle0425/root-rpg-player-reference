import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {assemblePlayerData} from './assemble-player-data.mjs';
const input = new URL('./reference.json', import.meta.url);
const output = new URL('../site/data.js', import.meta.url);
const canonical = JSON.parse(readFileSync(input, 'utf8'));
const shared = JSON.parse(readFileSync(new URL('./gm-reference.json', import.meta.url), 'utf8'));
const data = assemblePlayerData(canonical,shared);
// GM content ships only on the dedicated GM page and is absent from player search.
for (const key of ['gm','gm_stuck','npc_tracks','mobs','npc_attacks','npc_drives']) delete data[key];
writeFileSync(output, `window.ROOT_DATA = ${JSON.stringify(data)};\n`, 'utf8');
const gm = JSON.parse(readFileSync(new URL('./gm-reference.json', import.meta.url), 'utf8'));
writeFileSync(new URL('../site/gm-data.js', import.meta.url), `window.ROOT_GM_DATA = ${JSON.stringify(gm)};\n`, 'utf8');
console.log(`Updated ${fileURLToPath(output)}`);
