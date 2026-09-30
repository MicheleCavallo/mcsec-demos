# Controllo dei costi per fase · v2 multiprodotto (demo MCSec)

> **Versione 2 (29/09/2026): con lo SBILANCIAMENTO LINEA** della DEF_02 (`mcsec-business/reference/metodologie/controllo-costi-fasi-produzione_DEF_02.xlsx`). La versione precedente resta intatta nella cartella senza `-v2`. Valori di confronto rigenerati con `app/tools/gen_golden_DEF02.py`.

Più prodotti sulla stessa linea: ogni prodotto è uno **strato** calcolato dal motore della v1 (`../costi-fasi-v2/engine.js`, condiviso e mai modificato), il fisso di fase si divide per **pesi** (quota ÷ capacità piena del prodotto sulla fase), il residuo 1 − Σ pesi è lo strato **Linea** (posti non assegnati, a conto economico), il totale è la somma. Spec: `mcsec-business/reference/metodologie/app/2026-09-28-app-costi-fasi-multiprodotto-design.md` (decisioni P1-P7); piano: `…-piano.md`.

## Uso

- Apri `index.html` (anche da file locale): serve la cartella `costi-fasi/` accanto, perché la pagina carica `../costi-fasi-v2/engine.js` e `../costi-fasi-v2/ui.js`.
- Tre passi: **Standard** (linea: catalogo fasi e fisso di fase; per prodotto: nome, percorso, capacità piena, quota, variabile, scrap) → **Consuntivo** (per mese: fisso reale per fase scritto una volta, poi pezzi e variabile per prodotto) → **Risultati** («Totale linea» con quadratura per strato e grafici di linea, oppure un prodotto con le schede della v1 sul suo strato).
- Lo scenario si salva nel browser (`localStorage`, chiave `mcsec.costiFasi.v2`, separata dalla v1). «Copia JSON» / «Incolla JSON» per portarlo altrove; un JSON della v1 (`versione: 1`) viene convertito in un prodotto solo (capacità piena = quota, fisso portato a livello linea).
- Parametri URL per link diretti e screenshot: `?passo=1|2|3`, `&mese=1..12`, `&scheda=costo|registro|semilavorati|sintesi`, `&prodotto=P1|linea`, `&esempio=1` (carica l'esempio a due prodotti senza toccare il salvataggio).

## Come si legge lo strato Linea

Per ogni fase e mese la capacità dipende dal prodotto (tempi ciclo diversi): un pezzo del prodotto lento vale più macchina di uno veloce. Peso del prodotto = quota riservata ÷ capacità piena; Σ pesi ≤ 100 % (oltre è un errore di scenario). Il fisso di fase, standard e reale, va ai prodotti in proporzione ai pesi; la parte non riservata a nessuno è la Linea: non produzione della linea, mai caricata su un prodotto. Nel Passo 01 la riga «pezzi equivalenti» mostra l'utilizzo della fase nei pezzi del primo prodotto che la usa.

## File e test

- `linea.js` — modulo puro: `normalizzaV2`, `analizzaScenarioV2`, `convertiV1`, `validaLinea`, `calcolaPesi`, `ripartisciFisso`, `scenarioStrato`, `calcolaLinea`, `totaleLinea`.
- `esempio-linea.js` — esempio a due prodotti, scritto a mano (non dall'Excel): P1 è l'esempio dei 10 pezzi con le quote ridotte dove condivide la fase, P2 un secondo prodotto su F1 e F3.
- `test/` — `node --test` in questa cartella (Node ≥ 20): 20 test. Il test chiave (`strati.test.js`) verifica che con un prodotto solo, capacità piena = quota = capacità v1, lo strato riproduce la v1 **cella per cella**: il golden della DEF_01 copre quindi ogni strato.
