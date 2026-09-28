// esempio-linea.js — esempio a due prodotti sulla stessa linea (scritto a mano il 28/09/2026, NON generato dall'Excel:
// P1 è l'esempio dei 10 pezzi con le quote ridotte dove condivide la fase; il riferimento resta il test strati.test.js a un prodotto).
const ESEMPIO_LINEA = {
  "versione": 2, "nome": "Linea con due prodotti", "mesi": 12,
  "fasi": [{ "id": "F1", "nome": "Fase 1" }, { "id": "F2", "nome": "Fase 2" }, { "id": "F3", "nome": "Fase 3" }],
  "linea": { "F1": { "fisso": { "1": 150 } }, "F2": { "fisso": { "1": 150 } }, "F3": { "fisso": { "1": 100 } } },
  "prodotti": [
    { "id": "P1", "nome": "Prodotto 1", "percorso": ["F1", "F2", "F3"], "parametri": {
      "F1": { "capacita": { "1": 50 }, "quota": { "1": 30 }, "var": { "1": 1 }, "scrap": { "1": 0.15 } },
      "F2": { "capacita": { "1": 40 }, "quota": { "1": 25 }, "var": { "1": 5 }, "scrap": { "1": 0.20 } },
      "F3": { "capacita": { "1": 50 }, "quota": { "1": 30 }, "var": { "1": 2 }, "scrap": { "1": 0.10 } } } },
    { "id": "P2", "nome": "Prodotto 2", "percorso": ["F1", "F3"], "parametri": {
      "F1": { "capacita": { "1": 80 }, "quota": { "1": 20 }, "var": { "1": 1.5 }, "scrap": { "1": 0.10 } },
      "F3": { "capacita": { "1": 60 }, "quota": { "1": 15 }, "var": { "1": 2.5 }, "scrap": { "1": 0.10 } } } }],
  "consuntivo": {
    "linea": { "1": { "F1": { "fissoReale": 200 }, "F3": { "fissoReale": 100 } },
               "2": { "F1": { "fissoReale": 150 }, "F2": { "fissoReale": 180 }, "F3": { "fissoReale": 100 } },
               "3": { "F1": { "fissoReale": 150 }, "F2": { "fissoReale": 180 }, "F3": { "fissoReale": 100 } } },
    "P1": { "1": { "F1": { "entrati": 10, "lavorati": 10, "scrap": 0, "usciti": 10, "varReale": 11 } },
            "2": { "F2": { "entrati": 10, "lavorati": 8, "scrap": 0, "usciti": 8, "varReale": 55 } },
            "3": { "F3": { "entrati": 8, "lavorati": 8, "scrap": 5, "usciti": 3, "varReale": 80 } } },
    "P2": { "1": { "F1": { "entrati": 6, "lavorati": 6, "scrap": 0, "usciti": 6, "varReale": 10 } },
            "2": { "F3": { "entrati": 6, "lavorati": 6, "scrap": 1, "usciti": 5, "varReale": 16 } } } },
  "filtri": { "daMese": 1, "aMese": 3, "prodotto": "tutti", "fase": "tutte" }
};
if (typeof module !== 'undefined') module.exports = ESEMPIO_LINEA;
