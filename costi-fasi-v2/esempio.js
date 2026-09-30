// Generato da gen_golden_DEF02.py dall'Excel DEF_02: NON modificare a mano.
const ESEMPIO_10_PEZZI = {
 "versione": 1,
 "nome": "Esempio 10 pezzi",
 "mesi": 12,
 "fasi": [
  {
   "id": "F1",
   "nome": "Fase 1"
  },
  {
   "id": "F2",
   "nome": "Fase 2"
  },
  {
   "id": "F3",
   "nome": "Fase 3"
  }
 ],
 "parametri": {
  "F1": {
   "capacita": {
    "1": 50
   },
   "var": {
    "1": 1
   },
   "fisso": {
    "1": 150
   },
   "scrap": {
    "1": 0.15
   }
  },
  "F2": {
   "capacita": {
    "1": 40
   },
   "var": {
    "1": 5
   },
   "fisso": {
    "1": 150
   },
   "scrap": {
    "1": 0.2
   }
  },
  "F3": {
   "capacita": {
    "1": 50
   },
   "var": {
    "1": 2
   },
   "fisso": {
    "1": 100
   },
   "scrap": {
    "1": 0.1
   }
  }
 },
 "prodotti": [
  {
   "id": "P1",
   "nome": "Prodotto 1",
   "percorso": [
    "F1",
    "F2",
    "F3"
   ]
  }
 ],
 "registro": {
  "P1": {
   "1": {
    "F1": {
     "entrati": 10,
     "lavorati": 10,
     "scrap": 0,
     "usciti": 10,
     "varReale": 11,
     "fissoReale": 200
    },
    "F2": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    },
    "F3": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    }
   },
   "2": {
    "F1": {
     "entrati": 0,
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0,
     "fissoReale": 150
    },
    "F2": {
     "entrati": 10,
     "lavorati": 8,
     "scrap": 0,
     "usciti": 8,
     "varReale": 55,
     "fissoReale": 180
    },
    "F3": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    }
   },
   "3": {
    "F1": {
     "entrati": 0,
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0,
     "fissoReale": 150
    },
    "F2": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0,
     "fissoReale": 180
    },
    "F3": {
     "entrati": 8,
     "lavorati": 8,
     "scrap": 5,
     "usciti": 3,
     "varReale": 80,
     "fissoReale": 100
    }
   },
   "4": {
    "F1": {
     "entrati": 0,
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    },
    "F2": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    },
    "F3": {
     "lavorati": 0,
     "scrap": 0,
     "usciti": 0,
     "varReale": 0
    }
   }
  }
 },
 "filtri": {
  "daMese": 1,
  "aMese": 4,
  "fase": "tutte"
 }
};
if (typeof module !== 'undefined') module.exports = ESEMPIO_10_PEZZI;
