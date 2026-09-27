// test/util.js — confronto cella per cella con il golden letto dall'Excel
const assert = require('node:assert/strict');
const TOL = 0.005;
function uguale(att, trov) {
  if (att === null) return trov === null || trov === undefined || trov === '' || trov === 0;
  if (typeof att === 'string') return String(trov).replace('⚠', '').trim() === att;
  return typeof trov === 'number' && Math.abs(trov - att) <= TOL;
}
// confronta tutte le lettere di ogni riga attesa; ritorna la lista dei mismatch
function confrontaRighe(attese, trovate, chiave) {
  const errs = [];
  for (const a of attese) {
    const t = (trovate || []).find(x => chiave(x) === chiave(a));
    if (!t) { errs.push(`riga mancante ${JSON.stringify(chiave(a))}`); continue; }
    for (const [k, v] of Object.entries(a)) {
      if (k === 'mese' || k === 'fase') continue;
      if (!uguale(v, t[k])) errs.push(`${chiave(a)} ${k}: atteso ${JSON.stringify(v)} trovato ${JSON.stringify(t[k])}`);
    }
  }
  return errs;
}
function conta(attese) { return attese.reduce((s, r) => s + Object.keys(r).filter(k => k !== 'mese' && k !== 'fase').length, 0); }
module.exports = { uguale, confrontaRighe, conta, TOL, assert };
