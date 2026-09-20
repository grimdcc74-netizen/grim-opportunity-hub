import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const FEED_URL = "https://raw.githubusercontent.com/grimdcc74-netizen/grim-opportunity-data/main/data/current.json";

const AREAS = {
  work: { label: "WORK / VFX", short: "WORK", tone: "cyan" },
  art: { label: "ART", short: "ART", tone: "rose" },
  graffiti: { label: "GRAFFITI / WRITING", short: "GRAFFITI", tone: "amber" },
  photography: { label: "FOTOGRAFIA", short: "PHOTO", tone: "violet" },
};

const BASE_NAV = [
  { id: "today", label: "Oggi", mark: "01" },
  { id: "work", label: "Lavoro / VFX", mark: "02" },
  { id: "art", label: "Arte", mark: "03" },
  { id: "graffiti", label: "Graffiti / Writing", mark: "04" },
  { id: "photography", label: "Fotografia", mark: "05", future: true },
];

const URGENCY_ORDER = { CRITICAL: 0, URGENT: 1, SOON: 2, ACTIVE: 3, LONG_RANGE: 4, NO_DEADLINE: 5 };

function formatDate(value) {
  if (!value) return "Nessuna scadenza";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function scoreDots(score) {
  if (!Number.isFinite(Number(score))) return "N/V";
  const value = Math.max(0, Math.min(5, Number(score)));
  return `${"●".repeat(value)}${"○".repeat(5 - value)}`;
}

function urgencyOf(item) {
  if (item.urgency) return item.urgency;
  if (item.daysRemaining == null) return "NO_DEADLINE";
  if (item.daysRemaining <= 3) return "CRITICAL";
  if (item.daysRemaining <= 7) return "URGENT";
  if (item.daysRemaining <= 14) return "SOON";
  if (item.daysRemaining <= 30) return "ACTIVE";
  return "LONG_RANGE";
}

function App() {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("today");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("LIVE");
  const [urgency, setUrgency] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [sort, setSort] = useState("priority");

  useEffect(() => {
    let active = true;
    fetch(FEED_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => active && setFeed(data))
      .catch(() => active && setError("Il feed GitHub non è raggiungibile. Riprova tra poco."));
    return () => { active = false; };
  }, []);

  const opportunities = useMemo(() => (feed?.opportunities || []).map((item) => ({
    ...item,
    urgencyComputed: urgencyOf(item),
  })), [feed]);

  const live = opportunities.filter((item) => item.liveStatus === "LIVE");
  const areaCounts = Object.fromEntries(Object.keys(AREAS).map((area) => [area, live.filter((item) => item.area === area).length]));
  const counts = {
    live: live.length,
    ...areaCounts,
    fresh: live.filter((item) => item.isNew).length,
    changed: live.filter((item) => item.changeType && item.changeType !== "UNCHANGED").length,
    verify: opportunities.filter((item) => item.applicationStatus === "TO_VERIFY" || item.liveStatus === "TO_VERIFY").length,
    urgent: live.filter((item) => ["CRITICAL", "URGENT"].includes(item.urgencyComputed)).length,
  };
  const photoReady = counts.photography > 0;
  const nav = BASE_NAV.map((item) => item.id === "photography" ? { ...item, disabled: !photoReady } : item);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const area = view === "today" ? null : view;
    return opportunities
      .filter((item) => !area || item.area === area)
      .filter((item) => status === "ALL" || item.liveStatus === status)
      .filter((item) => urgency === "ALL" || item.urgencyComputed === urgency)
      .filter((item) => {
        if (location === "ALL") return true;
        const text = `${item.location || ""} ${item.country || ""} ${item.city || ""} ${item.remotePolicy || ""}`.toLowerCase();
        if (location === "MILAN") return /milano|lombardia/.test(text);
        if (location === "ITALY") return /italia|italy/.test(text);
        if (location === "REMOTE") return /remote|remoto/.test(text);
        return !/italia|italy/.test(text);
      })
      .filter((item) => !needle || [item.title, item.org, item.category, item.location, item.summary, item.relevance]
        .some((value) => String(value || "").toLowerCase().includes(needle)))
      .sort((a, b) => {
        if (sort === "deadline") return (a.daysRemaining ?? 99999) - (b.daysRemaining ?? 99999);
        if (sort === "new") return Number(b.isNew) - Number(a.isNew) || String(b.firstSeen || "").localeCompare(String(a.firstSeen || ""));
        return (URGENCY_ORDER[a.urgencyComputed] ?? 99) - (URGENCY_ORDER[b.urgencyComputed] ?? 99) || (b.score || 0) - (a.score || 0);
      });
  }, [opportunities, view, query, status, urgency, location, sort]);

  const heading = view === "today" ? "Oggi" : BASE_NAV.find((item) => item.id === view)?.label;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>GRIM</span><strong>Opportunity Hub</strong></div>
        <nav aria-label="Sezioni principali">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} disabled={item.disabled} onClick={() => !item.disabled && setView(item.id)}>
              <i>{item.mark}</i><b>{item.label}</b>{item.disabled && <small>PREVISTA</small>}
            </button>
          ))}
        </nav>
        <div className="future-nav">
          <p>PROSSIME FASI</p>
          <span>Candidature</span><span>Materiali</span><span>Studi monitorati</span><span>Storico</span><span>Impostazioni</span>
        </div>
        <div className="sync"><i /> <span>Feed GitHub<small>{feed ? "Sincronizzato" : error ? "Errore" : "Connessione…"}</small></span></div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">RADAR VERIFICATO</p><h1>{heading}</h1></div>
          <div className="updated"><span>ULTIMO AGGIORNAMENTO</span><strong>{feed?.generatedAt ? formatDate(feed.generatedAt) : "…"}</strong></div>
        </header>

        {error && <div className="error"><strong>Feed non disponibile</strong><span>{error}</span></div>}
        {!feed && !error && <div className="loading"><i /><p>Caricamento delle opportunità verificate…</p></div>}

        {feed && <>
          {view === "today" && <Dashboard counts={counts} opportunities={live} />}
          <section className="results">
            <div className="section-title"><div><p className="eyebrow">{view === "today" ? "TUTTE LE AREE" : "OPPORTUNITÀ"}</p><h2>{view === "today" ? "Priorità operative" : heading}</h2></div><strong>{filtered.length} RISULTATI</strong></div>
            <Filters {...{ query, setQuery, status, setStatus, urgency, setUrgency, location, setLocation, sort, setSort }} />
            <div className="opportunity-list">
              {filtered.slice(0, view === "today" ? 12 : 100).map((item) => <OpportunityCard key={item.id} item={item} />)}
              {!filtered.length && <div className="empty">Nessuna opportunità corrisponde ai filtri selezionati.</div>}
            </div>
          </section>
        </>}
      </main>
    </div>
  );
}

