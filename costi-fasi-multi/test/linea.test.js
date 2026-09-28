// test/linea.test.js — strato Linea (residuo), controlli di linea, totale = Σ strati + Linea
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const { dueProdotti } = require('./scenari.js');
const vicino = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg}: ${a} vs ${b}`);

function scenarioMese1() {
  const s = dueProdotti();
  s.consuntivo.linea = { '1': { F1: { fissoReale: 200 }, F2: { fissoReale: 150 }, F3: { fissoReale: 100 } } };
  s.consuntivo.P1 = { '1': { F1: { entrati: 10, lavorati: 10, scrap: 0, usciti: 10, varReale: 11 }, F2: { entrati: 10, lavorati: 8, scrap: 0, usciti: 8, varReale: 40 } } };
  s.consuntivo.P2 = { '1': { F1: { entrati: 5, lavorati: 5, scrap: 1, usciti: 4, varReale: 9 }, F3: { entrati: 4, lavorati: 4, scrap: 0, usciti: 4, varReale: 8 } } };
  return s;
}

test('strato Linea: residuo per fase e mese, standard e reale; fase ferma → 0', () => {
  const res = L.calcolaLinea(scenarioMese1());
  const m1 = res.linea.perMese[0];
  vicino(m1.fasi.F1.std, 22.5, 'F1 std 150 × 0,15'); vicino(m1.fasi.F1.reale, 30, 'F1 reale 200 × 0,15');
  vicino(m1.fasi.F2.std, 56.25, 'F2 std 150 × 0,375'); vicino(m1.fasi.F3.reale, 75, 'F3 reale 100 × 0,75');
  vicino(m1.reale, 30 + 56.25 + 75, 'totale reale mese 1');
  const m2 = res.linea.perMese[1]; vicino(m2.reale, 0, 'mese 2: linea ferma, niente reale'); vicino(m2.std, 22.5 + 56.25 + 75, 'lo standard del residuo resta');
});

test('fase senza prodotti ma con fisso reale: tutto allo strato Linea', () => {
  const s = scenarioMese1(); s.fasi.push({ id: 'F4', nome: 'Fase 4' }); s.linea.F4 = { fisso: { '1': 80 } }; s.consuntivo.linea['1'].F4 = { fissoReale: 90 };
  const res = L.calcolaLinea(s);
  assert.deepEqual(res.errori, []);
  vicino(res.linea.perMese[0].fasi.F4.std, 80, 'std'); vicino(res.linea.perMese[0].fasi.F4.reale, 90, 'reale');
});

test('fase ferma per la linea ma il prodotto ha lavorato → KO LFERMA con prodotto, mese e fase', () => {
  const s = scenarioMese1(); delete s.consuntivo.linea['1'].F2;   // F2 ferma, ma P1 lavora 8 pezzi
  const res = L.calcolaLinea(s);
  const ko = res.ko.find(c => c.codice === 'LFERMA');
  assert.ok(ko, JSON.stringify(res.ko)); assert.equal(ko.mese, 1); assert.equal(ko.fase, 'F2'); assert.match(ko.messaggio, /Prodotto 1.*Fase 2.*ferma/i);
});

test('totaleLinea: totale = Σ strati + Linea su reale, budget e delta; grafico 2 con la sesta parte; finiti per prodotto', () => {
  const res = L.calcolaLinea(scenarioMese1());
  const t = L.totaleLinea(res, { daMese: 1, aMese: 1 });
  const q1 = t.strati.P1.quadratura, q2 = t.strati.P2.quadratura;
  for (const k of ['reale', 'budget', 'delta']) {
    const kk = k === 'delta' ? 'deltaSpesa' : k;
    vicino(t.quadratura.totale[k], q1.totale[kk] + q2.totale[kk] + t.linea[k], `totale ${k}`);
    vicino(t.quadratura.prodotto[k], q1.prodotto[kk] + q2.prodotto[kk], `prodotto ${k}`);
    vicino(t.quadratura.nonProduzione[k], q1.nonProduzione[kk] + q2.nonProduzione[kk] + t.linea[k], `non produzione ${k}`);
  }
  vicino(t.linea.reale, 30 + 56.25 + 75, 'linea reale'); vicino(t.linea.delta, t.linea.reale - t.linea.budget, 'linea delta');
  const g = t.grafico2; vicino(g.fasiFerme + g.postiVuoti + g.scartoAnomalo + g.semilavorati + g.finiti + g.linea, g.totale, 'sei parti = totale');
  vicino(g.totale, t.quadratura.totale.reale, 'spesa del periodo = totale reale');
  assert.equal(t.finiti.length, 2); assert.equal(t.finiti[1].pid, 'P2'); assert.equal(t.finiti[1].pezzi, 4);
  assert.equal(t.lavoratiPerMese[0].prodotti.P1.lavorati, 18); assert.equal(t.lavoratiPerMese[0].prodotti.P2.buoni, 8);
  assert.equal(t.righe.length, 2); assert.equal(t.righe[0].nome, 'Prodotto 1');
});

// ---- correzioni dopo la revisione finale (28/09)
test('revisione 1: con il solo errore Σ pesi > 100 % calcolaLinea restituisce comunque i pesi (la pagina deve mostrare il rosso)', () => {
  const s = dueProdotti(); s.prodotti[0].parametri.F1.quota['5'] = 50;
  const res = L.calcolaLinea(s);
  assert.ok(res.errori.length > 0); assert.deepEqual(res.strati, {});
  assert.equal(res.pesi.length, 12, 'pesi calcolati anche se lo scenario non passa');
  assert.ok(res.pesi[4].fasi.F1.somma > 1, 'M5 F1 oltre il 100 %');
  const s2 = dueProdotti(); delete s2.prodotti[0].parametri.F1.capacita['1'];
  assert.deepEqual(L.calcolaLinea(s2).pesi, [], 'con errori strutturali (capacità mancante) niente pesi');
});

test('revisione 2: il budget dello strato Linea conta il residuo standard solo nei mesi in cui la fase è attiva per la linea (come il budget v1, solo righe attive)', () => {
  const res = L.calcolaLinea(scenarioMese1());
  const m1 = res.linea.perMese[0], m2 = res.linea.perMese[1];
  vicino(m1.budget, 22.5 + 56.25 + 75, 'M1 tutte attive: budget = std del residuo');
  vicino(m2.budget, 0, 'M2 linea ferma: nessun budget'); vicino(m2.std, 22.5 + 56.25 + 75, 'lo std resta informativo');
  const t12 = L.totaleLinea(res, { daMese: 1, aMese: 12 });
  vicino(t12.linea.budget, m1.budget, 'sul periodo il budget Linea è solo dei mesi attivi');
  vicino(t12.linea.delta, t12.linea.reale - t12.linea.budget, 'delta coerente');
});

test('revisione 3: filtri fuori orizzonte non fanno crash e vengono riportati dentro; daMese > aMese → un mese solo', () => {
  const res = L.calcolaLinea(scenarioMese1());
  const t = L.totaleLinea(res, { daMese: 1, aMese: 13 });
  assert.equal(t.filtri.aMese, 12); assert.equal(t.lavoratiPerMese.length, 12);
  const t2 = L.totaleLinea(res, { daMese: 3, aMese: 1 });
  assert.equal(t2.filtri.daMese, 3); assert.equal(t2.filtri.aMese, 3); assert.equal(t2.lavoratiPerMese.length, 1);
  const t3 = L.totaleLinea(res, { daMese: 0, aMese: 2 });
  assert.equal(t3.filtri.daMese, 1);
});
