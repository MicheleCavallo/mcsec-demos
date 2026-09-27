// ui.js — funzioni pure della pagina, testabili in Node: parser numerico it-IT, formato, normalizzazione e analisi dello scenario incollato.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CostiFasiUI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Testo digitato -> numero. '' -> null; non interpretabile -> NaN.
  // Regole: la virgola è il decimale; i punti sono migliaia solo se seguiti da gruppi di tre cifre (o se c'è anche la virgola);
  // un solo punto in altra posizione è il decimale del tastierino numerico («1.5» = 1,5).
  function leggiNumero(testo) {
    let t = String(testo === null || testo === undefined ? '' : testo).trim();
    if (t === '') return null;
    if (t.includes(',')) {
      if (!/^-?(\d+|\d{1,3}(\.\d{3})+),\d+$/.test(t)) return NaN;   // con la virgola, i punti devono essere gruppi di migliaia
      t = t.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    else if ((t.match(/\./g) || []).length > 1) return NaN;
    if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }

  // Numero -> testo it-IT (punto migliaia, virgola decimali); vuoto -> «–».
  function fmt(x, dec) {
    if (dec === undefined) dec = 2;
    if (x === null || x === undefined || x === '' || Number.isNaN(Number(x))) return '–';
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, '§').replace('.', ',').replace(/§/g, '.');
  }

  // Riempie le parti mancanti di uno scenario (versione 1) senza toccare quelle presenti.
  function normalizzaScenario(sc) {
    const s = Object.assign({}, sc || {});
    s.versione = 1;
    if (!Number.isInteger(s.mesi) || s.mesi < 1 || s.mesi > 60) s.mesi = 12;
    s.nome = typeof s.nome === 'string' ? s.nome : 'Scenario';
    s.fasi = Array.isArray(s.fasi) ? s.fasi.filter(f => f && typeof f.id === 'string').map(f => ({ id: f.id, nome: typeof f.nome === 'string' ? f.nome : f.id })) : [];
    s.parametri = (s.parametri && typeof s.parametri === 'object') ? Object.assign({}, s.parametri) : {};
    for (const f of s.fasi) {
      const p = Object.assign({}, s.parametri[f.id] || {});
      for (const v of ['capacita', 'var', 'fisso', 'scrap']) if (!p[v] || typeof p[v] !== 'object') p[v] = {};
      s.parametri[f.id] = p;
    }
    if (!Array.isArray(s.prodotti) || !s.prodotti.length) s.prodotti = [{ id: 'P1', nome: 'Prodotto 1', percorso: [] }];
    s.prodotti = s.prodotti.map(p => ({ id: typeof p.id === 'string' ? p.id : 'P1', nome: typeof p.nome === 'string' ? p.nome : 'Prodotto 1', percorso: Array.isArray(p.percorso) ? p.percorso.filter(x => typeof x === 'string') : [] }));
    s.registro = (s.registro && typeof s.registro === 'object') ? Object.assign({}, s.registro) : {};
    for (const p of s.prodotti) if (!s.registro[p.id] || typeof s.registro[p.id] !== 'object') s.registro[p.id] = {};
    const f = (s.filtri && typeof s.filtri === 'object') ? s.filtri : {};
    s.filtri = { daMese: Number.isInteger(f.daMese) ? f.daMese : 1, aMese: Number.isInteger(f.aMese) ? f.aMese : s.mesi, fase: typeof f.fase === 'string' ? f.fase : 'tutte' };
    return s;
  }

  // Testo JSON -> {ok, scenario} oppure {ok:false, errore}. Rifiuta JSON non valido o versione diversa da 1; il resto lo normalizza.
  function analizzaScenario(testo) {
    let sc;
    try { sc = JSON.parse(testo); } catch (e) { return { ok: false, errore: 'Il testo incollato non è un JSON valido.' }; }
    if (!sc || typeof sc !== 'object' || Array.isArray(sc) || sc.versione !== 1) {
      const v = sc && typeof sc === 'object' && !Array.isArray(sc) ? sc.versione : undefined;
      return { ok: false, errore: `Versione dello scenario non riconosciuta (${v === undefined ? 'assente' : String(v).slice(0, 20)}): questa app legge la versione 1.` };
    }
    return { ok: true, scenario: normalizzaScenario(sc) };
  }

  return { leggiNumero, fmt, normalizzaScenario, analizzaScenario };
});
