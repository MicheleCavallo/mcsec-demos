// test/scenari.js — scenari di prova condivisi dai test (file senza test: il runner lo carica senza effetti, come util.js)
// dueProdotti: scenario v2 minimo e valido, F1 → F2 per P1, F1 → F3 per P2; F1 condivisa (30/50 + 20/80 = 85 %)
function dueProdotti() {
  return { versione: 2, nome: 'test', mesi: 12,
    fasi: [{ id: 'F1', nome: 'Fase 1' }, { id: 'F2', nome: 'Fase 2' }, { id: 'F3', nome: 'Fase 3' }],
    linea: { F1: { fisso: { '1': 150 } }, F2: { fisso: { '1': 150 } }, F3: { fisso: { '1': 100 } } },
    prodotti: [
      { id: 'P1', nome: 'Prodotto 1', percorso: ['F1', 'F2'], parametri: {
        F1: { capacita: { '1': 50 }, quota: { '1': 30 }, var: { '1': 1 }, scrap: { '1': 0.1 } },
        F2: { capacita: { '1': 40 }, quota: { '1': 25 }, var: { '1': 5 }, scrap: { '1': 0.2 } } } },
      { id: 'P2', nome: 'Prodotto 2', percorso: ['F1', 'F3'], parametri: {
        F1: { capacita: { '1': 80 }, quota: { '1': 20 }, var: { '1': 1.5 }, scrap: { '1': 0.1 } },
        F3: { capacita: { '1': 60 }, quota: { '1': 15 }, var: { '1': 2 }, scrap: { '1': 0.1 } } } }],
    consuntivo: { linea: {}, P1: {}, P2: {} }, filtri: { daMese: 1, aMese: 12, prodotto: 'tutti', fase: 'tutte' } };
}
module.exports = { dueProdotti };
