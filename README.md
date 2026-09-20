# GRIM Opportunity Hub

Dashboard personale per opportunità WORK / VFX / CGI / AI, ART, GRAFFITI / WRITING / MURALISM e, in una fase successiva, PHOTOGRAPHY.

Il frontend legge a runtime il feed pubblico da `grim-opportunity-data`. Login e dati personali sono separati e protetti tramite Supabase Free con Row Level Security.

Per ogni opportunità è possibile salvare stato personale, priorità, prossima azione, data di follow-up, note e livello di preparazione dei materiali. Supabase conserva soltanto l'ID dell'opportunità e questi dati privati: i contenuti pubblici non vengono duplicati.

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
