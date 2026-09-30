// test/parametri.test.js — eredità dei parametri per mese, OLC/E/Fcum, errori di scenario
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcola, eredita } = require('../engine.js');
const esempio = require('../esempio.js');

test('eredita: il mese senza valore prende l\'ultimo scritto prima', () => {
  assert.equal(eredita({ '1': 50, '4': 60 }, 1), 50);
  assert.equal(eredita({ '1': 50, '4': 60 }, 3), 50);
  assert.equal(eredita({ '1': 50, '4': 60 }, 4), 60);
  assert.equal(eredita({ '1': 50, '4': 60 }, 12), 60);
  assert.equal(eredita({ '1': 50, '4': null }, 5), 50, 'svuotare torna all\'eredità');
  assert.equal(eredita({}, 1), null);
});

const vicinoP = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''}: ${a} vs ${b}`);
test('parametri risolti (DEF_02): linea bilanciata, OLC in pezzi buoni, E = var + (fisso ÷ capacità)', () => {
  const r = calcola(esempio);
  assert.deepEqual(r.errori, []);
  const m1 = r.parametri[0];
  vicinoP(m1.ingresso, 40 / 0.85, 'ingresso a linea bilanciata = collo di bottiglia F2 riportato in Fase 1');
  vicinoP(m1.fasi.F1.carico, 40 / 0.85); vicinoP(m1.fasi.F2.carico, 40); vicinoP(m1.fasi.F3.carico, 32);
  vicinoP(m1.OLC, 28.8, 'OLC = pezzi buoni in uscita');
  assert.equal(m1.fasi.F1.E, 4);
  assert.equal(m1.fasi.F2.E, 8.75);
  assert.equal(m1.fasi.F3.E, 4);
  assert.equal(m1.fasi.F3.Fcum, 16.75);
  assert.equal(m1.E7, 16.75);
  vicinoP(m1.sbilStdTot, (50 - 40 / 0.85) * 3 + 18 * 2, 'sbilanciamento standard: F1 2,94 posti × 3 + F3 18 posti × 2');
  assert.equal(m1.fissiTot, 400);
  assert.equal(r.parametri.length, 12);
});

test('parametro cambiato in M4 vale da M4 in poi e cambia OLC', () => {
  const sc = structuredClone(esempio);
  sc.parametri.F2.capacita['4'] = 30;
  const r = calcola(sc);
  vicinoP(r.parametri[2].OLC, 28.8);
  vicinoP(r.parametri[3].OLC, (30 / 0.85) * 0.85 * 0.8 * 0.9, 'collo F2 a 30: 30 × 0,8 × 0,9 = 21,6 pezzi buoni');
  vicinoP(r.parametri[11].OLC, 21.6);
  assert.equal(r.parametri[3].fasi.F1.E, 1 + 150 / 50, 'lo standard di F1 dipende solo dalla sua capacità');
  assert.equal(r.parametri[3].fasi.F2.E, 5 + 150 / 30);
});

test('errori di scenario bloccano il calcolo con messaggi in parole', () => {
  const a = structuredClone(esempio); a.prodotti[0].percorso = [];
  assert.match(calcola(a).errori.join(' '), /percorso.*vuoto/i);
  const b = structuredClone(esempio); b.prodotti[0].percorso.push('F9');
  assert.match(calcola(b).errori.join(' '), /F9.*catalogo/i);
  const c = structuredClone(esempio); delete c.parametri.F2.capacita['1'];
  assert.match(calcola(c).errori.join(' '), /Fase 2.*capacit.*mese 1/i);
  const d = structuredClone(esempio); d.parametri.F2.scrap['1'] = 1;
  assert.match(calcola(d).errori.join(' '), /scrap.*Fase 2.*99/i);
});

test('valori non numerici o mesi non validi danno errori in parole, non eccezioni', () => {
  const a = structuredClone(esempio); a.parametri.F1.capacita['1'] = 'abc';
  const ra = calcola(a);
  assert.ok(ra.errori.length, 'capacità «abc» deve essere un errore');
  assert.match(ra.errori.join(' '), /Fase 1.*capacit/i);
  const b = structuredClone(esempio); b.mesi = -3;
  assert.match(calcola(b).errori.join(' '), /mesi/i);
  const c = structuredClone(esempio); c.mesi = 2.5;
  assert.match(calcola(c).errori.join(' '), /mesi/i);
  const d = structuredClone(esempio); d.registro.P1['1'].F1.lavorati = 'dieci';
  assert.match(calcola(d).errori.join(' '), /M1.*Fase 1.*lavorati/i);
});
