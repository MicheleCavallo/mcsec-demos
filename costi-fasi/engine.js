// engine.js — motore «controllo dei costi per fase a costo standard».
// Funzione pura: calcola(scenario) -> risultato. Nessun DOM, nessuno stato.
// Le colonne calcolate usano le LETTERE dell'Excel DEF_01 (Registro C..AU, Semilavorati C..V, Sintesi B..S)
// così guida, Excel, app e golden test parlano la stessa lingua. Formule lette dalla DEF_01 il 27/09/2026.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CostiFasi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MESI_DEFAULT = 12;

  // N() dell'Excel: vuoto/testo -> 0
  function n(x) { return (x === null || x === undefined || x === '' || Number.isNaN(Number(x))) ? 0 : Number(x); }
  function vuoto(x) { return x === null || x === undefined || x === ''; }
  function r2(x) { return Math.round(x * 100) / 100; }

  // mappa mese->valore con eredità dal mese precedente; null/undefined = «non scritto»
  function eredita(mappa, mese) {
    if (!mappa) return null;
    let v = null;
    for (let k = 1; k <= mese; k++) {
      const x = mappa[String(k)];
      if (x !== null && x !== undefined && x !== '') v = Number(x);
    }
    return v;
  }

  function nomeFase(sc, fid) {
    const f = (sc.fasi || []).find(x => x.id === fid);
    return f ? f.nome : fid;
  }

  function validaScenario(sc) {
    const err = [];
    if (!sc || typeof sc !== 'object') return ['Scenario mancante.'];
    if (!Array.isArray(sc.fasi) || sc.fasi.length === 0) err.push('Il catalogo delle fasi è vuoto.');
    const prod = (sc.prodotti || [])[0];
    if (!prod) { err.push('Nessun prodotto definito.'); return err; }
    const percorso = prod.percorso || [];
    if (percorso.length === 0) err.push(`Il percorso del prodotto «${prod.nome || prod.id}» è vuoto: aggiungi almeno una fase.`);
    const ids = new Set((sc.fasi || []).map(f => f.id));
    for (const fid of percorso) {
      if (!ids.has(fid)) { err.push(`La fase «${fid}» del percorso non è nel catalogo.`); continue; }
      const p = (sc.parametri || {})[fid] || {};
      for (const [voce, nome] of [['capacita', 'capacità'], ['var', 'variabile per pezzo'], ['fisso', 'fisso di fase'], ['scrap', 'scrap %']]) {
        if (eredita(p[voce], 1) === null) err.push(`${nomeFase(sc, fid)}: manca ${nome} nel mese 1.`);
      }
      for (let m = 1; m <= (sc.mesi || MESI_DEFAULT); m++) {
        const g = eredita(p.scrap, m);
        if (g !== null && (g < 0 || g >= 0.99 + 1e-12)) { err.push(`Scrap % di ${nomeFase(sc, fid)} nel mese ${m} deve stare tra 0 e 99 %.`); break; }
        const cap = eredita(p.capacita, m);
        if (cap !== null && cap <= 0) { err.push(`Capacità di ${nomeFase(sc, fid)} nel mese ${m} deve essere maggiore di zero.`); break; }
      }
    }
    return err;
  }

  // Parametri risolti per mese: capacità, var, fisso, scrap ereditati; OLC = min capacità; E = var + (fisso ÷ OLC); Fcum lungo il percorso
  function risolviParametri(sc, percorso) {
    const mesi = sc.mesi || MESI_DEFAULT;
    const out = [];
    for (let m = 1; m <= mesi; m++) {
      const fasi = {};
      for (const fid of percorso) {
        const p = sc.parametri[fid];
        fasi[fid] = { capacita: eredita(p.capacita, m), var: eredita(p.var, m), fisso: eredita(p.fisso, m), scrap: eredita(p.scrap, m) };
      }
      const OLC = Math.min(...percorso.map(f => fasi[f].capacita));
      let cum = 0, fissiTot = 0;
      for (const fid of percorso) {
        const f = fasi[fid];
        f.E = OLC > 0 ? f.var + f.fisso / OLC : null;          // Parametri!E = ((C×OLC)+D) ÷ OLC
        cum += n(f.E); f.Fcum = cum;                             // Parametri!F = SUM(E fino alla fase)
        fissiTot += f.fisso;
      }
      out.push({ mese: m, OLC, E7: cum, fissiTot, fasi });
    }
    return out;
  }

  function calcola(sc) {
    const errori = validaScenario(sc);
    if (errori.length) return { errori };
    const prodotto = sc.prodotti[0];
    const percorso = prodotto.percorso.slice();
    const fasi = percorso.map(fid => ({ id: fid, nome: nomeFase(sc, fid) }));
    const parametri = risolviParametri(sc, percorso);
    const ris = { errori: [], mesi: sc.mesi || MESI_DEFAULT, prodotto: prodotto.id, percorso, fasi, parametri };
    // Task 3-7 aggiungono: registro, semilavorati, sintesi, costoProdotto, grafico2, controlli
    return ris;
  }

  return { calcola, eredita, n, r2, validaScenario, risolviParametri };
});