function Dashboard({ counts, opportunities }) {
  const deadlines = [...opportunities].filter((item) => item.daysRemaining != null && item.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4);
  return <section>
    <div className="metric-grid">
      <Metric label="LIVE" value={counts.live} tone="lime" /><Metric label="WORK" value={counts.work} tone="cyan" /><Metric label="ART" value={counts.art} tone="rose" /><Metric label="GRAFFITI" value={counts.graffiti} tone="amber" />
      <Metric label="PHOTO" value={counts.photography} tone="violet" planned={!counts.photography} /><Metric label="NEW" value={counts.fresh} /><Metric label="TO VERIFY" value={counts.verify} /><Metric label="CRITICAL + URGENT" value={counts.urgent} tone="danger" />
    </div>
    <div className="brief-grid">
      <article className="next-action"><p className="eyebrow">NEXT ACTION</p><h3>{deadlines[0]?.title || "Controlla le nuove opportunità"}</h3><p>{deadlines[0]?.org || "Il radar è aggiornato e pronto per la revisione."}</p>{deadlines[0] && <a href={deadlines[0].applicationUrl || deadlines[0].sourceUrl} target="_blank" rel="noreferrer">Apri opportunità ↗</a>}</article>
      <article className="deadline-box"><div className="brief-title"><p className="eyebrow">SCADENZE VICINE</p><span>{deadlines.length}</span></div>{deadlines.map((item) => <div className="deadline-row" key={item.id}><b>{item.daysRemaining}g</b><span><strong>{item.title}</strong><small>{item.org}</small></span></div>)}</article>
    </div>
  </section>;
}

function Metric({ label, value, tone = "neutral", planned = false }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong>{planned && <small>STRUTTURA PRONTA</small>}</article>;
}

function Filters({ query, setQuery, status, setStatus, urgency, setUrgency, location, setLocation, sort, setSort }) {
  return <div className="filters">
    <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca titolo, studio, categoria…" /></label>
    <select aria-label="Stato" value={status} onChange={(e) => setStatus(e.target.value)}><option value="LIVE">Solo LIVE</option><option value="ALL">Tutti gli stati</option><option value="CLOSED">Closed</option></select>
    <select aria-label="Urgenza" value={urgency} onChange={(e) => setUrgency(e.target.value)}><option value="ALL">Tutte le urgenze</option><option value="CRITICAL">Critical</option><option value="URGENT">Urgent</option><option value="SOON">Soon</option><option value="ACTIVE">Active</option><option value="NO_DEADLINE">No deadline</option></select>
    <select aria-label="Area geografica" value={location} onChange={(e) => setLocation(e.target.value)}><option value="ALL">Tutte le aree</option><option value="MILAN">Milano / Lombardia</option><option value="ITALY">Italia</option><option value="INTERNATIONAL">International</option><option value="REMOTE">Remote</option></select>
    <select aria-label="Ordinamento" value={sort} onChange={(e) => setSort(e.target.value)}><option value="priority">Priorità</option><option value="deadline">Scadenza</option><option value="new">Più recenti</option></select>
  </div>;
}

function OpportunityCard({ item }) {
  const meta = AREAS[item.area] || { label: String(item.area || "ALTRO").toUpperCase(), short: "ALTRO", tone: "neutral" };
  const destination = item.directApplyUrl || item.applicationUrl || item.canonicalUrl || item.sourceUrl;
  return <article className="opportunity">
    <div className="rail"><span className={`area ${meta.tone}`}>{meta.short}</span><span className={`urgency ${String(item.urgencyComputed).toLowerCase()}`}>{String(item.urgencyComputed).replace("_", " ")}</span></div>
    <div className="opportunity-main">
      <div className="opportunity-title"><div><h3>{item.title}</h3><p>{item.org}</p></div><div className="score"><span>FIT</span><b>{scoreDots(item.score)}</b></div></div>
      <p className="summary">{item.summary || item.relevance || "Descrizione non disponibile."}</p>
      <div className="meta"><span>{item.location || "Località non indicata"}</span><span>{item.category || item.tag || "Categoria N/V"}</span><span>{formatDate(item.deadlineEuropeRome || item.deadline)}</span><span>Verifica {formatDate(item.lastVerifiedAt)}</span></div>
    </div>
    <div className="action">{item.isNew && <span>NEW</span>}{destination ? <a href={destination} target="_blank" rel="noreferrer" aria-label={`Apri ${item.title}`}>↗</a> : <i>N/V</i>}</div>
  </article>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
