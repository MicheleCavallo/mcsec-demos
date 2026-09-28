// test/lettura-linea.test.js — «Lettura dei risultati» del Totale linea: prodotti finiti, euro, Linea non assegnata
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const Lettura = require('../../costi-fasi/lettura.js');
const E = require('../esempio-linea.js');

test('lettura della linea: un verdetto per prodotto, gli euro della linea, i residui non assegnati', () => {
  const res = L.calcolaLinea(E);
  const t = L.totaleLinea(res, { daMese: 1, aMese: 3 });
  const frasi = Lettura.letturaLinea(t, res);
  const testo = frasi.map(f => f.testo).join(' | ');
  assert.match(testo, /Prodotto 1/); assert.match(testo, /Prodotto 2/);
  assert.match(testo, /1\.332,00/, 'spesa della linea');
  assert.match(testo, /255,00/, 'euro della Linea non assegnata');
  assert.match(testo, /Fase 1/); assert.match(testo, /15,0 %/, 'residuo di Fase 1');
  for (const f of frasi) assert.doesNotMatch(f.testo, /NaN|undefined/);
});
