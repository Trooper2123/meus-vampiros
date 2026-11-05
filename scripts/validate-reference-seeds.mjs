#!/usr/bin/env node
/**
 * Validates curated metadata-only source indexes and original generic NPC seeds.
 * Run: node scripts/validate-reference-seeds.mjs
 * Does not connect to a database and does not publish source-book material.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const load = (filename) => JSON.parse(readFileSync(resolve(root, 'seeds/reference', filename), 'utf8'));
const lore = load('loresheets-v5.json');
const npcs = load('npcs-v5.json');
const generic = load('generic-antagonists-v5.json');
const errors = [];

function check(condition, message) { if (!condition) errors.push(message); }
function unique(entries, name) {
  const ids = new Set();
  for (const entry of entries) {
    check(typeof entry.id === 'string' && entry.id.length > 0, `${name}: missing id`);
    check(!ids.has(entry.id), `${name}: duplicated id ${entry.id}`);
    ids.add(entry.id);
  }
}
function sourceValid(entry, label) {
  const s = entry.source;
  check(s && typeof s.bookTitle === 'string' && s.bookTitle.trim(), `${label}: missing book`);
  check(Number.isInteger(s?.pdfPage) && s.pdfPage > 0, `${label}: invalid PDF page`);
  check(s?.printedPage === null || Number.isInteger(s?.printedPage) && s.printedPage > 0, `${label}: invalid printed page`);
}
unique(lore.entries, 'loresheets');
unique(npcs.entries, 'npcs');
unique(generic.entries, 'generic');
for (const entry of lore.entries) {
  sourceValid(entry, entry.id);
  check(entry.levels.length === 0 && entry.mechanicsStatus === 'NOT_EXTRACTED', `${entry.id}: unreviewed mechanics must stay empty`);
  check(entry.publication === 'REFERENCE_ONLY', `${entry.id}: unauthorized selectable loresheet`);
}
for (const entry of npcs.entries) {
  sourceValid(entry, entry.id);
  check(entry.statistics === null && entry.mechanicsStatus === 'NOT_EXTRACTED', `${entry.id}: unreviewed statistics must stay null`);
  check(entry.publication === 'REFERENCE_ONLY', `${entry.id}: unreviewed canon entry marked public`);
}
const creatures = new Set(['MORTAL','VAMPIRE','GHOUL','WEREWOLF','WRAITH','MUMMY','OTHER','CUSTOM']);
const roles = new Set(['ALLY','NEUTRAL','RIVAL','ANTAGONIST','EXTRA','CUSTOM']);
for (const entry of generic.entries) {
  const d = entry.data;
  check(entry.origin === 'GENERIC_TEMPLATE' && entry.rulesStatus === 'ORIGINAL_HOME_BREW', `${entry.id}: generic origin missing`);
  check(d?.sheetType === 'INTERMEDIATE', `${entry.id}: wrong sheet type`);
  check(creatures.has(d?.creatureType) && roles.has(d?.role), `${entry.id}: invalid creature or role`);
  check(typeof d?.name === 'string' && d.name.trim(), `${entry.id}: name missing`);
  check(Number.isInteger(d?.threatLevel) && d.threatLevel >= 1 && d.threatLevel <= 7, `${entry.id}: invalid threat`);
  check(['physical','social','mental'].every(key => Number.isInteger(d?.standardPools?.[key]) && d.standardPools[key] >= 0 && d.standardPools[key] <= 50), `${entry.id}: invalid pools`);
  check(Number.isInteger(d?.healthMax) && d.healthMax > 0 && Number.isInteger(d?.willpowerMax) && d.willpowerMax > 0, `${entry.id}: invalid health or willpower`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Seeds OK: ${lore.entries.length} Loresheets, ${npcs.entries.length} NPC references, ${generic.entries.length} generic NPC templates. No DB writes.`);
