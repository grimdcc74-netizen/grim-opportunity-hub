# GRIM Opportunity Hub

Dashboard personale per opportunità WORK / VFX / CGI / AI, ART, GRAFFITI / WRITING / MURALISM e, in una fase successiva, PHOTOGRAPHY.

Il frontend legge a runtime il feed pubblico da `grim-opportunity-data`. Login e dati personali sono separati e protetti tramite Supabase Free con Row Level Security.

Per ogni opportunità è possibile salvare stato personale, priorità, prossima azione, data di follow-up, note e livello di preparazione dei materiali. Supabase conserva soltanto l'ID dell'opportunità e questi dati privati: i contenuti pubblici non vengono duplicati.

La sezione Candidature organizza il percorso in una Kanban privata: preparazione, invio, follow-up, colloquio ed esito. La pagina Oggi evidenzia i follow-up scaduti, previsti oggi o entro tre giorni. Gli avvisi sono interni all'app e non richiedono servizi a pagamento.

Il Material Vault conserva file privati o collegamenti esterni, separati per VFX / CGI / AI, ART, Street Art / Graffiti e Fotografia. Uno stesso materiale può appartenere a più aree senza duplicare il file. Il bucket Supabase è privato, applica regole RLS per proprietario e limita ogni caricamento a 25 MB per tutelare il piano gratuito. Per showreel e video più grandi è previsto il collegamento a una risorsa esterna.

L'applicazione espone nel browser esclusivamente la publishable key prevista da Supabase. Non usa e non deve mai usare chiavi `service_role` o secret.

## Sviluppo locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Personal dashboard for verified opportunities, applications and materials
