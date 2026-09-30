# Controllo dei costi per fase · demo MCSec

> **Versione 2 (29/09/2026): con lo SBILANCIAMENTO LINEA** della DEF_02 (`mcsec-business/reference/metodologie/controllo-costi-fasi-produzione_DEF_02.xlsx`). La versione precedente resta intatta nella cartella senza `-v2`. Valori di confronto rigenerati con `app/tools/gen_golden_DEF02.py`.

Replica in pagina web del modello Excel «controllo costi per fase a costo standard» (Pillar 1, Performance Intelligence).
Tre passi: Standard (fasi, percorso, parametri per mese) → Consuntivo (il reale, mese per mese) → Risultati (Registro, Semilavorati, Sintesi, Costo prodotto, due grafici).

- Apri `index.html` (anche da file locale). Lo scenario si salva nel browser; «Copia JSON» / «Incolla JSON» per portarlo altrove.
- `engine.js` è il motore puro (`CostiFasi.calcola(scenario)`); `esempio.js` e `test/golden.json` sono generati dall'Excel con `gen_golden.py` (non modificare a mano).
- Test: `node --test` in questa cartella (Node ≥ 20). Il golden confronta ogni cella calcolata con l'Excel, tolleranza 0,005.
