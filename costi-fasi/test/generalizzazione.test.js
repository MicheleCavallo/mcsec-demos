// test/generalizzazione.test.js — 1, 2 e 4 fasi, parametri cambiati nel tempo: coerenza interna (nessun Excel di riferimento)
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcola } = require('../engine.js');
const esempio = require('../esempio.js');

function tuttoOk(r) {
  assert.deepEqual(r.errori, []);
  assert.deepEqual(r.ko, [], JSON.stringify(r.ko.slice(0, 5)));
  const g2 = r.costoProdotto.grafico2;
  assert.ok(Math.abs(g2.fasiFerme + g2.postiVuoti + g2.scartoAnomalo + g2.semilavorati + g2.finiti - g2.totale) < 0.005, 'grafico 2 = Σ U');
}

test('1 fase: prima e ultima coincidono, prodotto finito subito', () => {
  const sc = structuredClone(esempio);
  sc.prodotti[0].percorso = ['F1'];
  sc.registro.P1 = { '1': { F1: { entrati: 10, lavorati: 10, scrap: 1, usciti: 9, varReale: 11, fissoReale: 200 } } };
  const r = calcola(sc);
  tuttoOk(r);
  assert.equal(r.registro[0].O, 9);
  assert.equal(r.parametri[0].OLC, 50, 'OLC segue il percorso: solo F1, capacità 50');
  assert.equal(r.parametri[0].E7, 1 + 150 / 50);
  assert.ok(r.costoProdotto.finitoCosto > 0);
});

test('2 fasi (F1 → F3): stesso esempio senza la fase 2', () => {
  const sc = structuredClone(esempio);
  sc.prodotti[0].percorso = ['F1', 'F3'];
  sc.registro.P1 = { '1': { F1: { entrati: 10, lavorati: 10, scrap: 0, usciti: 10, varReale: 11, fissoReale: 200 } },
                     '2': { F1: { fissoReale: 150 }, F3: { entrati: 10, lavorati: 10, scrap: 2, usciti: 8, varReale: 30, fissoReale: 100 } } };
  tuttoOk(calcola(sc));
});

test('4 fasi con parametri cambiati in M3: quadrature OK', () => {
  const sc = structuredClone(esempio);
  sc.fasi.push({ id: 'F4', nome: 'Fase 4' });
  sc.parametri.F4 = { capacita: { '1': 45 }, var: { '1': 3 }, fisso: { '1': 120 }, scrap: { '1': 0.05 } };
  sc.parametri.F2.fisso['3'] = 180;
  sc.prodotti[0].percorso = ['F1', 'F2', 'F3', 'F4'];
  sc.registro.P1['4'] = { F1: { fissoReale: 150 }, F2: { fissoReale: 180 }, F3: { fissoReale: 100 },
                          F4: { entrati: 3, lavorati: 3, scrap: 0, usciti: 3, varReale: 10, fissoReale: 125 } };
  const r = calcola(sc);
  tuttoOk(r);
  assert.equal(r.parametri[2].fasi.F2.fisso, 180);
  assert.equal(r.parametri[1].fasi.F2.fisso, 150);
  assert.equal(r.registro.find(x => x.mese === 4 && x.fase === 'F4').O, 3);
});
