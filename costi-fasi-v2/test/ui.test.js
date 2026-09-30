// test/ui.test.js — funzioni pure della pagina (ui.js): parser numerico it-IT, normalizzazione e analisi dello scenario incollato
const test = require('node:test');
const assert = require('node:assert/strict');
const { leggiNumero, normalizzaScenario, analizzaScenario, fmt } = require('../ui.js');
const esempio = require('../esempio.js');

test('leggiNumero: virgola decimale, punto decimale singolo, punto delle migliaia', () => {
  assert.equal(leggiNumero('1,5'), 1.5);
  assert.equal(leggiNumero('1.5'), 1.5, 'un solo punto senza virgola è decimale (tastierino numerico)');
  assert.equal(leggiNumero('0.15'), 0.15);
  assert.equal(leggiNumero('1.234,5'), 1234.5);
  assert.equal(leggiNumero('1.234'), 1234, 'gruppo di tre cifre dopo il punto = migliaia');
  assert.equal(leggiNumero('12.345.678'), 12345678);
  assert.equal(leggiNumero(' 150 '), 150);
  assert.equal(leggiNumero(''), null);
  assert.ok(Number.isNaN(leggiNumero('abc')));
  assert.ok(Number.isNaN(leggiNumero('1.2.3,4')));
});

test('fmt: migliaia con il punto anche sotto 10.000, decimali con la virgola', () => {
  assert.equal(fmt(1106), '1.106,00');
  assert.equal(fmt(6.1), '6,10');
  assert.equal(fmt(0.625 * 100, 1), '62,5');
  assert.equal(fmt(null), '–');
});

test('normalizzaScenario: riempie le parti mancanti senza toccare quelle presenti', () => {
  const sc = normalizzaScenario({ versione: 1, fasi: [{ id: 'F1', nome: 'Fase 1' }], prodotti: [{ id: 'P1', nome: 'P', percorso: ['F1'] }] });
  assert.equal(sc.mesi, 12);
  assert.deepEqual(sc.parametri.F1, { capacita: {}, var: {}, fisso: {}, scrap: {} });
  assert.deepEqual(sc.registro, { P1: {} });
  assert.deepEqual(sc.filtri, { daMese: 1, aMese: 12, fase: 'tutte' });
  const pieno = normalizzaScenario(structuredClone(esempio));
  assert.deepEqual(pieno, esempio, 'uno scenario completo resta identico');
  const senzaProdotto = normalizzaScenario({ versione: 1, fasi: [] });
  assert.equal(senzaProdotto.prodotti.length, 1);
  assert.deepEqual(senzaProdotto.prodotti[0].percorso, []);
  const mesiRotti = normalizzaScenario({ versione: 1, mesi: -3, fasi: [], prodotti: [] });
  assert.equal(mesiRotti.mesi, 12, 'mesi non validi tornano a 12');
});

test('analizzaScenario: JSON non valido o versione diversa rifiutati con messaggio; incompleto accettato e normalizzato', () => {
  assert.match(analizzaScenario('{non json').errore, /JSON valido/);
  assert.match(analizzaScenario('{"versione":2}').errore, /versione/i);
  assert.match(analizzaScenario('[1,2]').errore, /versione/i);
  const r = analizzaScenario('{"versione":1,"fasi":[{"id":"F1","nome":"Taglio"}],"prodotti":[{"id":"P1","percorso":["F1"]}]}');
  assert.equal(r.ok, true);
  assert.equal(r.scenario.fasi[0].nome, 'Taglio');
  assert.deepEqual(r.scenario.parametri.F1, { capacita: {}, var: {}, fisso: {}, scrap: {} });
  const ok = analizzaScenario(JSON.stringify(esempio));
  assert.equal(ok.ok, true); assert.deepEqual(ok.scenario, esempio);
});
