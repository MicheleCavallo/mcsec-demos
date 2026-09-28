// lettura.js — «Lettura dei risultati»: il commento del controller generato dai numeri con regole fisse (niente AI, niente rete).
// Ogni frase compare solo se il dato la giustifica; i numeri sono gli stessi delle tabelle (letti da costoProdotto / totaleLinea, mai ricalcolati).
// Modulo puro UMD, condiviso dalla v1 (costi-fasi) e dalla v2 (costi-fasi-multi). Michele 28/09/2026.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CostiFasiLettura = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function fmt(x, dec) {   // it-IT: punto migliaia, virgola decimali (come ui.js)
    if (dec === undefined) dec = 2;
    if (x === null || x === undefined || Number.isNaN(Number(x))) return '–';
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, '§').replace('.', ',').replace(/§/g, '.');
  }
  const pct = x => fmt(x * 100, 1) + ' %';
  const eur = x => fmt(x) + ' €';
  const segno = x => (x > 0 ? '+' : '') + fmt(x);
  const n = x => (x === null || x === undefined || Number.isNaN(Number(x))) ? 0 : Number(x);

  // ---- vista prodotto: cp = costoProdotto(ris, filtri), ris = risultato v1 (per i KO e i mesi)
  function letturaProdotto(cp, ris) {
    const F = [], per = `M${cp.filtri.daMese} → M${cp.filtri.aMese}`;
    const Q = cp.quadratura || {}, g = cp.grafico2 || {};
    // 1. il prodotto finito
    if (cp.finitiPezzi > 0) {
      const dpz = cp.finitoDelta / cp.finitiPezzi, dp = cp.finitoStandardPz ? dpz / cp.finitoStandardPz : null;
      let t = `Prodotto finito ${per}: ${fmt(cp.finitiPezzi, 0)} pezzi finiti a ${fmt(cp.finitoCosto)} €/pz contro ${fmt(cp.finitoStandardPz)} previsti a standard (${segno(dpz)} €/pz${dp === null ? '' : ', ' + (dp > 0 ? '+' : '') + pct(dp)}).`;
      const fasi = (cp.perFase || []).filter(f => f.G !== null && f.G !== undefined && f.L > 0);
      if (fasi.length > 1) { const peggio = fasi.reduce((a, b) => (n(b.G) > n(a.G) ? b : a)); if (n(peggio.G) > 0.005) t += ` La fase che pesa di più sul delta è ${peggio.nome} (${segno(peggio.G)} €/pz buono); il primo posto dove guardare.`; }
      F.push({ tipo: 'finito', testo: t });
    } else F.push({ tipo: 'finito', testo: `Nessun pezzo ha completato la fase finale nel periodo ${per}: il costo del prodotto finito non è ancora leggibile, si leggono i semilavorati per fase.` });
    // 2. dove sono andati gli euro: capacità non usata contro efficienza sui pezzi
    if (g.totale > 0) {
      const nonUsata = n(g.fasiFerme) + n(g.postiVuoti), quota = nonUsata / g.totale, effic = n(Q.prodotto && Q.prodotto.deltaSpesa);
      let t = `Dei ${eur(g.totale)} spesi nel periodo, ${eur(nonUsata)} (${pct(quota)}) sono capacità non usata: ${eur(n(g.fasiFerme))} di fasi ferme e ${eur(n(g.postiVuoti))} di posti vuoti.`;
      if (nonUsata > Math.abs(effic)) t += ` Il delta sui pezzi lavorati è ${segno(effic)} €: il tema è la capacità inutilizzata, non l'efficienza.`;
      else t += ` Il delta sui pezzi lavorati è ${segno(effic)} €, più della capacità non usata: il tema è l'efficienza sui pezzi.`;
      F.push({ tipo: 'euro', testo: t });
    }
    // 3. spesa contro budget a standard: fissi e variabili
    if (Q.totale && cp.lavorati > 0) {
      const dFisso = n(cp.deltaFisso) * cp.lavorati, dVar = n(cp.deltaVar) * cp.lavorati;
      const dove = Math.abs(dFisso) >= Math.abs(dVar) ? 'i fissi' : 'i variabili';
      F.push({ tipo: 'budget', testo: `Spesa contro budget a standard: ${segno(Q.totale.deltaSpesa)} € in totale, di cui ${segno(dFisso)} € sui fissi e ${segno(dVar)} € sui variabili. Prima si guardano ${dove}.` });
    }
    // 4. scarto anomalo
    // scarto anomalo a perdita = tutto il costo accumulato dei pezzi persi (Semilavorati Q, la fetta del grafico), non la sola trasformazione
    const perdita = g.scartoAnomalo !== undefined ? n(g.scartoAnomalo) : n(cp.scrapAnomaloTotale);
    if (perdita > 0.005) {
      const pz = (cp.perFase || []).reduce((s, f) => s + n(f.M), 0);
      let t = `Scarto anomalo: ${eur(perdita)} a perdita, tutto il costo accumulato${pz > 0 ? ` di ${fmt(pz, 1)} pezzi oltre lo scarto normale` : ''}`;
      if (n(cp.finitoReale) > 0) t += `; vale il ${pct(perdita / cp.finitoReale)} del valore dei finiti`;
      F.push({ tipo: 'scarto', testo: t + '.' });
    }
    // 5. mesi anomali: costi senza pezzi buoni; controlli KO
    const vuoti = (cp.serie || []).filter(s => s.mese >= cp.filtri.daMese && s.mese <= cp.filtri.aMese && !(s.buoni > 0) && n(s.realePieno) * n(s.lavorati) === 0 && s.lavorati !== null);
    const mesiCosti = vuoti.filter(s => s.lavorati === 0).map(s => 'M' + s.mese);
    if (mesiCosti.length && ris && ris.sintesi) {
      const costi = mesiCosti.map(m => n(ris.sintesi[Number(m.slice(1)) - 1].B)).reduce((a, b) => a + b, 0);
      if (costi > 0.005) F.push({ tipo: 'mesi', testo: `${mesiCosti.join(', ')}: nessun pezzo lavorato ma ${eur(costi)} di costi, tutti a conto economico come fasi ferme.` });
    }
    if (ris && ris.ko && ris.ko.length) F.push({ tipo: 'ko', testo: `${ris.ko.length} controlli in KO: prima di leggere i numeri vanno spiegati (un KO è un errore di dati, non un risultato).` });
    return F;
  }

  // ---- vista Totale linea: t = totaleLinea(res, filtri), res = calcolaLinea(sc)
  function letturaLinea(t, res) {
    const F = [], per = `M${t.filtri.daMese} → M${t.filtri.aMese}`;
    for (const f of t.finiti || []) {
      if (f.pezzi > 0) F.push({ tipo: 'finito', testo: `${f.nome}: ${fmt(f.pezzi, 0)} pezzi finiti a ${fmt(f.realePz)} €/pz contro ${fmt(f.standardPz)} previsti (${segno(f.deltaPz)} €/pz).` });
      else F.push({ tipo: 'finito', testo: `${f.nome}: nessun pezzo finito nel periodo ${per}.` });
    }
    const g = t.grafico2 || {};
    if (g.totale > 0) {
      const nonUsata = n(g.fasiFerme) + n(g.postiVuoti) + n(g.linea);
      F.push({ tipo: 'euro', testo: `Dei ${eur(g.totale)} spesi dalla linea, ${eur(nonUsata)} (${pct(nonUsata / g.totale)}) sono capacità non usata: ${eur(n(g.fasiFerme))} fasi ferme, ${eur(n(g.postiVuoti))} posti vuoti dentro le quote dei prodotti, ${eur(n(g.linea))} posti non assegnati a nessun prodotto.` });
    }
    if (t.quadratura && t.quadratura.totale) {
      const q = t.quadratura, peggio = (t.righe || []).reduce((a, r) => (!a || r.quadratura.totale.delta > a.quadratura.totale.delta ? r : a), null);
      let s = `Spesa contro budget a standard: ${segno(q.totale.delta)} € in totale (prodotti ${segno(q.totale.delta - t.linea.delta)} €, Linea ${segno(t.linea.delta)} €).`;
      if (peggio && peggio.quadratura.totale.delta > 0.005) s += ` Il delta maggiore è di ${peggio.nome} (${segno(peggio.quadratura.totale.delta)} €).`;
      F.push({ tipo: 'budget', testo: s });
    }
    // residui non assegnati per fase, all'ultimo mese del periodo
    if (res && res.pesi && res.pesi.length) {
      const w = res.pesi[Math.min(t.filtri.aMese, res.pesi.length) - 1];
      const fasi = Object.entries(w.fasi).filter(([, x]) => x.residuo > 1e-9 && x.somma > 0);
      const nome = fid => ((res.strati[Object.keys(res.strati)[0]] || {}).fasi || []).concat().find(f => f.id === fid);
      if (fasi.length) F.push({ tipo: 'linea', testo: `Capacità non riservata a nessun prodotto (M${w.mese}): ${fasi.map(([fid, x]) => `${(nome(fid) || {}).nome || fid} ${pct(x.residuo)}`).join(', ')}: ${eur(t.linea.reale)} a conto economico nel periodo. O si assegna a un prodotto o è capacità in eccesso.` });
    }
    if (res && res.ko && res.ko.length) F.push({ tipo: 'ko', testo: `${res.ko.length} controlli in KO su uno o più prodotti: prima di leggere i numeri vanno spiegati.` });
    return F;
  }

  return { letturaProdotto, letturaLinea, fmt };
});
