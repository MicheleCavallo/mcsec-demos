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
  // Quota effettiva del prodotto sulla fase nel mese: quota scritta (con eredità) oppure, se vuota, la capacità piena (regola di Michele 28/09:
  // il prodotto solo sulla fase non scrive nulla e prende tutta la capacità; resta modificabile).
  function quotaDi(par, m) { const q = eredita((par || {}).quota, m); return q === null ? eredita((par || {}).capacita, m) : q; }

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
    // filtri sempre dentro l'orizzonte: 1 ≤ daMese ≤ aMese ≤ mesi (revisione 28/09: fuori orizzonte il Passo 03 andava in crash)
    const da = Math.min(s.mesi, Math.max(1, Number.isInteger(f.daMese) ? f.daMese : 1));
    const a = Math.min(s.mesi, Math.max(da, Number.isInteger(f.aMese) ? f.aMese : s.mesi));
    s.filtri = { daMese: da, aMese: a, prodotto: typeof f.prodotto === 'string' ? f.prodotto : 'tutti', fase: typeof f.fase === 'string' ? f.fase : 'tutte' };
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
  // opts.soloStruttura: salta il controllo Σ pesi (serve a calcolaLinea per dare comunque i pesi alla pagina quando l'unico errore è quello)
  function validaLinea(sc, opts) {
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
          if (voce !== 'quota' && eredita(mp, 1) === null) err.push(`${nomeP}, ${nomeFase(sc, fid)}: manca ${nome} nel mese 1.`);   // la quota vuota vale la capacità piena
        }
        for (let m = 1; m <= mesi; m++) {
          const cap = eredita(par.capacita, m), q = quotaDi(par, m), g = eredita(par.scrap, m);
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
    if (err.length || (opts && opts.soloStruttura)) return err;
    for (let m = 1; m <= mesi; m++) for (const fid of usate) {
      let somma = 0;
      for (const p of sc.prodotti) { if (!p.percorso.includes(fid)) continue; const par = p.parametri[fid]; somma += quotaDi(par, m) / eredita(par.capacita, m); }
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
          const par = p.parametri[f.id], cap = eredita(par.capacita, m), q = quotaDi(par, m);
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

  // ---- Uno scenario v1 per prodotto (lo «strato»): capacità = quota del prodotto, fisso = fisso di fase × peso (mese per mese, espliciti),
  // registro = consuntivo del prodotto + fissoReale × peso quando la linea non è ferma nel mese. Il motore v1 fa il resto.
  function scenarioStrato(sc, pid, rip) {
    const mesi = sc.mesi || MESI_DEFAULT;
    const p = sc.prodotti.find(x => x.id === pid);
    const v1 = { versione: 1, nome: `${sc.nome} · ${p.nome}`, mesi, fasi: sc.fasi.map(f => ({ id: f.id, nome: f.nome })), parametri: {},
      prodotti: [{ id: p.id, nome: p.nome, percorso: p.percorso.slice() }], registro: { [p.id]: {} }, filtri: { daMese: sc.filtri.daMese, aMese: sc.filtri.aMese, fase: 'tutte' } };
    for (const fid of p.percorso) {
      const par = p.parametri[fid], cap = {}, fisso = {};
      for (let m = 1; m <= mesi; m++) { cap[String(m)] = quotaDi(par, m); fisso[String(m)] = rip[m - 1].fasi[fid].perProdotto[pid].std; }
      v1.parametri[fid] = { capacita: cap, var: Object.assign({}, par.var), fisso, scrap: Object.assign({}, par.scrap) };
    }
    const cons = ((sc.consuntivo || {})[pid]) || {};
    for (let m = 1; m <= mesi; m++) {
      const mese = cons[String(m)] || {};
      for (const fid of p.percorso) {
        const cella = Object.assign({}, mese[fid] || {});
        const reale = rip[m - 1].fasi[fid].perProdotto[pid].reale;
        if (reale !== null) cella.fissoReale = reale;
        if (Object.keys(cella).length) { v1.registro[p.id][String(m)] = v1.registro[p.id][String(m)] || {}; v1.registro[p.id][String(m)][fid] = cella; }
      }
    }
    return v1;
  }

  function calcolaLinea(sc) {
    const errori = validaLinea(sc);
    // con il solo errore Σ pesi > 100 % i pesi si calcolano lo stesso: la pagina deve mostrare dove sono in rosso (revisione 28/09)
    if (errori.length) return { errori, pesi: validaLinea(sc, { soloStruttura: true }).length ? [] : calcolaPesi(sc), ripartizione: [], strati: {}, controlli: [], ko: [] };
    const pesi = calcolaPesi(sc), ripartizione = ripartisciFisso(sc, pesi);
    const strati = {}, controlli = [];
    for (const p of sc.prodotti) {
      const ris = calcola(scenarioStrato(sc, p.id, ripartizione));
      strati[p.id] = ris;
      for (const c of ris.controlli) controlli.push(Object.assign({}, c, { prodotto: p.id, messaggio: c.esito === 'KO' ? `${p.nome}: ${c.messaggio}` : c.messaggio }));
    }
    // strato Linea: residuo del fisso per fase e mese (reale null = fase ferma → 0)
    // budget = std del residuo solo se la fase è attiva per la linea nel mese (fissoReale non null), come il budget v1 che conta solo le righe attive;
    // std resta informativo anche a fase ferma (revisione 28/09: altrimenti una linea ferma mostrava un delta favorevole fittizio)
    const perMese = ripartizione.map(r => { const fasi = {}; let std = 0, reale = 0, budget = 0;
      for (const [fid, x] of Object.entries(r.fasi)) { const attiva = x.fissoReale !== null; fasi[fid] = { std: x.linea.std, reale: attiva ? x.linea.reale : 0, budget: attiva ? x.linea.std : 0 }; std += fasi[fid].std; reale += fasi[fid].reale; budget += fasi[fid].budget; }
      return { mese: r.mese, fasi, std, reale, budget }; });
    // controlli di linea: LFERMA (fase ferma per la linea, prodotto che lavora) e LRES (posti non assegnati, informativo)
    const nomeF = fid => (sc.fasi.find(f => f.id === fid) || {}).nome || fid;
    for (const p of sc.prodotti) for (const r of strati[p.id].registro) {
      const ferma = ripartizione[r.mese - 1].fasi[r.fase].fissoReale === null;
      const lav = n(r.J) > 0;
      controlli.push({ mese: r.mese, fase: r.fase, prodotto: p.id, codice: 'LFERMA', esito: ferma && lav ? 'KO' : 'tace',
        messaggio: ferma && lav ? `${p.nome}, M${r.mese} ${nomeF(r.fase)}: la fase è ferma per la linea (fisso reale vuoto) ma il prodotto ha lavorato ${r.J} pezzi: scrivi il fisso reale della fase (anche 0) o togli i lavorati.` : '' });
    }
    for (const w of pesi) for (const [fid, x] of Object.entries(w.fasi)) if (x.residuo > 1e-9 && x.somma > 0) controlli.push({ mese: w.mese, fase: fid, prodotto: null, codice: 'LRES', esito: 'tace', messaggio: `M${w.mese} ${nomeF(fid)}: ${Math.round(x.residuo * 1000) / 10} % della fase non è riservato a nessun prodotto (strato Linea).` });
    return { errori: [], pesi, ripartizione, strati, linea: { perMese }, controlli, ko: controlli.filter(c => c.esito === 'KO') };
  }

  // ---- Totale della linea sul periodo: Σ strati (costoProdotto di ogni prodotto, fase «tutte») + strato Linea.
  // Il costo per pezzo uscito non esiste a livello linea (prodotti diversi): si legge per prodotto.
  function totaleLinea(res, filtri) {
    // filtri riportati dentro l'orizzonte con la stessa regola del motore v1 (revisione 28/09: fuori orizzonte crash su serie[m-1])
    const mesi = res.linea.perMese.length || MESI_DEFAULT;
    const da = Math.min(mesi, Math.max(1, Number(filtri.daMese) || 1)), a = Math.min(mesi, Math.max(da, Number(filtri.aMese) || mesi));
    const strati = {}, righe = [], finiti = [];
    const q0 = () => ({ reale: 0, budget: 0, delta: 0 });
    const quad = { prodotto: q0(), nonProduzione: q0(), totale: q0() };
    const g2 = { fasiFerme: 0, postiVuoti: 0, scartoAnomalo: 0, semilavorati: 0, finiti: 0, linea: 0, totale: 0 };
    for (const [pid, ris] of Object.entries(res.strati)) {
      const cp = costoProdotto(ris, { daMese: da, aMese: a, fase: 'tutte' });
      strati[pid] = cp;
      const nome = ris.prodottoNome || pid;
      const q = k => ({ reale: cp.quadratura[k].reale, budget: cp.quadratura[k].budget, delta: cp.quadratura[k].deltaSpesa });
      const riga = { pid, nome, quadratura: { prodotto: q('prodotto'), finito: q('finito'), restoProdotto: q('restoProdotto'), nonProduzione: q('nonProduzione'), totale: q('totale') } };
      righe.push(riga);
      for (const k of ['prodotto', 'nonProduzione', 'totale']) for (const j of ['reale', 'budget', 'delta']) quad[k][j] += riga.quadratura[k][j];
      for (const k of ['fasiFerme', 'postiVuoti', 'scartoAnomalo', 'semilavorati', 'finiti', 'totale']) g2[k] += cp.grafico2[k];
      finiti.push({ pid, nome, pezzi: cp.finitiPezzi, realePz: cp.finitoCosto, standardPz: cp.finitoStandardPz, deltaPz: cp.finitiPezzi ? cp.finitoDelta / cp.finitiPezzi : null });
    }
    const linea = { reale: 0, budget: 0, delta: 0 };
    for (const m of res.linea.perMese) if (m.mese >= da && m.mese <= a) { linea.reale += m.reale; linea.budget += m.budget; }
    linea.delta = linea.reale - linea.budget;
    for (const j of ['reale', 'budget', 'delta']) { quad.nonProduzione[j] += linea[j]; quad.totale[j] += linea[j]; }
    g2.linea = linea.reale; g2.totale += linea.reale;
    const lavoratiPerMese = [];
    for (let m = da; m <= a; m++) { const prodotti = {}; for (const [pid, cp] of Object.entries(strati)) { const s = cp.serie[m - 1]; prodotti[pid] = { lavorati: s.lavorati || 0, buoni: s.buoni || 0 }; } lavoratiPerMese.push({ mese: m, prodotti }); }
    return { filtri: { daMese: da, aMese: a }, strati, linea, quadratura: quad, righe, grafico2: g2, finiti, lavoratiPerMese };
  }

  return { normalizzaV2, analizzaScenarioV2, convertiV1, validaLinea, quotaDi, calcolaPesi, ripartisciFisso, scenarioStrato, calcolaLinea, totaleLinea };
});
