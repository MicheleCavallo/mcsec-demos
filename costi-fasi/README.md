# Controllo dei costi per fase · demo MCSec

Replica in pagina web del modello Excel «controllo costi per fase a costo standard» (Pillar 1, Performance Intelligence).
Tre passi: Standard (fasi, percorso, parametri per mese) → Consuntivo (il reale, mese per mese) → Risultati (Registro, Semilavorati, Sintesi, Costo prodotto, due grafici).

- Apri `index.html` (anche da file locale). Lo scenario si salva nel browser; «Copia JSON» / «Incolla JSON» per portarlo altrove.
- `engine.js` è il motore puro (`CostiFasi.calcola(scenario)`); `esempio.js` e `test/golden.json` sono generati dall'Excel con `gen_golden.py` (non modificare a mano).
- Test: `node --test` in questa cartella (Node ≥ 20). Il golden confronta ogni cella calcolata con l'Excel, tolleranza 0,005.
