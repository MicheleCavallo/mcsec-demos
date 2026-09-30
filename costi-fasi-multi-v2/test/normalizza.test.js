// test/normalizza.test.js — scenario v2: normalizzazione, analisi del JSON, conversione dalla v1, validazione
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const ESEMPIO_V1 = require('../../costi-fasi-v2/esempio.js');
const { dueProdotti } = require('./scenari.js');

test('normalizzaV2 riempie le parti mancanti e scarta il consuntivo dei prodotti assenti', () => {
  const s = L.normalizzaV2({ versione: 2, fasi: [{ id: 'F1' }], prodotti: [{ id: 'P1', percorso: ['F1'] }], consuntivo: { P9: { '1': { F1: { lavorati: 3 } } } } });
  assert.equal(s.versione, 2); assert.equal(s.mesi, 12); assert.equal(s.fasi[0].nome, 'F1');
  assert.deepEqual(s.linea.F1, { fisso: {} });
  assert.deepEqual(s.prodotti[0].parametri.F1, { capacita: {}, quota: {}, var: {}, scrap: {} });
  assert.deepEqual(s.consuntivo, { linea: {}, P1: {} }, 'P9 non esiste: il suo consuntivo sparisce');
  assert.deepEqual(s.filtri, { daMese: 1, aMese: 12, prodotto: 'tutti', fase: 'tutte' });
});

test('analizzaScenarioV2: JSON rotto, versione sconosciuta, versione 2 ok, versione 1 convertita', () => {
  assert.equal(L.analizzaScenarioV2('{').ok, false);
  assert.match(L.analizzaScenarioV2('{"versione":3}').errore, /versione/i);
  const ok = L.analizzaScenarioV2(JSON.stringify(dueProdotti()));
  assert.equal(ok.ok, true); assert.equal(ok.scenario.prodotti.length, 2); assert.equal(ok.convertito, undefined);
  const conv = L.analizzaScenarioV2(JSON.stringify(ESEMPIO_V1));
  assert.equal(conv.ok, true); assert.equal(conv.convertito, true); assert.equal(conv.scenario.versione, 2);
});

test('convertiV1: un prodotto, capacità piena = quota = capacità v1, fisso e fissoReale a livello linea', () => {
  const v2 = L.convertiV1(ESEMPIO_V1);
  assert.equal(v2.versione, 2); assert.equal(v2.prodotti.length, 1);
  const p = v2.prodotti[0];
  assert.deepEqual(p.percorso, ESEMPIO_V1.prodotti[0].percorso);
  assert.deepEqual(p.parametri.F2.capacita, ESEMPIO_V1.parametri.F2.capacita);
  assert.deepEqual(p.parametri.F2.quota, ESEMPIO_V1.parametri.F2.capacita);
  assert.deepEqual(v2.linea.F2.fisso, ESEMPIO_V1.parametri.F2.fisso);
  const reg = ESEMPIO_V1.registro.P1;
  for (const [m, celle] of Object.entries(reg)) for (const [fid, c] of Object.entries(celle)) {
    if ('fissoReale' in c) assert.equal(v2.consuntivo.linea[m][fid].fissoReale, c.fissoReale, `M${m} ${fid} fissoReale a livello linea`);
    const cp = ((v2.consuntivo.P1[m] || {})[fid]) || {};
    assert.equal('fissoReale' in cp, false, 'il consuntivo del prodotto non ha il fisso');
    for (const k of ['entrati', 'lavorati', 'scrap', 'usciti', 'varReale']) if (k in c) assert.equal(cp[k], c[k]);
  }
});

test('validaLinea: scenario valido → nessun errore', () => { assert.deepEqual(L.validaLinea(dueProdotti()), []); });

test('validaLinea: capacità mancante nel mese 1, quota oltre la capacità, capacità zero, fase fuori catalogo, fisso di linea mancante', () => {
  let s = dueProdotti(); delete s.prodotti[0].parametri.F1.capacita['1'];
  assert.ok(L.validaLinea(s).some(e => /Prodotto 1.*Fase 1.*capacità piena.*mese 1/i.test(e)), JSON.stringify(L.validaLinea(s)));
  s = dueProdotti(); delete s.prodotti[0].parametri.F2.quota['1'];   // F2 è solo di P1: quota vuota = tutta la capacità, nessun errore
  assert.deepEqual(L.validaLinea(s), [], 'quota vuota = capacità piena, non è un errore (regola 28/09)');
  s = dueProdotti(); s.prodotti[0].parametri.F1.quota['1'] = 60;
  assert.ok(L.validaLinea(s).some(e => /quota.*(oltre|maggiore).*capacit/i.test(e)));
  s = dueProdotti(); s.prodotti[0].parametri.F1.capacita['1'] = 0;
  assert.ok(L.validaLinea(s).some(e => /capacit.*maggiore di zero/i.test(e)));
  s = dueProdotti(); s.prodotti[1].percorso = ['F1', 'F9'];
  assert.ok(L.validaLinea(s).some(e => /F9.*catalogo/i.test(e)));
  s = dueProdotti(); delete s.linea.F2.fisso['1'];
  assert.ok(L.validaLinea(s).some(e => /Fase 2.*fisso.*mese 1/i.test(e)));
});

test('validaLinea: pesi oltre il 100 % nel mese 5, con mese e fase nel messaggio', () => {
  const s = dueProdotti(); s.prodotti[0].parametri.F1.quota['5'] = 50;   // P1 50/50 = 100 % + P2 20/80 = 25 %
  const err = L.validaLinea(s);
  assert.ok(err.some(e => /M5.*Fase 1.*125/i.test(e)), JSON.stringify(err));
  assert.ok(!err.some(e => /M4/.test(e)), 'nel mese 4 i pesi tornano');
});

test('revisione 3: normalizzaV2 riporta i filtri dentro l\'orizzonte (1 ≤ daMese ≤ aMese ≤ mesi)', () => {
  const s = L.normalizzaV2({ versione: 2, mesi: 6, fasi: [{ id: 'F1' }], prodotti: [{ id: 'P1', percorso: ['F1'] }], filtri: { daMese: 9, aMese: 12 } });
  assert.deepEqual([s.filtri.daMese, s.filtri.aMese], [6, 6]);
  const s2 = L.normalizzaV2({ versione: 2, mesi: 12, fasi: [{ id: 'F1' }], prodotti: [{ id: 'P1', percorso: ['F1'] }], filtri: { daMese: 5, aMese: 2 } });
  assert.deepEqual([s2.filtri.daMese, s2.filtri.aMese], [5, 5]);
});
