// test/strati.test.js — un prodotto solo con quota = capacità v1 riproduce la v1 cella per cella; due prodotti → due strati
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const { calcola } = require('../../costi-fasi/engine.js');
const ESEMPIO_V1 = require('../../costi-fasi/esempio.js');
const { dueProdotti } = require('./scenari.js');
const TOL = 0.005;

function stessaRiga(a, b, dove) {
  for (const [k, v] of Object.entries(a)) {
    if (k === 'input') continue;
    if (typeof v === 'number') assert.ok(typeof b[k] === 'number' && Math.abs(v - b[k]) <= TOL, `${dove} ${k}: ${v} vs ${b[k]}`);
    else if (v === null || typeof v === 'string') assert.equal(b[k], v, `${dove} ${k}`);
  }
}

test('scenarioStrato: capacità = quota, fisso = fisso di fase × peso, fissoReale × peso solo se la linea non è ferma', () => {
  const s = dueProdotti(); s.consuntivo.linea = { '1': { F1: { fissoReale: 200 } } };
  s.consuntivo.P1 = { '1': { F1: { entrati: 10, lavorati: 10, scrap: 0, usciti: 10, varReale: 11 }, F2: { lavorati: 0 } } };
  const rip = L.ripartisciFisso(s, L.calcolaPesi(s));
  const v1 = L.scenarioStrato(s, 'P1', rip);
  assert.equal(v1.versione, 1); assert.deepEqual(v1.prodotti[0].percorso, ['F1', 'F2']);
  assert.equal(v1.parametri.F1.capacita['1'], 30); assert.equal(v1.parametri.F1.capacita['12'], 30);
  assert.ok(Math.abs(v1.parametri.F1.fisso['1'] - 90) < 1e-9); assert.ok(Math.abs(v1.parametri.F2.fisso['1'] - 93.75) < 1e-9);
  assert.ok(Math.abs(v1.registro.P1['1'].F1.fissoReale - 120) < 1e-9, 'fisso reale × peso');
  assert.equal('fissoReale' in v1.registro.P1['1'].F2, false, 'F2 ferma per la linea nel mese 1: nessun fisso reale');
  assert.equal(v1.registro.P1['1'].F1.varReale, 11);
});

test('un solo prodotto con quota = capacità v1: lo strato riproduce la v1 cella per cella (Registro, Semilavorati, Sintesi, Costo prodotto)', () => {
  const rif = calcola(ESEMPIO_V1);
  const res = L.calcolaLinea(L.convertiV1(ESEMPIO_V1));
  assert.deepEqual(res.errori, []);
  const st = res.strati.P1;
  assert.equal(st.registro.length, rif.registro.length);
  rif.registro.forEach((r, i) => stessaRiga(r, st.registro[i], `Registro M${r.mese} ${r.fase}`));
  rif.semilavorati.forEach((r, i) => stessaRiga(r, st.semilavorati[i], `Semilavorati M${r.mese} ${r.fase}`));
  rif.sintesi.forEach((r, i) => stessaRiga(Object.assign({}, r, { scostCumFase: undefined }), st.sintesi[i], `Sintesi M${r.mese}`));
  for (const k of ['lavorati', 'buoni', 'finitiPezzi', 'finitoCosto', 'realePieno', 'attesoPieno']) assert.ok(Math.abs(rif.costoProdotto[k] - st.costoProdotto[k]) <= TOL, k);
  assert.ok(Math.abs(rif.costoProdotto.grafico2.totale - 1106) <= TOL);
  assert.deepEqual(st.ko, []);
});

test('due prodotti → due strati, ciascuno con il proprio percorso e i propri pezzi', () => {
  const s = dueProdotti(); s.consuntivo.linea = { '1': { F1: { fissoReale: 200 }, F2: { fissoReale: 150 }, F3: { fissoReale: 100 } } };
  s.consuntivo.P1 = { '1': { F1: { entrati: 10, lavorati: 10, scrap: 0, usciti: 10, varReale: 11 } } };
  s.consuntivo.P2 = { '1': { F1: { entrati: 5, lavorati: 5, scrap: 1, usciti: 4, varReale: 9 } } };
  const res = L.calcolaLinea(s);
  assert.deepEqual(res.errori, []);
  assert.deepEqual(Object.keys(res.strati), ['P1', 'P2']);
  assert.deepEqual(res.strati.P2.percorso, ['F1', 'F3']);
  assert.equal(res.strati.P1.registro.find(r => r.mese === 1 && r.fase === 'F1').J, 10);
  assert.equal(res.strati.P2.registro.find(r => r.mese === 1 && r.fase === 'F1').J, 5);
  assert.ok(Math.abs(res.strati.P1.registro.find(r => r.mese === 1 && r.fase === 'F1').S - 120) < 1e-9, 'fisso reale di P1 su F1 = 200 × 0,6');
  assert.ok(res.controlli.every(c => c.prodotto === 'P1' || c.prodotto === 'P2'));
});

test('calcolaLinea con scenario non valido: errori e nessuno strato', () => {
  const s = dueProdotti(); s.prodotti[0].parametri.F1.quota['1'] = 999;
  const res = L.calcolaLinea(s);
  assert.ok(res.errori.length > 0); assert.deepEqual(res.strati, {});
});
