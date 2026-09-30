// test/registro.test.js — casi mirati del Registro (Review Focus 1 e 2 del piano)
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcola } = require('../engine.js');
const esempio = require('../esempio.js');

test('mese vuoto in mezzo: i pezzi usciti restano in transito finché non sono dichiarati entrati', () => {
  const sc = structuredClone(esempio);
  // sposto il consuntivo di M2 e M3 in M3 e M4, lasciando M2 completamente vuoto (entrati compresi)
  sc.registro.P1 = { '1': sc.registro.P1['1'], '3': sc.registro.P1['2'], '4': sc.registro.P1['3'] };
  const r = calcola(sc);
  const m2f1 = r.registro.find(x => x.mese === 2 && x.fase === 'F1');
  const m2f2 = r.registro.find(x => x.mese === 2 && x.fase === 'F2');
  const m3f2 = r.registro.find(x => x.mese === 3 && x.fase === 'F2');
  assert.equal(m2f2.attiva, false);
  assert.equal(m2f2.H, 0, 'nessuno ha dichiarato entrati in F2 nel mese 2');
  assert.equal(m2f2.L, 0, 'quindi nessuna coda in F2');
  assert.equal(m2f1.AO, 10, 'i 10 pezzi usciti da F1 sono in transito a valle');
  assert.equal(m3f2.H, 10, 'in M3 l\'utente li dichiara entrati'); assert.equal(m3f2.I, 10);
  assert.equal(m3f2.AI, 'OK');
  assert.deepEqual(r.ko, [], JSON.stringify(r.ko.slice(0, 3)));
});

test('entrati manuali: dichiarare entrati più degli usciti a monte non è un errore del motore, ma il transito va negativo', () => {
  const sc = structuredClone(esempio);
  sc.registro.P1['2'].F2.entrati = 12;   // in F1 ne sono usciti 10
  const r = calcola(sc);
  assert.equal(r.registro.find(x => x.mese === 2 && x.fase === 'F1').AO, -2);
});

test('S vuoto = riga senza attività; S zero = fase attiva con fisso reale zero', () => {
  const sc = structuredClone(esempio);
  const r0 = calcola(sc).registro.find(x => x.mese === 1 && x.fase === 'F2');
  assert.equal(r0.attiva, false); assert.equal(r0.AD, 0); assert.equal(r0.AI, null);
  sc.registro.P1['1'].F2 = { fissoReale: 0 };
  const r1 = calcola(sc).registro.find(x => x.mese === 1 && x.fase === 'F2');
  assert.equal(r1.attiva, false, 'U + J = 0 anche con S = 0: come l\'Excel, la riga tace');
  sc.registro.P1['1'].F2 = { fissoReale: 0, varReale: 5 };
  const r2 = calcola(sc).registro.find(x => x.mese === 1 && x.fase === 'F2');
  assert.equal(r2.attiva, true); assert.equal(r2.AD, 5, 'con J = 0 tutto il variabile va in non produzione');
  assert.equal(r2.X, -150, 'fisso reale 0 contro budget 150');
});
