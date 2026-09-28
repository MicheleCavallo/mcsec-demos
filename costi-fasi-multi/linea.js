// linea.js — v2 multiprodotto: strati per prodotto sul motore v1, fisso di fase diviso per pesi, strato «Linea» per il residuo.
// Modulo puro (nessun DOM): in pagina si carica dopo ../costi-fasi/engine.js, in Node richiede il motore da solo.
// Spec: mcsec-business/reference/metodologie/app/2026-09-28-app-costi-fasi-multiprodotto-design.md (decisioni P1-P7).
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../costi-fasi/engine.js'));
  else root.CostiFasiLinea = factory(root.CostiFasi);
})(typeof self !== 'undefined' ? self : this, function (CostiFasi) {
  'use strict';
  const { calcola, costoProdotto, eredita, n } = CostiFasi;
  const MESI_DEFAULT = 12;
  void calcola; void costoProdotto; void n;

  function finito(x) { return x === null || x === undefined || x === '' || (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))); }
  function mappa(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? Object.assign({}, x) : {}; }
  function nomeFase(sc, fid) { const f = (sc.fasi || []).find(x => x.id === fid); return f ? f.nome : fid; }

  // ---- Scenario v2: {versione:2, nome, mesi, fasi, linea:{fid:{fisso}}, prodotti:[{id,nome,percorso,parametri:{fid:{capacita,quota,var,scrap}}}],
  //      consuntivo:{linea:{m:{fid:{fissoReale}}}, pid:{m:{fid:{entrati,lavorati,scrap,usciti,varReale}}}}, filtri}
  function normalizzaV2(sc) {
    const s = Object.assign({}, sc || {});
    s.versione = 2;
    if (!Number.isInteger(s.mesi) || s.mesi < 1 || s.mesi > 60) s.mesi = MESI_DEFAULT;
    s.nome = typeof s.nome === 'string' ? s.nome : 'Linea';
    s.fasi = Array.isArray(s.fasi) ? s.fasi.filter(f => f && typeof f.id === 'string').map(f => ({ id: f.id, nome: typeof f.nome === 'string' ? f.nome : f.id })) : [];
    const linea = mappa(s.linea); s.linea = {};
    for (const f of s.fasi) s.linea[f.id] = { fisso: mappa((linea[f.id] || {}).fisso) };
    if (!Array.isArray(s.prodotti) || !s.prodotti.length) s.prodotti = [{ id: 'P1', nome: 'Prodotto 1', percorso: [] }];
    s.prodotti = s.prodotti.filter(p => p && typeof p === 'object').map((p, i) => {
      const q = { id: typeof p.id === 'string' ? p.id : 'P' + (i + 1), nome: typeof p.nome === 'string' ? p.nome : 'Prodotto ' + (i + 1),
        percorso: Array.isArray(p.percorso) ? p.percorso.filter(x => typeof x === 'string') : [], parametri: {} };
      const par = mappa(p.parametri);
      for (const fid of q.percorso) { const x = mappa(par[fid]); q.parametri[fid] = { capacita: mappa(x.capacita), quota: mappa(x.quota), var: mappa(x.var), scrap: mappa(x.scrap) }; }
      return q;
    });
    const cons = mappa(s.consuntivo); s.consuntivo = { linea: mappa(cons.linea) };
    for (const p of s.prodotti) s.consuntivo[p.id] = mappa(cons[p.id]);   // i prodotti assenti perdono il consuntivo
    const f = mappa(s.filtri);
    s.filtri = { daMese: Number.isInteger(f.daMese) ? f.daMese : 1, aMese: Number.isInteger(f.aMese) ? f.aMese : s.mesi,
      prodotto: typeof f.prodotto === 'string' ? f.prodotto : 'tutti', fase: typeof f.fase === 'string' ? f.fase : 'tutte' };
    return s;
  }

  // scenario v1 → v2 con un prodotto: capacità piena = quota = capacità v1 (peso 1), fisso standard e reale portati a livello linea
  function convertiV1(v1) {
    const prod = (v1.prodotti || [])[0] || { id: 'P1', nome: 'Prodotto 1', percorso: [] };
    const out = { versione: 2, nome: v1.nome || 'Linea', mesi: v1.mesi || MESI_DEFAULT, fasi: (v1.fasi || []).map(f => ({ id: f.id, nome: f.nome })), linea: {},
      prodotti: [{ id: prod.id, nome: prod.nome, percorso: (prod.percorso || []).slice(), parametri: {} }], consuntivo: { linea: {} },
      filtri: { daMese: (v1.filtri || {}).daMese || 1, aMese: (v1.filtri || {}).aMese || v1.mesi || MESI_DEFAULT, prodotto: 'tutti', fase: (v1.filtri || {}).fase || 'tutte' } };
    for (const f of out.fasi) {
      const p = (v1.parametri || {})[f.id] || {};
      out.linea[f.id] = { fisso: mappa(p.fisso) };
      if (out.prodotti[0].percorso.includes(f.id)) out.prodotti[0].parametri[f.id] = { capacita: mappa(p.capacita), quota: mappa(p.capacita), var: mappa(p.var), scrap: mappa(p.scrap) };
    }
    const reg = ((v1.registro || {})[prod.id]) || {}; out.consuntivo[prod.id] = {};
    for (const [m, celle] of Object.entries(reg)) for (const [fid, c] of Object.entries(celle || {})) {
      if (!c || typeof c !== 'object') continue;
      if ('fissoReale' in c) { out.consuntivo.linea[m] = out.consuntivo.linea[m] || {}; out.consuntivo.linea[m][fid] = { fissoReale: c.fissoReale }; }
      const resto = {}; for (const k of ['entrati', 'lavorati', 'scrap', 'usciti', 'varReale']) if (k in c) resto[k] = c[k];
      if (Object.keys(resto).length) { out.consuntivo[prod.id][m] = out.consuntivo[prod.id][m] || {}; out.consuntivo[prod.id][m][fid] = resto; }
    }
    return normalizzaV2(out);
  }

  function analizzaScenarioV2(testo) {
    let sc;
    try { sc = JSON.parse(testo); } catch (e) { return { ok: false, errore: 'Il testo incollato non è un JSON valido.' }; }
    if (!sc || typeof sc !== 'object' || Array.isArray(sc)) return { ok: false, errore: 'Versione dello scenario non riconosciuta (assente): questa app legge le versioni 1 e 2.' };
    if (sc.versione === 2) return { ok: true, scenario: normalizzaV2(sc) };
    if (sc.versione === 1) return { ok: true, scenario: convertiV1(sc), convertito: true };
    return { ok: false, errore: `Versione dello scenario non riconosciuta (${sc.versione === undefined ? 'assente' : String(sc.versione).slice(0, 20)}): questa app legge le versioni 1 e 2.` };
  }

  // Errori di scenario (non KO): senza dati coerenti gli strati non si calcolano. Σ pesi ≤ 1 per fase e mese.
  function validaLinea(sc) {
    const err = [];
    if (!sc || typeof sc !== 'object') return ['Scenario mancante.'];
    if (!Array.isArray(sc.fasi) || !sc.fasi.length) err.push('Il catalogo delle fasi è vuoto.');
    if (!Array.isArray(sc.prodotti) || !sc.prodotti.length) { err.push('Nessun prodotto definito.'); return err; }
    const mesi = sc.mesi === undefined ? MESI_DEFAULT : sc.mesi;
    if (!Number.isInteger(mesi) || mesi < 1 || mesi > 60) { err.push(`Numero di mesi non valido (${String(mesi).slice(0, 12)}): serve un intero tra 1 e 60.`); return err; }
    const ids = new Set((sc.fasi || []).map(f => f.id));
    const usate = new Set();
    for (const p of sc.prodotti) {
      const nomeP = p.nome || p.id;
      const percorso = Array.isArray(p.percorso) ? p.percorso : [];
      if (!percorso.length) err.push(`Il percorso di «${nomeP}» è vuoto: aggiungi almeno una fase.`);
      for (const fid of percorso) {
        if (!ids.has(fid)) { err.push(`${nomeP}: la fase «${fid}» del percorso non è nel catalogo.`); continue; }
        usate.add(fid);
        const par = ((p.parametri || {})[fid]) || {};
        for (const [voce, nome] of [['capacita', 'capacità piena'], ['quota', 'quota riservata'], ['var', 'variabile per pezzo'], ['scrap', 'scrap %']]) {
          const mp = par[voce] || {};
          const nonNum = Object.entries(mp).find(([k, v]) => !finito(v));
          if (nonNum) { err.push(`${nomeP}, ${nomeFase(sc, fid)}: ${nome} nel mese ${nonNum[0]} non è un numero («${String(nonNum[1]).slice(0, 12)}»).`); continue; }
          if (eredita(mp, 1) === null) err.push(`${nomeP}, ${nomeFase(sc, fid)}: manca ${nome} nel mese 1.`);
        }
        for (let m = 1; m <= mesi; m++) {
          const cap = eredita(par.capacita, m), q = eredita(par.quota, m), g = eredita(par.scrap, m);
          if (cap !== null && cap <= 0) { err.push(`${nomeP}, ${nomeFase(sc, fid)}: la capacità piena nel mese ${m} deve essere maggiore di zero.`); break; }
          if (q !== null && cap !== null && (q <= 0 || q > cap + 1e-9)) { err.push(`${nomeP}, ${nomeFase(sc, fid)}: la quota nel mese ${m} (${q}) deve stare tra 1 e la capacità piena (${cap}); oltre la capacità non si può riservare.`); break; }
          if (g !== null && (g < 0 || g >= 0.99 + 1e-12)) { err.push(`${nomeP}, ${nomeFase(sc, fid)}: scrap % nel mese ${m} deve stare tra 0 e 99 %.`); break; }
        }
        const cons = (((sc.consuntivo || {})[p.id]) || {});
        for (const [m, celle] of Object.entries(cons)) { const c = (celle || {})[fid] || {}; for (const [k, v] of Object.entries(c)) if (!finito(v)) { err.push(`${nomeP}, M${m} ${nomeFase(sc, fid)}: ${k} non è un numero («${String(v).slice(0, 12)}»).`); break; } }
      }
    }
    for (const fid of usate) {
      const fisso = (((sc.linea || {})[fid]) || {}).fisso || {};
      const nonNum = Object.entries(fisso).find(([k, v]) => !finito(v));
      if (nonNum) err.push(`${nomeFase(sc, fid)}: fisso di fase nel mese ${nonNum[0]} non è un numero.`);
      else if (eredita(fisso, 1) === null) err.push(`${nomeFase(sc, fid)}: manca il fisso di fase nel mese 1.`);
    }
    for (const [m, celle] of Object.entries(((sc.consuntivo || {}).linea) || {})) for (const [fid, c] of Object.entries(celle || {})) if (c && !finito(c.fissoReale)) err.push(`Linea, M${m} ${nomeFase(sc, fid)}: fisso reale non è un numero.`);
    if (err.length) return err;
    for (let m = 1; m <= mesi; m++) for (const fid of usate) {
      let somma = 0;
      for (const p of sc.prodotti) { if (!p.percorso.includes(fid)) continue; const par = p.parametri[fid]; somma += eredita(par.quota, m) / eredita(par.capacita, m); }
      if (somma > 1 + 1e-9) err.push(`M${m} ${nomeFase(sc, fid)}: le quote riservate superano la capacità della fase (Σ pesi = ${Math.round(somma * 1000) / 10} %). Abbassa una quota.`);
    }
    return err;
  }

  // ---- Pesi: quota ÷ capacità piena per prodotto e fase (frazione di tempo di fase); residuo = 1 − Σ pesi = strato Linea.
  // equivalenti: le quote convertite nei pezzi del primo prodotto che usa la fase (1 pezzo lento vale più macchina di uno veloce).
  function calcolaPesi(sc) {
    const mesi = sc.mesi || MESI_DEFAULT, out = [];
    for (let m = 1; m <= mesi; m++) {
      const fasi = {};
      for (const f of sc.fasi) {
        const pesi = {}; let somma = 0, rif = null, usati = 0;
        for (const p of sc.prodotti) {
          if (!p.percorso.includes(f.id)) continue;
          const par = p.parametri[f.id], cap = eredita(par.capacita, m), q = eredita(par.quota, m);
          const peso = (cap && q !== null) ? q / cap : 0;
          pesi[p.id] = peso; somma += peso;
          if (rif === null) rif = { pid: p.id, cap };
          usati += peso * rif.cap;
        }
        fasi[f.id] = { pesi, somma, residuo: Math.max(0, 1 - somma), equivalenti: rif ? { riferimento: rif.pid, usati, capacita: rif.cap } : null };
      }
      out.push({ mese: m, fasi });
    }
    return out;
  }

  // ---- Fisso di fase (uno per fase: standard in linea[fid].fisso, reale in consuntivo.linea[m][fid].fissoReale) diviso per pesi.
  // fissoReale null = fase ferma per tutti (reale null in ogni strato); 0 = attiva con fisso zero.
  function ripartisciFisso(sc, pesi) {
    const mesi = sc.mesi || MESI_DEFAULT, out = [];
    for (let m = 1; m <= mesi; m++) {
      const fasi = {};
      for (const f of sc.fasi) {
        const std = n(eredita(((sc.linea || {})[f.id] || {}).fisso, m));
        const cella = ((((sc.consuntivo || {}).linea || {})[String(m)]) || {})[f.id];
        const reale = (cella && cella.fissoReale !== null && cella.fissoReale !== undefined && cella.fissoReale !== '') ? Number(cella.fissoReale) : null;
        const w = pesi[m - 1].fasi[f.id], perProdotto = {};
        for (const [pid, peso] of Object.entries(w.pesi)) perProdotto[pid] = { std: std * peso, reale: reale === null ? null : reale * peso };
        fasi[f.id] = { fissoStd: std, fissoReale: reale, perProdotto, linea: { std: std * w.residuo, reale: reale === null ? null : reale * w.residuo } };
      }
      out.push({ mese: m, fasi });
    }
    return out;
  }

  return { normalizzaV2, analizzaScenarioV2, convertiV1, validaLinea, calcolaPesi, ripartisciFisso };
});
