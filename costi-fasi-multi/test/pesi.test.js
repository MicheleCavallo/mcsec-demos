// test/pesi.test.js — pesi = quota ÷ capacità piena; fisso di fase diviso per pesi; residuo alla Linea
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const { dueProdotti } = require('./scenari.js');
const vicino = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('calcolaPesi: F1 condivisa (30/50 + 20/80), F2 solo P1, F3 solo P2, fase non usata → residuo 1', () => {
  const s = dueProdotti(); s.fasi.push({ id: 'F4', nome: 'Fase 4' }); s.linea.F4 = { fisso: {} };
  const p = L.calcolaPesi(s)[0];
  vicino(p.fasi.F1.pesi.P1, 0.6, 'P1 su F1'); vicino(p.fasi.F1.pesi.P2, 0.25, 'P2 su F1'); vicino(p.fasi.F1.somma, 0.85, 'somma F1'); vicino(p.fasi.F1.residuo, 0.15, 'residuo F1');
  vicino(p.fasi.F2.pesi.P1, 0.625, 'P1 su F2'); assert.equal(p.fasi.F2.pesi.P2, undefined); vicino(p.fasi.F2.residuo, 0.375, 'residuo F2');
  vicino(p.fasi.F3.pesi.P2, 0.25, 'P2 su F3');
  assert.deepEqual(p.fasi.F4.pesi, {}); assert.equal(p.fasi.F4.residuo, 1);
  // pezzi equivalenti del primo prodotto che usa la fase: F1 → riferimento P1 (cap. 50): 30 + 20 × 50/80 = 42,5 su 50
  assert.equal(p.fasi.F1.equivalenti.riferimento, 'P1'); vicino(p.fasi.F1.equivalenti.usati, 42.5, 'equivalenti F1'); assert.equal(p.fasi.F1.equivalenti.capacita, 50);
});

test('calcolaPesi: la quota cambiata nel mese 5 vale da lì in poi (eredità)', () => {
  const s = dueProdotti(); s.prodotti[0].parametri.F1.quota['5'] = 10;
  const pesi = L.calcolaPesi(s);
  vicino(pesi[3].fasi.F1.pesi.P1, 0.6, 'M4'); vicino(pesi[4].fasi.F1.pesi.P1, 0.2, 'M5'); vicino(pesi[11].fasi.F1.pesi.P1, 0.2, 'M12');
});

test('ripartisciFisso: Σ quote dei prodotti + residuo linea = fisso di fase, standard e reale; fase ferma → tutto null', () => {
  const s = dueProdotti();
  s.consuntivo.linea = { '1': { F1: { fissoReale: 200 }, F2: { fissoReale: 0 } } };   // F3: ferma nel mese 1 (nessuna cella)
  const rip = L.ripartisciFisso(s, L.calcolaPesi(s))[0];
  const f1 = rip.fasi.F1;
  vicino(f1.fissoStd, 150, 'std F1'); vicino(f1.perProdotto.P1.std, 90, 'P1 std'); vicino(f1.perProdotto.P2.std, 37.5, 'P2 std'); vicino(f1.linea.std, 22.5, 'linea std');
  vicino(f1.perProdotto.P1.std + f1.perProdotto.P2.std + f1.linea.std, 150, 'somma std');
  assert.equal(f1.fissoReale, 200); vicino(f1.perProdotto.P1.reale, 120, 'P1 reale'); vicino(f1.perProdotto.P2.reale, 50, 'P2 reale'); vicino(f1.linea.reale, 30, 'linea reale');
  assert.equal(rip.fasi.F2.fissoReale, 0); vicino(rip.fasi.F2.perProdotto.P1.reale, 0, 'F2 attiva con fisso zero'); vicino(rip.fasi.F2.linea.reale, 0, 'linea F2');
  assert.equal(rip.fasi.F3.fissoReale, null); assert.equal(rip.fasi.F3.perProdotto.P2.reale, null); assert.equal(rip.fasi.F3.linea.reale, null);
});
