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
  // Eccezione documentata (decisione b, 27/09): E = costo medio DISPONIBILE a monte nel mese; l'Excel usa la rimanenza a fine mese prima.
  // Le due coincidono quando la riga carica pezzi (F > 0); quando la fase è ferma E è solo informativo e l'Excel mostra 0. Si salta solo in quel caso.
  const salta = (a, k) => k === 'E' && !(a.F > 0);
  const errs = confrontaRighe(golden.semilavorati, ris.semilavorati, perMeseFase, salta);
  assert.deepEqual(errs, [], `${errs.length} scostamenti su ${conta(golden.semilavorati)} celle:\n${errs.slice(0, 40).join('\n')}`);
});

test('Sintesi: ogni cella B..S dei 12 mesi coincide con l\'Excel', () => {
  const errs = confrontaRighe(golden.sintesi, ris.sintesi, r => `M${r.mese}`);
  assert.deepEqual(errs, [], `${errs.length} scostamenti su ${conta(golden.sintesi)} celle:\n${errs.slice(0, 40).join('\n')}`);
});

test('Costo prodotto M1→M4 Tutte: riquadro, dettaglio per fase e serie come l\'Excel', () => {
  const g = golden.costoProdotto;
  const cp = ris.costoProdotto;
  assert.ok(cp, 'costoProdotto assente');
  for (const k of ['lavorati', 'buoni', 'scrap', 'finitiPezzi', 'finitoCosto', 'realeVar', 'realeFisso', 'realePieno', 'realeSulProdotto',
    'realeNonProd', 'realeSommaMedie', 'attesoVar', 'attesoFisso', 'attesoPieno', 'attesoSulProdotto', 'attesoNonProd', 'attesoSommaMedie', 'scrapAnomaloPerPezzoBuono']) {
    assert.ok(uguale(g[k], cp[k]), `${k}: atteso ${g[k]} trovato ${cp[k]}`);
  }
  const errs = confrontaRighe(g.perFase, cp.perFase, r => r.fase);
  assert.deepEqual(errs, []);
  for (const s of g.serie) {
    const t = cp.serie.find(x => x.mese === s.mese);
    for (const k of ['reale', 'atteso', 'lavorati', 'realePieno', 'buoni']) assert.ok(uguale(s[k], t[k]), `serie M${s.mese} ${k}: atteso ${s[k]} trovato ${t[k]}`);
  }
});

test('Grafico 2: dove sono finiti i 1.106 € (sketchnote)', () => {
  const g2 = ris.costoProdotto.grafico2, att = golden.grafico2;
  for (const k of Object.keys(att)) assert.ok(uguale(att[k], g2[k]), `${k}: atteso ${att[k]} trovato ${g2[k]}`);
  assert.ok(Math.abs(g2.fasiFerme + g2.postiVuoti + g2.scartoAnomalo + g2.semilavorati + g2.finiti - g2.totale) < 0.005);
});
