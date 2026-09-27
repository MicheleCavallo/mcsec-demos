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
        const prev = trova(m - 1, i);
        const first = i === 0, last = i === percorso.length - 1;
        // entrati: input dell'utente per OGNI fase (decisione Michele 27/09): è l'operatore a dichiarare cosa entra e quando;
        // ciò che è uscito a monte e non è ancora dichiarato entrato resta «in transito» (AO). Suggerimento per l'interfaccia:
        // gli usciti a monte del mese prima (Excel H6 = M2).
        const r = { mese: m, fase: fid, idx: i, input: {
          entrati: num(inp.entrati), lavorati: num(inp.lavorati), scrap: num(inp.scrap),
          usciti: num(inp.usciti), varReale: num(inp.varReale), fissoReale: num(inp.fissoReale) } };
        const upPrev = i > 0 ? trova(m - 1, i - 1) : null;
        r.suggeritiEntrati = first ? null : (upPrev ? n(upPrev.M) : 0);
        const J = n(r.input.lavorati), K = n(r.input.scrap), M = n(r.input.usciti), Q = n(r.input.varReale), S = r.input.fissoReale;
        r.C = p.capacita; r.D = par.OLC; r.E = p.E;
        r.F = p.fisso + p.var * J;                                    // budget flessibile
        r.G = prev ? n(prev.N) : 0;                                   // WIP iniziale
        r.H = n(r.input.entrati);                                     // entrati dichiarati dall'utente
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
        // AO (in transito a valle) = Σ usciti fase ≤ m − Σ entrati DICHIARATI nella fase a valle ≤ m (Excel AO6);
        // la riga a valle del mese m non è ancora calcolata: i suoi entrati si leggono dall'input
        const entratiValleM = last ? 0 : n((((reg[String(m)] || {})[percorso[i + 1]]) || {}).entrati);
        r.AO = last ? 0 : (cumPrima('M', i) + M) - (cumPrima('H', i + 1) + entratiValleM);
        r.AP = r.D === 0 ? null : J / r.D;
        r.AQ = r.D === 0 ? null : r.V * J / r.D;
        r.AR = null; r.AS = J === 0 ? null : p.Fcum; r.AT = null; r.AU = null;   // AR/AT/AU dal Task 4 (Semilavorati)
        righe.push(r);
      }
    }
    return righe;
  }

  // ---- Semilavorati: magazzino a costo medio ponderato per fase (colonne C..V della DEF_01).
  function calcolaSemilavorati(registro, percorso, parametri) {
    const righe = [];
    const trovaR = (m, i) => registro.find(r => r.mese === m && r.idx === i) || null;
    const trovaS = (m, i) => righe.find(r => r.mese === m && r.idx === i) || null;
    for (const reg of registro) {
      const { mese: m, idx: i, fase: fid } = reg;
      const last = i === percorso.length - 1, first = i === 0;
      const g = n(parametri[m - 1].fasi[fid].scrap);
      const prevS = trovaS(m - 1, i), upPrevS = first ? null : trovaS(m - 1, i - 1);
      const regNext = last ? null : trovaR(m, i + 1);
      const s = { mese: m, fase: fid, idx: i };
      s.C = prevS ? n(prevS.L) : 0;                                   // rimanenza iniziale pezzi
      s.D = prevS ? n(prevS.M) : 0;                                   // rimanenza iniziale €
      s.E = (first || !upPrevS) ? 0 : n(upPrevS.N);                   // costo medio in ingresso dalla fase a monte, fine mese prima
      s.F = n(reg.J) - n(reg.K);                                      // buoni
      s.R = s.F <= 0 ? 0 : Math.min(n(reg.K), s.F * g / (1 - g));      // scrap normale assorbito
      s.S = n(reg.K) - s.R;                                           // scrap anomalo
      s.G = n(reg.J) === 0 ? null : n(reg.Z) + s.E;                   // costo unitario di carico
      s.H = s.F <= 0 ? 0 : (s.F + s.R) * n(s.G);                      // carico €
      s.I = last ? n(reg.O) : n(regNext.J);                           // scarico pezzi: lavorati a valle / OUT
      s.J = s.I === 0 ? null : (last ? ((s.C + s.F) === 0 ? 0 : (s.D + s.H) / (s.C + s.F)) : (s.C === 0 ? 0 : s.D / s.C));
      s.K = s.I === 0 ? 0 : s.I * n(s.J);                             // scarico €
      s.L = s.C + s.F - s.I;                                          // rimanenza finale pezzi
      s.M = s.D + s.H - s.K;                                          // rimanenza finale €
      s.N = s.L === 0 ? null : s.M / s.L;                             // costo medio finale
      const attesoL = last ? n(reg.P) : n(reg.P) + n(reg.AO) + n(regNext.L);
      s.O = s.L < 0 ? 'negativo' : (Math.abs(s.L - attesoL) > 1e-9 ? 'KO stati' : ((s.F > 0 && s.E === 0 && !first) ? 'ingresso da magazzino vuoto' : 'OK'));
      s.P = last ? (s.I === 0 ? null : s.J) : null;                   // prodotto finito €/pz
      s.Q = s.S === 0 ? 0 : s.S * n(s.G);                             // scrap anomalo a perdita €
      s.T = (n(reg.J) === 0 || s.F <= 0) ? 0 : n(reg.AB) * (s.F + s.R) / n(reg.J);
      s.U = n(reg.J) === 0 ? 0 : n(reg.AB) * s.S / n(reg.J);
      s.V = (n(reg.J) === 0 || s.F <= 0) ? 0 : n(reg.AC) / n(reg.J) * s.F / (1 - g);
      righe.push(s);
      reg.AR = n(reg.J) === 0 ? null : s.G;                          // semilavorato cumulato reale €/pz
      reg.AT = reg.AR === null ? null : reg.AR - n(reg.AS);
      reg.AU = n(reg.O) === 0 ? null : s.J;                          // prodotto finito reale €/pz
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
    ris.semilavorati = calcolaSemilavorati(ris.registro, percorso, parametri);
    ris.sintesi = calcolaSintesi(ris.registro, percorso, parametri, ris.mesi);
    ris.costoProdotto = costoProdotto(ris, sc.filtri);
    ris.controlli = calcolaControlli(ris);
    ris.ko = ris.controlli.filter(c => c.esito === 'KO');
    return ris;
  }

  // ---- Nomi parlanti delle colonne (lettera Excel -> nome), per l'interfaccia
  const NOMI = {
    registro: { C: 'Capacità', D: 'OLC linea', E: 'Standard per pezzo', F: 'Budget flessibile', G: 'WIP iniziale', H: 'Entrati', I: 'Disponibili',
      J: 'Lavorati', K: 'Scrap', L: 'Coda', M: 'Usciti', N: 'WIP fine', O: 'OUT finiti', P: 'Pronti non trasferiti', Q: 'Reale variabile',
      R: 'Std variabile', S: 'Reale fisso', T: 'Std fisso', U: 'Reale totale', V: 'Std totale', W: 'Scost. variabile', X: 'Scost. fisso',
      Y: 'Delta spesa', Z: 'Reale per pezzo lavorato', AA: 'Quota fissa per posto', AB: 'Reale sul prodotto', AC: 'Standard maturato',
      AD: 'Non produzione', AE: 'Scost. volume', AF: 'Delta sui lavorati', AG: 'Delta sui non lavorati', AH: 'Delta spiegazione',
      AI: 'Quadratura riga', AJ: 'Quadratura natura', AK: 'Controllo scrap', AL: '% scrap', AM: 'Flag ritardo', AN: 'Check uscite',
      AO: 'In transito a valle', AP: '% assorbimento OLC', AQ: 'Budget assorbito', AR: 'Semilavorato reale €/pz', AS: 'Cumulato std €/pz',
      AT: 'Delta cumulato', AU: 'Prodotto finito reale €/pz' },
    semilavorati: { C: 'Rimanenza iniziale pz', D: 'Rimanenza iniziale €', E: 'Costo medio in ingresso', F: 'Buoni', G: 'Costo unitario di carico',
      H: 'Carico €', I: 'Scarico pz', J: 'Costo medio di scarico', K: 'Scarico €', L: 'Rimanenza finale pz', M: 'Rimanenza finale €',
      N: 'Costo medio finale', O: 'Controllo stati', P: 'Prodotto finito €/pz', Q: 'Scrap anomalo a perdita €', R: 'Scrap normale pz',
      S: 'Scrap anomalo pz', T: 'Trasformazione assorbita €', U: 'Trasformazione su scrap anomalo €', V: 'Standard lordo sui buoni €' },
    sintesi: { B: 'Costo reale', C: 'Standard maturato', D: 'Scostamento totale', E: 'Maturato cumulato', F: 'Finiti nel mese', G: 'Finiti cumulati',
      H: 'Magazzino a standard', I: 'Quadratura stati', M: 'Scost. cumulato totale', N: 'Delta sui lavorati', O: 'Non produzione',
      P: 'Quadratura mese', Q: 'Scost. variabile', R: 'Scost. fisso', S: 'Scrap cumulato a standard' },
  };

  // ---- Controlli in parole: uno per riga (AI AJ AK AM AN, O dei Semilavorati) e per mese (SI, SP)
  function calcolaControlli(ris) {
    const out = [];
    const nome = fid => (ris.fasi.find(f => f.id === fid) || {}).nome || fid;
    for (const r of ris.registro) {
      const base = { mese: r.mese, fase: r.fase };
      out.push({ ...base, codice: 'AI', esito: r.AI === null ? 'tace' : (r.AI === 'OK' ? 'OK' : 'KO'),
        messaggio: r.AI === 'KO' ? `M${r.mese} ${nome(r.fase)}: maturato + delta lavorati + non produzione non torna sul costo reale (formula spostata o cella sovrascritta).` : 'Quadratura riga: maturato + delta lavorati + non produzione = costo reale.' });
      out.push({ ...base, codice: 'AJ', esito: r.AJ === null ? 'tace' : (r.AJ === 'OK' ? 'OK' : 'KO'),
        messaggio: r.AJ === 'KO' ? `M${r.mese} ${nome(r.fase)}: le due viste del delta (natura e destinazione) non danno la stessa torta.` : 'Quadratura natura: scost. variabile + fisso = delta lavorati + delta non lavorati.' });
      out.push({ ...base, codice: 'AK', esito: r.AK === 'OK' ? 'OK' : 'KO',
        messaggio: r.AK === 'KO' ? `M${r.mese} ${nome(r.fase)}: scrap (${r.K}) maggiore dei lavorati (${r.J}).` : 'Scrap entro i lavorati.' });
      out.push({ ...base, codice: 'AM', esito: r.AM ? 'KO' : 'tace',
        messaggio: r.AM ? `M${r.mese} ${nome(r.fase)}: oltre ciclo, lavorati (${r.J}) più del disponibile (entrati ${r.H} + coda ${r.I - r.H}).` : '' });
      out.push({ ...base, codice: 'AN', esito: r.AN ? 'KO' : 'tace',
        messaggio: r.AN ? `M${r.mese} ${nome(r.fase)}: usciti cumulati superiori ai lavorati netti cumulati (fase saltata o usciti sulla riga sbagliata).` : '' });
    }
    const testiO = { 'negativo': 'rimanenza negativa: scaricati più pezzi di quelli in magazzino', 'KO stati': 'la rimanenza in pezzi non coincide con pronti + transito + coda a valle',
      'ingresso da magazzino vuoto': 'la fase ha lavorato pezzi senza nulla in ingresso dal magazzino a monte (lotto oltre il ciclo o dati incoerenti)' };
    for (const s of ris.semilavorati) {
      out.push({ mese: s.mese, fase: s.fase, codice: 'O', esito: s.O === 'OK' ? 'OK' : 'KO',
        messaggio: s.O === 'OK' ? 'Controllo stati OK.' : `M${s.mese} ${nome(s.fase)}: ${testiO[s.O] || s.O}.` });
    }
    for (const y of ris.sintesi) {
      out.push({ mese: y.mese, fase: null, codice: 'SI', esito: y.I === 'OK' ? 'OK' : 'KO',
        messaggio: y.I === 'OK' ? 'Quadratura stati OK.' : `M${y.mese}: maturato cumulato ≠ magazzino a standard + scrap a standard (pezzo perso, doppia maturazione o fase saltata).` });
      out.push({ mese: y.mese, fase: null, codice: 'SP', esito: y.P === 'OK' ? 'OK' : 'KO',
        messaggio: y.P === 'OK' ? 'Quadratura mese OK.' : `M${y.mese}: scostamento totale ≠ delta sui lavorati + non produzione.` });
    }
    return out;
  }

  // ---- Costo prodotto sul periodo [daMese, aMese] e fase ('tutte' o id), come il foglio Costo_Prodotto.
  // Listino (atteso per fase) = E e scrap % del mese aMese (standard corrente, decisione M4).
  function costoProdotto(ris, filtri) {
    const f = Object.assign({ daMese: 1, aMese: ris.mesi, fase: 'tutte' }, filtri || {});
    const da = Math.max(1, n(f.daMese)), a = Math.min(ris.mesi, Math.max(da, n(f.aMese)));
    const inFase = r => f.fase === 'tutte' || r.fase === f.fase;
    const inPer = r => r.mese >= da && r.mese <= a && inFase(r);
    const R = ris.registro.filter(inPer), S = ris.semilavorati.filter(inPer);
    const somma = (righe, col) => righe.reduce((s, r) => s + n(r[col]), 0);
    const div = (num, den) => den ? num / den : null;
    const attive = R.filter(r => r.attiva);
    const last = ris.percorso.length - 1;
    const parA = ris.parametri[a - 1];
    const perFase = ris.percorso.map((fid, i) => {
      if (f.fase !== 'tutte' && f.fase !== fid) return null;
      const Ri = R.filter(r => r.idx === i), Si = S.filter(r => r.idx === i), p = parA.fasi[fid];
      const C = somma(Ri, 'J'), L = somma(Si, 'F');
      const D = n(p.E) / (1 - n(p.scrap)), E = div(somma(Si, 'V'), L), F = div(somma(Si, 'T'), L);
      const G = (E === null || F === null) ? null : F - E;
      return { fase: fid, nome: ris.fasi[i].nome, C, D, E, F, G, H: (E ? G / E : null), I: div(somma(Ri, 'U'), C), J: div(somma(Ri, 'AD'), C),
        K: somma(Ri, 'K'), L, M: somma(Si, 'S'), N: div(somma(Si, 'U'), L) };
    }).filter(Boolean);
    const lavorati = somma(R, 'J'), buoni = somma(S, 'F');
    const cp = { filtri: { daMese: da, aMese: a, fase: f.fase }, lavorati, buoni, scrap: somma(R, 'K'),
      finitiPezzi: somma(R.filter(r => r.idx === last), 'O'),
      finitoCosto: div(somma(S.filter(r => r.idx === last), 'K'), somma(S.filter(r => r.idx === last), 'I')),
      realeVar: div(somma(R, 'Q'), lavorati), realeFisso: div(somma(R, 'S'), lavorati), realePieno: div(somma(R, 'U'), lavorati),
      realeSulProdotto: div(somma(S, 'T'), buoni), realeNonProd: div(somma(R, 'AD'), lavorati),
      realeSommaMedie: perFase.some(x => x.F !== null) ? perFase.reduce((s, x) => s + n(x.F), 0) : null,
      attesoVar: div(somma(attive, 'R'), lavorati), attesoFisso: div(somma(attive, 'T'), lavorati), attesoPieno: div(somma(attive, 'V'), lavorati),
      attesoSulProdotto: div(somma(S, 'V'), buoni), attesoNonProd: div(somma(attive, 'AE'), lavorati),
      attesoSommaMedie: perFase.length ? perFase.reduce((s, x) => s + n(x.D), 0) : null,
      scrapAnomaloPerPezzoBuono: div(somma(S, 'U'), buoni), scrapAnomaloTotale: somma(S, 'U'), perFase };
    for (const k of ['Var', 'Fisso', 'Pieno', 'SulProdotto', 'NonProd', 'SommaMedie']) {
      cp['delta' + k] = (cp['reale' + k] === null || cp['atteso' + k] === null) ? null : cp['reale' + k] - cp['atteso' + k];
    }
    cp.serie = [];
    for (let m = 1; m <= ris.mesi; m++) {
      const inRange = m >= da && m <= a;
      const Rm = ris.registro.filter(r => r.mese === m && inFase(r)), Sm = ris.semilavorati.filter(r => r.mese === m && inFase(r));
      const lav = inRange ? somma(Rm, 'J') : null, b = inRange ? somma(Sm, 'F') : null;
      const reale = b ? somma(Sm, 'T') / b : null, atteso = b ? somma(Sm, 'V') / b : null;
      cp.serie.push({ mese: m, reale, atteso, delta: (reale === null || atteso === null) ? null : reale - atteso,
        lavorati: lav, realePieno: lav ? somma(Rm, 'U') / lav : null, buoni: b });
    }
    // grafico 2: dove sono finiti gli euro del periodo (sketchnote)
    const Sa = ris.semilavorati.filter(r => r.mese === a && inFase(r));
    const g2 = { fasiFerme: somma(R.filter(r => n(r.J) === 0), 'AD'), postiVuoti: somma(R.filter(r => n(r.J) > 0), 'AD'),
      scartoAnomalo: somma(S, 'Q'), semilavorati: somma(Sa.filter(r => r.idx !== last), 'M'),
      finiti: somma(Sa.filter(r => r.idx === last), 'M') + somma(S.filter(r => r.idx === last), 'K'), totale: somma(R, 'U') };
    g2.aContoEconomico = g2.fasiFerme + g2.postiVuoti + g2.scartoAnomalo;
    g2.aMagazzino = g2.semilavorati + g2.finiti;
    cp.grafico2 = g2;
    return cp;
  }

  // ---- Sintesi per mese (colonne B..S). Magazzino a standard per stati valutato ai cumulati del mese (decisione M4).
  function calcolaSintesi(registro, percorso, parametri, mesi) {
    const out = [];
    const last = percorso.length - 1;
    const somma = (righe, col) => righe.reduce((s, r) => s + n(r[col]), 0);
    let cumC = 0, cumF = 0;
    for (let m = 1; m <= mesi; m++) {
      const par = parametri[m - 1];
      const Fcum = i => n(par.fasi[percorso[i]].Fcum);
      const mese = registro.filter(r => r.mese === m);
      const fino = registro.filter(r => r.mese <= m);
      const diFase = (righe, i) => righe.filter(r => r.idx === i);
      const y = { mese: m };
      y.B = somma(mese, 'U'); y.C = somma(mese, 'AC'); y.D = y.B - y.C;
      cumC += y.C; y.E = cumC;
      y.F = somma(diFase(mese, last), 'M'); cumF += y.F; y.G = cumF;
      let H = 0;
      for (let i = 0; i < percorso.length; i++) {
        if (i > 0) H += somma(diFase(mese, i), 'L') * Fcum(i - 1);                 // code: valgono il cumulato della fase a monte
        H += somma(diFase(mese, i), 'P') * Fcum(i);                                // pronti: cumulato della propria fase
        if (i < last) H += (somma(diFase(fino, i), 'M') - somma(diFase(fino, i + 1), 'H')) * Fcum(i);   // in transito
      }
      H += y.G * n(par.E7);                                                        // finiti cumulati al totale prodotto
      y.H = H;
      y.S = percorso.reduce((s, fid, i) => s + somma(diFase(fino, i), 'K') * Fcum(i), 0);   // scrap cumulato a standard
      // Quadratura stati allo standard CORRENTE (decisione M4): il maturato cumulato viene rivalutato al listino del mese
      // (Σ lavorati cumulati per fase × E del mese), così confronta lo stesso listino del magazzino H e dello scrap S.
      // Con parametri costanti Eriv = E (Σ AC) e la quadratura coincide con l'Excel.
      y.Eriv = percorso.reduce((s, fid, i) => s + somma(diFase(fino, i), 'J') * n(par.fasi[fid].E), 0);
      y.I = r2(y.Eriv - y.H - y.S) === 0 ? 'OK' : 'KO';
      y.scostCumFase = {};
      percorso.forEach((fid, i) => { y.scostCumFase[fid] = somma(diFase(fino, i), 'AF') + somma(diFase(fino, i), 'AD'); });
      y.J = percorso[0] ? y.scostCumFase[percorso[0]] : null;
      y.K = percorso[1] ? y.scostCumFase[percorso[1]] : null;
      y.L = percorso[2] ? y.scostCumFase[percorso[2]] : null;
      y.M = Object.values(y.scostCumFase).reduce((s, v) => s + v, 0);
      y.N = somma(mese, 'AF'); y.O = somma(mese, 'AD');
      y.P = r2(y.D - y.N - y.O) === 0 ? 'OK' : 'KO';
      y.Q = somma(mese, 'W'); y.R = somma(mese, 'X');
      out.push(y);
    }
    return out;
  }

  return { calcola, costoProdotto, eredita, n, r2, validaScenario, risolviParametri, NOMI };
});
