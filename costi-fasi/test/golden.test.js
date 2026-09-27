// test/golden.test.js — il motore deve riprodurre l'Excel DEF_01 cella per cella (tolleranza 0,005)
const test = require('node:test');
const { calcola } = require('../engine.js');
const esempio = require('../esempio.js');
const golden = require('./golden.json');
const { confrontaRighe, conta, uguale, assert } = require('./util.js');

const ris = calcola(esempio);
const perMeseFase = r => `M${r.mese} ${r.fase}`;

test('Registro: ogni cella calcolata (C..AU, 36 righe) coincide con l\'Excel', () => {
  assert.deepEqual(ris.errori, []);
  const errs = confrontaRighe(golden.registro, ris.registro, perMeseFase);
  assert.deepEqual(errs, [], `${errs.length} scostamenti su ${conta(golden.registro)} celle:\n${errs.slice(0, 40).join('\n')}`);
});

test('Semilavorati: ogni cella C..V coincide con l\'Excel', () => {
  const errs = confrontaRighe(golden.semilavorati, ris.semilavorati, perMeseFase);
  assert.deepEqual(errs, [], `${errs.length} scostamenti su ${conta(golden.semilavorati)} celle:\n${errs.slice(0, 40).join('\n')}`);
});
