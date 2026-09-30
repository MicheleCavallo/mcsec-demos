// test/lettura.test.js — «Lettura dei risultati»: frasi generate dai numeri con regole fisse, stessi numeri delle tabelle
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcola, costoProdotto } = require('../engine.js');
const Lettura = require('../lettura.js');
const esempio = require('../esempio.js');

const ris = calcola(esempio);
const cp = costoProdotto(ris, { daMese: 1, aMese: 3, fase: 'tutte' });
const testo = frasi => frasi.map(f => f.testo).join(' | ');

test('lettura del prodotto: il finito con reale, previsto e la fase che pesa di più', () => {
  const t = testo(Lettura.letturaProdotto(cp, ris));
  assert.match(t, /3 pezzi finiti/); assert.match(t, /31,64/); assert.match(t, /16,75/);
  assert.match(t, /Fase 3/, 'la fase con il delta maggiore sul prodotto (8,89 €/pz)');
});

test('lettura del prodotto: capacità non usata contro efficienza, con gli euro del grafico', () => {
  const t = testo(Lettura.letturaProdotto(cp, ris));
  assert.match(t, /1\.106,00/); assert.match(t, /462,35/, 'fasi ferme'); assert.match(t, /340,24/, 'posti vuoti');
  assert.match(t, /65,41/, 'sbilanciamento'); assert.match(t, /sbilanciamento/i);
  assert.match(t, /capacit/i);
});

test('lettura del prodotto: scarto anomalo e mesi anomali', () => {
  const t = testo(Lettura.letturaProdotto(cp, ris));
  assert.match(t, /scarto anomalo/i); assert.match(t, /132,88/);
});

test('lettura del prodotto senza finiti: lo dice, senza inventare numeri', () => {
  const cp2 = costoProdotto(ris, { daMese: 1, aMese: 2, fase: 'tutte' });
  const t = testo(Lettura.letturaProdotto(cp2, ris));
  assert.match(t, /nessun pezzo ha completato/i); assert.doesNotMatch(t, /NaN|undefined|–/);
});

test('ogni frase ha un tipo e un testo, e non contiene NaN', () => {
  for (const f of Lettura.letturaProdotto(cp, ris)) { assert.ok(f.tipo && f.testo); assert.doesNotMatch(f.testo, /NaN|undefined/); }
});
