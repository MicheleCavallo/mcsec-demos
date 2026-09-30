// test/esempio.test.js — l'esempio a due prodotti è valido, senza KO, e quadra
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../linea.js');
const E = require('../esempio-linea.js');

test('esempio-linea: valido, due strati, nessun KO, Σ pesi ≤ 1 ovunque, P1 finisce 3 pezzi come nella v1', () => {
  const res = L.calcolaLinea(E);
  assert.deepEqual(res.errori, []); assert.deepEqual(res.ko, [], JSON.stringify(res.ko.slice(0, 3)));
  assert.deepEqual(Object.keys(res.strati), ['P1', 'P2']);
  for (const w of res.pesi) for (const x of Object.values(w.fasi)) assert.ok(x.somma <= 1 + 1e-9);
  const t = L.totaleLinea(res, { daMese: 1, aMese: 3 });
  assert.equal(t.finiti[0].pezzi, 3, 'P1: 3 finiti come nell\'esempio dei 10 pezzi');
  assert.ok(t.finiti[1].pezzi > 0, 'P2 finisce qualcosa');
  const g = t.grafico2; assert.ok(Math.abs(g.fasiFerme + g.postiVuoti + g.sbilanciamento + g.scartoAnomalo + g.semilavorati + g.finiti + g.linea - g.totale) < 0.005);
  assert.ok(t.linea.reale > 0, 'nell\'esempio c\'è capacità non assegnata');
});
