# GRIM Opportunity Hub

Dashboard personale, a utente unico, per opportunità WORK / VFX / CGI / AI, ART, GRAFFITI / WRITING / MURALISM e, in una fase successiva, PHOTOGRAPHY.

## Architettura

- React + Vite per il frontend.
- Cloudflare Workers Static Assets per la pubblicazione.
- Feed editoriale pubblico letto a runtime da `grimdcc74-netizen/grim-opportunity-data`.
- Supabase Free per login, Google OAuth, dati personali, Storage privato, ricerche, fonti e monitoraggio automatico.
- RLS attiva su tutte le tabelle esposte.
- Edge Function `monitor-opportunities` per leggere gli URL pubblici aggiunti dall'utente.
- Supabase Cron, `pg_cron`, `pg_net` e Vault per l'esecuzione quotidiana.

Il feed pubblico generale resta separato. Le opportunità rilevate dalle fonti aggiunte dall'utente vengono normalizzate in `monitored_opportunities`, sono private e vengono unite al feed nel browser con deduplicazione per URL.

## Funzioni principali

- Stato personale, priorità, prossima azione, follow-up, note e preparazione materiali.
- Candidature Kanban: preparazione, invio, follow-up, colloquio ed esito.
- Material Vault privato, multi-area e con limite di 25 MB per file.
- Fonti monitorate con prevenzione dei duplicati.
- 38 professioni VFX, CGI e AI organizzate per categoria.
- Seniority personale azzerabile e ricalibrabile da Junior a Head of Department.
- Ricerche salvate parallele con professioni, seniority, fonti, parole chiave, località, modalità e giorni della settimana.
- Scansione automatica ogni giorno selezionato tra le 7:30 e le 8:30, ora italiana.
- Pulsante `Avvia scansione ora`, log per fonte e indicazione degli errori leggibili dall'interfaccia.
- Backup JSON dei dati privati, inclusi risultati e log del monitoraggio.

## Monitoraggio delle fonti

La Edge Function supporta:

- JSON e feed strutturati;
- RSS e Atom;
- JSON-LD, compresi gli oggetti `JobPosting`;
- collegamenti HTML statici;
- matching con professioni e varianti di ruolo;
- filtri per seniority, parole chiave, località, modalità di lavoro e giorni;
- ID stabili, deduplicazione, `first_seen`, `last_seen` e stato di verifica;
- timeout, limite di 2 MB per risposta, limite di 30 fonti per esecuzione e blocco degli indirizzi locali.

Limite esplicito: un sito dinamico può richiedere un adattatore specifico. Login, CAPTCHA, sistemi anti-bot o cambiamenti strutturali possono impedire la lettura automatica. Il progetto non usa browser remoti, proxy o API commerciali.

## Sicurezza

Il browser contiene soltanto la chiave pubblicabile Supabase. La `service_role` resta disponibile esclusivamente nell'ambiente della Edge Function. Il job pianificato usa un token casuale conservato in Supabase Vault; nel database applicativo è presente solo il relativo hash SHA-256.

Le migrazioni sono in `supabase/migrations`. Il file `supabase/schedule_monitoring.example.sql` documenta la configurazione del cron senza contenere il token reale.

## Sviluppo locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Verifiche essenziali

1. `npm run build`
2. controllare gli advisor Supabase di sicurezza e prestazioni;
3. verificare che `grim-daily-monitor` sia attivo con calendario `35 5,6 * * *`;
4. aprire Fonti monitorate e usare `Avvia scansione ora` dopo aver aggiunto almeno una fonte pubblica;
5. controllare i risultati nella ricerca salvata e il log dell'ultima scansione.
