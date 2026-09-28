# Controllo dei costi per fase · v2 multiprodotto (demo MCSec)

Più prodotti sulla stessa linea: ogni prodotto è uno strato calcolato dal motore della v1 (`../costi-fasi/engine.js`, condiviso e mai modificato), il fisso di fase si divide per pesi (quota ÷ capacità piena), il residuo è lo strato «Linea», il totale è la somma. Spec: `mcsec-business/reference/metodologie/app/2026-09-28-app-costi-fasi-multiprodotto-design.md`.

Apri `index.html` (anche da file locale; serve la cartella `costi-fasi/` accanto). Test: `node --test` in questa cartella.
