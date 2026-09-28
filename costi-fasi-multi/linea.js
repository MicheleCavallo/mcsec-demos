// linea.js — v2 multiprodotto: strati per prodotto sul motore v1, fisso di fase diviso per pesi, strato «Linea» per il residuo.
// Modulo puro (nessun DOM): in pagina si carica dopo ../costi-fasi/engine.js, in Node richiede il motore da solo.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../costi-fasi/engine.js'));
  else root.CostiFasiLinea = factory(root.CostiFasi);
})(typeof self !== 'undefined' ? self : this, function (CostiFasi) {
  'use strict';
  const { calcola, costoProdotto, eredita, n } = CostiFasi;
  const MESI_DEFAULT = 12;
  void calcola; void costoProdotto; void eredita; void n; void MESI_DEFAULT;
  return {};
});
