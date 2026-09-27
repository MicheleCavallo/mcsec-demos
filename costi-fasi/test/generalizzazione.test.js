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

test('decisione (b): entrati e lavorati a valle nello stesso mese degli usciti a monte, il costo viaggia (tutto in M1)', () => {
  const sc = structuredClone(esempio);
  sc.registro.P1 = { '1': {
    F1: { entrati: 10, lavorati: 10, scrap: 0, usciti: 10, varReale: 11, fissoReale: 200 },
    F2: { entrati: 10, lavorati: 8, scrap: 0, usciti: 8, varReale: 55, fissoReale: 180 },
    F3: { entrati: 8, lavorati: 8, scrap: 5, usciti: 3, varReale: 80, fissoReale: 100 } } };
  const r = calcola(sc);
  tuttoOk(r);
  const s = f => r.semilavorati.find(x => x.mese === 1 && x.fase === f);
  assert.ok(Math.abs(s('F2').E - 6.1) < 0.005, 'F2 riceve il costo medio disponibile in F1 nel mese stesso');
  assert.ok(Math.abs(s('F2').G - 17.475) < 0.005);
  assert.ok(Math.abs(s('F3').E - 17.475) < 0.005);
  assert.ok(Math.abs(s('F1').K - 48.8) < 0.005, 'F1 scarica 8 pezzi a 6,10 nel mese stesso');
  assert.equal(s('F1').L, 2);
  assert.ok(Math.abs(r.costoProdotto.finitoCosto - 33.306) < 0.005, 'prodotto finito come nell\'esempio a tre mesi');
  assert.ok(Math.abs(r.costoProdotto.grafico2.totale - 626) < 0.005);
});

test('suggerimento entrati = transito disponibile: usciti a monte nel mese + transito a monte a fine mese prima', () => {
  const r = calcola(esempio);
  assert.equal(r.registro.find(x => x.mese === 2 && x.fase === 'F2').suggeritiEntrati, 10);
  const sc = structuredClone(esempio);
  sc.registro.P1 = { '1': sc.registro.P1['1'], '3': sc.registro.P1['2'], '4': sc.registro.P1['3'] };
  const r2 = calcola(sc);
  assert.equal(r2.registro.find(x => x.mese === 3 && x.fase === 'F2').suggeritiEntrati, 10, 'dopo un mese fermo il transito resta disponibile');
  assert.equal(r2.registro.find(x => x.mese === 1 && x.fase === 'F2').suggeritiEntrati, 10, 'nel mese stesso degli usciti a monte');
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

test('codaPrecedente = coda della stessa fase a fine mese prima (i pezzi in coda non si ridichiarano entrati)', () => {
  const r = calcola(esempio);
  const riga = (m, f) => r.registro.find(x => x.mese === m && x.fase === f);
  assert.equal(riga(2, 'F2').L, 2, 'M2 F2: 10 entrati, 8 lavorati, 2 in coda');
  assert.equal(riga(3, 'F2').codaPrecedente, 2, 'M3 F2 eredita i 2 in coda da M2');
  assert.equal(riga(1, 'F2').codaPrecedente, 0, 'mese 1: nessun mese prima');
  assert.equal(riga(2, 'F1').codaPrecedente, 0, 'F1 senza coda');
  assert.equal(riga(3, 'F2').I, riga(3, 'F2').H + riga(3, 'F2').codaPrecedente, 'disponibili = entrati + coda precedente');
});

test('prodotto uscito e maturato: finiti al reale di scarico contro finiti al totale prodotto standard di fine periodo', () => {
  const r = calcola(esempio);
  const cp = r.costoProdotto;
  assert.equal(cp.finitiPezzi, 3);
  assert.ok(Math.abs(cp.finitoReale - 3 * 33.306) < 0.02, 'uscito € = finiti × reale €/pz');
  assert.ok(Math.abs(cp.finitoReale - cp.grafico2.finiti) < 0.005, 'con rimanenza zero di finiti coincide con la fetta «Finiti» del grafico 2');
  assert.equal(cp.finitoStandardPz, r.parametri[cp.filtri.aMese - 1].E7, 'standard €/pz = E7 del mese finale del periodo');
  assert.ok(Math.abs(cp.finitoStandard - 3 * cp.finitoStandardPz) < 0.005);
  assert.ok(Math.abs(cp.finitoDelta - (cp.finitoReale - cp.finitoStandard)) < 0.005);
  const sc = structuredClone(esempio); sc.filtri = { daMese: 1, aMese: 2, fase: 'tutte' };
  const cp2 = CostiFasiCosto(sc, { daMese: 1, aMese: 2, fase: 'tutte' });
  assert.equal(cp2.finitiPezzi, 0); assert.equal(cp2.finitoReale, 0); assert.equal(cp2.finitoStandard, 0); assert.equal(cp2.finitoCosto, null);
});
function CostiFasiCosto(sc, filtri) { const { costoProdotto } = require('../engine.js'); return costoProdotto(calcola(sc), filtri); }

test('quadratura del periodo: reale = maturato + scostamento (Sintesi D = N + O) e reale = budget flessibile + delta spesa (W + X)', () => {
  const r = calcola(esempio);
  const cp = r.costoProdotto, Q = cp.quadratura, tol = 0.005;
  const vicino = (a, b, msg) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
  vicino(Q.totale.reale, cp.grafico2.totale, 'totale reale = spesa del periodo del grafico 2');
  vicino(Q.totale.reale, 1106, 'esempio: 1.106 euro nel trimestre');
  for (const k of ['reale', 'maturato', 'scostamento', 'budget', 'deltaSpesa']) {
    vicino(Q.totale[k], Q.prodotto[k] + Q.nonProduzione[k], `totale = prodotto + non produzione (${k})`);
    vicino(Q.prodotto[k], Q.finito[k] + Q.restoProdotto[k], `prodotto = finito + resto (${k})`);
  }
  const y = r.sintesi.filter(x => x.mese >= cp.filtri.daMese && x.mese <= cp.filtri.aMese);
  const S = k => y.reduce((s, x) => s + x[k], 0);
  vicino(Q.totale.reale, S('B'), 'costo reale Sintesi'); vicino(Q.totale.maturato, S('C'), 'standard maturato Sintesi');
  vicino(Q.totale.scostamento, S('D'), 'scostamento totale Sintesi'); vicino(Q.prodotto.scostamento, S('N'), 'delta sui lavorati Sintesi');
  vicino(Q.nonProduzione.scostamento, S('O'), 'non produzione Sintesi'); vicino(Q.nonProduzione.maturato, 0, 'sui posti vuoti non matura nulla');
  vicino(Q.totale.deltaSpesa, S('Q') + S('R'), 'delta spesa = delta variabile + delta fisso della Sintesi');
  vicino(Q.totale.budget, Q.totale.maturato + Q.nonProduzione.budget, 'budget flessibile = maturato + posti vuoti a standard');
});
