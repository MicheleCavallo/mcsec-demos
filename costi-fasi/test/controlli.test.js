// test/controlli.test.js — scenari sbagliati apposta accendono il controllo giusto con la spiegazione giusta
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcola } = require('../engine.js');
const esempio = require('../esempio.js');

test('esempio 10 pezzi: nessun KO', () => {
  const r = calcola(esempio);
  assert.deepEqual(r.ko, []);
  assert.ok(r.controlli.length > 100);
});

test('scrap > lavorati accende AK con la spiegazione', () => {
  const sc = structuredClone(esempio); sc.registro.P1['3'].F3.scrap = 9;
  const ko = calcola(sc).ko;
  assert.ok(ko.some(c => c.codice === 'AK' && c.mese === 3 && c.fase === 'F3' && /scrap.*lavorati/i.test(c.messaggio)), JSON.stringify(ko));
});

test('usciti oltre i lavorati netti accende AN', () => {
  const sc = structuredClone(esempio); sc.registro.P1['1'].F1.usciti = 12;
  const ko = calcola(sc).ko;
  assert.ok(ko.some(c => c.codice === 'AN' && c.mese === 1 && c.fase === 'F1'), JSON.stringify(ko));
});

test('lavorare più del disponibile accende AM «oltre ciclo»', () => {
  const sc = structuredClone(esempio); sc.registro.P1['2'].F2.lavorati = 11;
  const ko = calcola(sc).ko;
  assert.ok(ko.some(c => c.codice === 'AM' && c.mese === 2 && c.fase === 'F2' && /oltre ciclo/i.test(c.messaggio)), JSON.stringify(ko));
});

test('prelievo da magazzino vuoto accende O dei Semilavorati (a monte non c\'è nulla, nemmeno nel mese stesso)', () => {
  const sc = structuredClone(esempio);
  sc.registro.P1['1'] = { F1: { fissoReale: 150 }, F2: { entrati: 3, lavorati: 3, scrap: 0, usciti: 0, varReale: 15, fissoReale: 150 } };   // F1 ferma, F2 dichiara e lavora 3 pezzi mai esistiti
  const r = calcola(sc);
  assert.ok(r.ko.some(c => c.codice === 'O' && c.mese === 1 && c.fase === 'F2' && /senza nulla in ingresso/.test(c.messaggio)), JSON.stringify(r.ko));
  assert.equal(r.registro.find(x => x.mese === 1 && x.fase === 'F1').AO, -3, 'transito negativo: dichiarati entrati mai usciti');
});

test('lavorare senza dichiarare entrati accende AM «oltre ciclo», non O (a monte lo stock c\'è)', () => {
  const sc = structuredClone(esempio);
  sc.registro.P1['1'].F2 = { lavorati: 3, scrap: 0, usciti: 0, varReale: 15, fissoReale: 150 };
  const r = calcola(sc);
  assert.ok(r.ko.some(c => c.codice === 'AM' && c.mese === 1 && c.fase === 'F2'), JSON.stringify(r.ko));
  assert.ok(!r.ko.some(c => c.codice === 'O' && c.mese === 1 && c.fase === 'F2'));
});

test('variabile reale senza lavorati accende VAR0 (imputazione sospetta), non un fisso senza lavorati', () => {
  const sc = structuredClone(esempio); sc.registro.P1['4'] = { F1: { varReale: 111, fissoReale: 150 }, F2: { fissoReale: 180 } };
  const r = calcola(sc);
  assert.ok(r.ko.some(c => c.codice === 'VAR0' && c.mese === 4 && c.fase === 'F1' && /variabile.*senza.*lavorat/i.test(c.messaggio)), JSON.stringify(r.ko));
  assert.ok(!r.ko.some(c => c.codice === 'VAR0' && c.fase === 'F2'), 'fase ferma con solo fisso: nessun VAR0');
  assert.ok(!calcola(esempio).ko.length, 'esempio pulito');
});
