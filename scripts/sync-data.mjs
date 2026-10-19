import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const input = new URL('./reference.json', import.meta.url);
const output = new URL('../site/data.js', import.meta.url);
const data = JSON.parse(readFileSync(input, 'utf8'));
writeFileSync(output, `window.ROOT_DATA = ${JSON.stringify(data)};\n`, 'utf8');
console.log(`Updated ${fileURLToPath(output)}`);
