#!/usr/bin/env node
/* 
  Run from the project root:
  node fix_logutils_mrsraccoon.cjs

  It updates src/lib/logUtils.js so names like MrsRaccoon are no longer rejected
  just because they contain "cc".
*/

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'lib', 'logUtils.js');

if (!fs.existsSync(filePath)) {
  console.error(`Nu am găsit fișierul: ${filePath}`);
  process.exit(1);
}

const oldCode = `function normalizeSecondaryPlayerName(parts) {
 const name = parts.join(' ').replace(/^[-#•\\d.\\s]+/, '').trim();

 if (!name || isSecondaryNumber(name)) return '';

 const lower = name.toLowerCase();

 if (

 lower.includes('kill') ||

 lower.includes('death') ||

 lower.includes('damage') ||

 lower.includes('streak') ||

 lower.includes('total') ||

 lower.includes('fort') ||

 lower.includes('cc')

 ) {

 return '';

 }

 return name;

}`;

const newCode = `function normalizeSecondaryPlayerName(parts) {
 const name = parts.join(' ').replace(/^[-#•\\d.\\s]+/, '').trim();

 if (!name || isSecondaryNumber(name)) return '';

 const normalized = name
 .toLowerCase()
 .replace(/([a-z])([A-Z])/g, '$1 $2')
 .replace(/[^a-z0-9]+/g, ' ')
 .trim();

 const headerWords = new Set([
 'player',
 'name',
 'family',
 'kills',
 'kill',
 'deaths',
 'death',
 'kd',
 'k d',
 'damage',
 'damage dealt',
 'damage taken',
 'killstreak',
 'kill streak',
 'streak',
 'killfeed',
 'kill feed',
 'feed',
 'total',
 'fort',
 'damage to fort',
 'cc hits',
 'cc',
 ]);

 if (headerWords.has(normalized)) {
 return '';
 }

 return name;

}`;

let source = fs.readFileSync(filePath, 'utf8');

if (!source.includes(oldCode)) {
  const flexiblePattern =
    /function normalizeSecondaryPlayerName\(parts\) \{[\s\S]*?const lower = name\.toLowerCase\(\);[\s\S]*?lower\.includes\('cc'\)[\s\S]*?return name;\s*\}/;

  if (!flexiblePattern.test(source)) {
    console.error('Nu am găsit funcția normalizeSecondaryPlayerName în forma așteptată.');
    process.exit(1);
  }

  source = source.replace(flexiblePattern, newCode);
} else {
  source = source.replace(oldCode, newCode);
}

fs.writeFileSync(filePath, source, 'utf8');

console.log('OK: src/lib/logUtils.js a fost actualizat. MrsRaccoon nu mai este respins din cauza "cc".');
