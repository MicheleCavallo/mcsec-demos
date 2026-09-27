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

  // ---- Registro: per mese m e fase f del percorso, formule della DEF_01 (mappa V6).
  // prev = stessa fase nel mese prima; up = fase a monte nello stesso mese.
  function calcolaRegistro(sc, percorso, parametri, prodottoId) {
    const mesi = sc.mesi || MESI_DEFAULT;
    const reg = (sc.registro || {})[prodottoId] || {};
    const righe = [];
    const trova = (m, i) => righe.find(r => r.mese === m && r.idx === i) || null;
    const num = x => vuoto(x) ? null : Number(x);
    for (let m = 1; m <= mesi; m++) {
      const par = parametri[m - 1];
      for (let i = 0; i < percorso.length; i++) {
        const fid = percorso[i], p = par.fasi[fid];
        const inp = ((reg[String(m)] || {})[fid]) || {};
        const prev = trova(m - 1, i), upPrev = i > 0 ? trova(m - 1, i - 1) : null;   // ciclo di 1 mese: entra ciò che è uscito a monte il mese prima
        const first = i === 0, last = i === percorso.length - 1;
        const r = { mese: m, fase: fid, idx: i, input: {
          entrati: first ? num(inp.entrati) : null, lavorati: num(inp.lavorati), scrap: num(inp.scrap),
          usciti: num(inp.usciti), varReale: num(inp.varReale), fissoReale: num(inp.fissoReale) } };
        const J = n(r.input.lavorati), K = n(r.input.scrap), M = n(r.input.usciti), Q = n(r.input.varReale), S = r.input.fissoReale;
        r.C = p.capacita; r.D = par.OLC; r.E = p.E;
        r.F = p.fisso + p.var * J;                                    // budget flessibile
        r.G = prev ? n(prev.N) : 0;                                   // WIP iniziale
        r.H = first ? n(r.input.entrati) : (upPrev ? n(upPrev.M) : 0);   // entrati: input sulla prima fase; altrove = usciti a monte nel mese prima (Excel H6 = M2)
        r.I = r.H + (prev ? n(prev.L) : 0);                           // disponibili
        r.J = J; r.K = K;
        r.L = r.I - J;                                                // coda
        r.M = M;
        r.N = r.G + r.H - M - K;                                      // WIP fine
        r.O = last ? M : 0;                                           // OUT solo ultima fase
        r.P = (prev ? n(prev.P) : 0) + J - K - M;                     // pronti non trasferiti (cumulato)
        r.Q = Q; r.R = p.var * J; r.S = S; r.T = p.fisso;
        r.U = Q + n(S); r.V = r.R + r.T;
        r.attiva = (r.U + J) > 0;
        r.W = r.attiva ? Q - r.R : 0; r.X = r.attiva ? n(S) - r.T : 0; r.Y = r.W + r.X;
        r.Z = (r.D === 0 || J === 0) ? null : Q / J + n(S) / r.D;     // costo reale per pezzo lavorato
        r.AA = r.D === 0 ? null : p.fisso / r.D;                      // quota fissa std per posto
        r.AB = (r.D === 0 || !r.attiva) ? null : (J === 0 ? 0 : Q + n(S) / r.D * J);
        r.AC = J * n(p.E);                                            // standard maturato
        r.AD = !r.attiva ? 0 : (r.D === 0 ? 0 : (r.D - J) * n(S) / r.D + (J === 0 ? Q : 0));
        r.AE = !r.attiva ? 0 : (r.D === 0 ? 0 : (r.D - J) * n(r.AA));
        r.AF = !r.attiva ? 0 : (r.D === 0 ? r.U - r.AC : n(r.AB) - r.AC);
        r.AG = n(r.AD) - n(r.AE); r.AH = n(r.AF) + n(r.AG);
        r.AI = !r.attiva ? null : (r2(r.AC + n(r.AF) + n(r.AD) - n(r.U)) === 0 ? 'OK' : 'KO');
        r.AJ = !r.attiva ? null : (r2(n(r.Y) - n(r.AH)) === 0 ? 'OK' : 'KO');
        r.AK = K > J ? 'KO' : 'OK';
        r.AL = J === 0 ? 0 : K / J;
        r.AM = J > r.H + (prev ? n(prev.L) : 0) ? 'oltre ciclo' : '';
        // cumulati della stessa fase fino a m (le righe precedenti sono già in `righe`, questa no)
        const cumPrima = (col, ii) => righe.filter(x => x.idx === ii && x.mese < m).reduce((s, x) => s + n(x[col]), 0);
        r.AN = cumPrima('M', i) + M > cumPrima('J', i) + J - cumPrima('K', i) - K ? 'usciti > lavorati netti' : '';
        // AO = Σ usciti fase ≤ m − Σ entrati fase a valle ≤ m (Excel AO6); la fase a valle nel mese m non è ancora calcolata,
        // ma i suoi entrati sono per costruzione i nostri usciti del mese prima (H a valle = M a monte in m−1)
        r.AO = last ? 0 : (cumPrima('M', i) + M) - (cumPrima('H', i + 1) + (prev ? n(prev.M) : 0));
        r.AP = r.D === 0 ? null : J / r.D;
        r.AQ = r.D === 0 ? null : r.V * J / r.D;
        r.AR = null; r.AS = J === 0 ? null : p.Fcum; r.AT = null; r.AU = null;   // AR/AT/AU dal Task 4 (Semilavorati)
        righe.push(r);
      }
    }
    return righe;
  }

  function calcola(sc) {
    const errori = validaScenario(sc);
    if (errori.length) return { errori };
    const prodotto = sc.prodotti[0];
    const percorso = prodotto.percorso.slice();
    const fasi = percorso.map(fid => ({ id: fid, nome: nomeFase(sc, fid) }));
    const parametri = risolviParametri(sc, percorso);
    const ris = { errori: [], mesi: sc.mesi || MESI_DEFAULT, prodotto: prodotto.id, percorso, fasi, parametri };
    ris.registro = calcolaRegistro(sc, percorso, parametri, prodotto.id);
    // Task 4-7 aggiungono: semilavorati, sintesi, costoProdotto, grafico2, controlli
    return ris;
  }

  return { calcola, eredita, n, r2, validaScenario, risolviParametri };
});
