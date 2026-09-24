import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabase";
import "./styles.css";

const FEED_URL =
  "https://raw.githubusercontent.com/grimdcc74-netizen/grim-opportunity-data/main/data/current.json";
const APP_BUILD_TIME = __APP_BUILD_TIME__;

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
  { id: "applications", label: "Candidature", mark: "06" },
  { id: "materials", label: "Materiali", mark: "07" },
  { id: "studios", label: "Fonti monitorate", mark: "08" },
  { id: "professions", label: "Professioni", mark: "09" },
  { id: "searches", label: "Ricerche", mark: "10" },
  { id: "history", label: "Storico", mark: "11" },
  { id: "settings", label: "Impostazioni", mark: "12" },
];

const URGENCY_ORDER = {
  CRITICAL: 0,
  URGENT: 1,
  SOON: 2,
  ACTIVE: 3,
  LONG_RANGE: 4,
  NO_DEADLINE: 5,
};

const PERSONAL_STATUSES = [
  ["da_valutare", "Da valutare"],
  ["monitorata", "Monitorata"],
  ["in_preparazione", "In preparazione"],
  ["inviata", "Inviata"],
  ["follow_up", "Follow-up"],
  ["colloquio", "Colloquio"],
  ["risposta_ricevuta", "Risposta ricevuta"],
  ["archiviata", "Archiviata"],
  ["scartata", "Scartata"],
];

const EMPTY_PERSONAL_STATE = {
  personal_status: "da_valutare",
  priority: "",
  notes: "",
  next_action: "",
  follow_up_date: "",
  material_readiness: "",
};

const APPLICATION_STATUSES = [
  ["in_preparazione", "In preparazione"],
  ["inviata", "Inviata"],
  ["follow_up", "Follow-up"],
  ["colloquio", "Colloquio"],
  ["risposta_ricevuta", "Risposta ricevuta"],
  ["accettata", "Accettata"],
  ["rifiutata", "Rifiutata"],
  ["archiviata", "Archiviata"],
];

const APPLICATION_COLUMNS = [
  { id: "preparazione", label: "Preparazione", statuses: ["in_preparazione"] },
  { id: "inviata", label: "Inviata", statuses: ["inviata"] },
  { id: "follow_up", label: "Follow-up", statuses: ["follow_up"] },
  { id: "colloquio", label: "Colloquio", statuses: ["colloquio"] },
  {
    id: "esito",
    label: "Esito",
    statuses: ["risposta_ricevuta", "accettata", "rifiutata", "archiviata"],
  },
];

const EMPTY_APPLICATION = {
  status: "in_preparazione",
  priority: "",
  notes: "",
  application_date: "",
  deadline: "",
  follow_up_date: "",
  application_url: "",
  contact_name: "",
  contact_email: "",
};

const MATERIAL_AREAS = [
  ["vfx_cgi_ai", "VFX / CGI / AI", "cyan"],
  ["art", "ART", "rose"],
  ["street_art_graffiti", "STREET ART / GRAFFITI", "amber"],
  ["photography", "FOTOGRAFIA", "violet"],
];

const MATERIAL_TYPES = [
  "CV",
  "Portfolio",
  "Showreel",
  "Bio",
  "Artist statement",
  "Case study",
  "Immagine",
  "Altro",
];

const EMPTY_MATERIAL = {
  name: "",
  material_type: "Portfolio",
  areas: [],
  url: "",
  version_label: "",
  notes: "",
};

const EMPTY_STUDIO = {
  name: "",
  website_url: "",
  focus_areas: [],
  location: "",
  notes: "",
  next_check_date: "",
  is_active: true,
};

const PROFESSION_CATEGORIES = [
  ["direction_supervision", "Direzione e supervisione"],
  ["preproduction", "Pre-produzione"],
  ["assets_surfacing", "Produzione, asset e surfacing"],
  ["environment", "Produzione, environment"],
  ["fx_lighting_render", "Produzione, FX, lighting e render"],
  ["shot_postproduction", "Post-produzione, lavoro sugli shot"],
  ["ai_crossfunctional", "Ruoli AI, trasversali"],
];

const SENIORITY_LEVELS = [
  [1, "Junior"],
  [2, "Mid"],
  [3, "Senior"],
  [4, "Lead"],
  [5, "Supervisor"],
  [6, "Head of Department"],
];

const SENIORITY_DESCRIPTIONS = {
  1: "Ingresso nella disciplina",
  2: "Autonomia operativa",
  3: "Shot e compiti complessi",
  4: "Coordina un piccolo team",
  5: "Supervisiona la disciplina",
  6: "Guida il dipartimento",
};

const EMPTY_PROFESSION = {
  name: "",
  category: "assets_surfacing",
  seniority_level: "",
  notes: "",
};

const WEEK_DAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Gio"],
  [5, "Ven"], [6, "Sab"], [7, "Dom"],
];

const WORK_MODES = [
  ["remote", "Remoto"],
  ["hybrid", "Ibrido"],
  ["on_site", "In sede"],
];

const EMPTY_SAVED_SEARCH = {
  name: "",
  description: "",
  profession_levels: {},
  include_keywords: "",
  exclude_keywords: "",
  locations: "",
  work_modes: [],
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  use_all_sources: true,
  source_ids: [],
  priority: 3,
  is_active: true,
};

const PROFESSION_HINTS = {
  "Matte Painter": "Lavoro diretto sugli shot per pubblicità e film.",
  "Matte Painter / Environment Generalist":
    "Produzione environment nelle pipeline cinematografiche strutturate.",
};

const HISTORY_EVENT_LABELS = {
  application_created: "Candidatura aggiunta",
  application_status_changed: "Stato candidatura cambiato",
  application_deleted: "Candidatura eliminata",
  material_created: "Materiale aggiunto",
  material_updated: "Materiale modificato",
  material_deleted: "Materiale eliminato",
  studio_created: "Fonte aggiunta",
  studio_checked: "Fonte controllata",
  studio_archived: "Fonte sospesa",
  studio_reactivated: "Fonte riattivata",
  studio_updated: "Fonte modificata",
  studio_deleted: "Fonte eliminata",
};

const HISTORY_ENTITY_LABELS = {
  application: "CANDIDATURA",
  material: "MATERIALE",
  studio: "FONTE",
};

const DEFAULT_PREFERENCES = {
  start_view: "today",
  reminder_window_days: 3,
};

const REMINDER_WINDOW_OPTIONS = [
  ...Array.from({ length: 15 }, (_, index) => index + 1),
  20,
  25,
  30,
];

const START_VIEW_OPTIONS = [
  ["today", "Oggi"],
  ["work", "Lavoro / VFX"],
  ["art", "Arte"],
  ["graffiti", "Graffiti / Writing"],
  ["applications", "Candidature"],
  ["materials", "Materiali"],
  ["studios", "Fonti monitorate"],
  ["professions", "Professioni"],
  ["searches", "Ricerche"],
  ["history", "Storico"],
];

const MATERIAL_MAX_BYTES = 25 * 1024 * 1024;

function safeFileName(value) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function normalizedSourceUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function splitTerms(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function personalStatusLabel(value) {
  return PERSONAL_STATUSES.find(([id]) => id === value)?.[1] || "Da valutare";
}

function applicationStatusLabel(value) {
  return APPLICATION_STATUSES.find(([id]) => id === value)?.[1] || value;
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reminderTiming(value) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`);
  const today = new Date(`${dateKey()}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return { days, tone: "overdue", label: "Scaduto" };
  if (days === 0) return { days, tone: "today", label: "Oggi" };
  if (days <= 3) return { days, tone: "soon", label: `Tra ${days}g` };
  return { days, tone: "future", label: `Tra ${days}g` };
}

function formatDate(value) {
  if (!value) return "Nessuna scadenza";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function Root() {
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="auth-loading">
        <i />
        <p>Verifica accesso…</p>
      </div>
    );
  }

  if (session && passwordRecovery) {
    return <PasswordReset onComplete={() => setPasswordRecovery(false)} />;
  }

  return session ? <App session={session} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("login");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) setMessage("Email o password non corretti.");
    setBusy(false);
  }

  async function handleGoogleLogin() {
    setBusy(true);
    setMessage("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (authError) {
      setMessage("Accesso con Google non riuscito. Riprova tra poco.");
      setBusy(false);
    }
  }

  async function handlePasswordRecovery(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setMessage(
      authError
        ? "Invio non riuscito. Controlla l’indirizzo e riprova tra poco."
        : "Email inviata. Apri il link ricevuto per scegliere una nuova password.",
    );
    setBusy(false);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span>GRIM</span>
          <strong>Opportunity Hub</strong>
        </div>
        <p className="eyebrow">AREA PRIVATA</p>
        <h1>{mode === "login" ? "Accedi" : "Recupera accesso"}</h1>
        <p className="login-copy">
          {mode === "login"
            ? "Opportunità pubbliche e gestione personale restano separate e protette."
            : "Inserisci la tua email. Riceverai un link sicuro per scegliere una nuova password."}
        </p>
        {mode === "login" && (
          <>
            <button
              type="button"
              className="google-login"
              onClick={handleGoogleLogin}
              disabled={busy}
            >
              <span aria-hidden="true">G</span>
              Continua con Google
            </button>
            <div className="login-divider"><span>oppure</span></div>
          </>
        )}
        <form onSubmit={mode === "login" ? handleSubmit : handlePasswordRecovery}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          {mode === "login" && (
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          )}
          {message && (
            <div className="login-error" role="alert">
              {message}
            </div>
          )}
          <button type="submit" disabled={busy}>
            {busy
              ? "Attendi…"
              : mode === "login"
                ? "Accedi con email e password"
                : "Invia link di recupero"}
          </button>
        </form>
        <button
          type="button"
          className="login-secondary"
          onClick={() => changeMode(mode === "login" ? "recovery" : "login")}
          disabled={busy}
        >
          {mode === "login" ? "Password dimenticata?" : "Torna all’accesso"}
        </button>
        <small>Nessuna registrazione disponibile da questa applicazione.</small>
      </section>
    </main>
  );
}

function PasswordReset({ onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Usa almeno 8 caratteri.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Le due password non coincidono.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (authError) {
      setMessage("Aggiornamento non riuscito. Richiedi un nuovo link e riprova.");
      return;
    }
    onComplete();
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span>GRIM</span>
          <strong>Opportunity Hub</strong>
        </div>
        <p className="eyebrow">RECUPERO SICURO</p>
        <h1>Nuova password</h1>
        <p className="login-copy">Scegli una nuova password per il tuo account.</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Nuova password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength="8"
              required
            />
          </label>
          <label>
            <span>Ripeti nuova password</span>
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength="8"
              required
            />
          </label>
          {message && <div className="login-error" role="alert">{message}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva nuova password"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App({ session }) {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("Grim");
  const [view, setView] = useState("today");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("LIVE");
  const [urgency, setUrgency] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [sort, setSort] = useState("priority");
  const [personalStates, setPersonalStates] = useState({});
  const [personalError, setPersonalError] = useState("");
  const [applications, setApplications] = useState([]);
  const [applicationError, setApplicationError] = useState("");
  const [materials, setMaterials] = useState([]);
  const [materialError, setMaterialError] = useState("");
  const [studios, setStudios] = useState([]);
  const [studioError, setStudioError] = useState("");
  const [professions, setProfessions] = useState([]);
  const [professionError, setProfessionError] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchProfessions, setSavedSearchProfessions] = useState([]);
  const [savedSearchSources, setSavedSearchSources] = useState([]);
  const [savedSearchMatches, setSavedSearchMatches] = useState([]);
  const [savedSearchError, setSavedSearchError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(FEED_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => active && setFeed(data))
      .catch(
        () =>
          active &&
          setError("Il feed GitHub non è raggiungibile. Riprova tra poco."),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        if (active && data?.display_name) setDisplayName(data.display_name);
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setSavedSearchError("");
    Promise.all([
      supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", session.user.id)
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabase.from("saved_search_professions").select("*").limit(10000),
      supabase.from("saved_search_sources").select("*").limit(10000),
      supabase.from("saved_search_matches").select("*").limit(10000),
    ]).then((results) => {
      if (!active) return;
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        setSavedSearchError(
          "Le ricerche salvate non sono disponibili. Riprova dopo aver aggiornato la pagina.",
        );
        return;
      }
      setSavedSearches(results[0].data || []);
      setSavedSearchProfessions(results[1].data || []);
      setSavedSearchSources(results[2].data || []);
      setSavedSearchMatches(results[3].data || []);
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setSettingsError("");
    supabase
      .from("settings")
      .select("preferences")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setSettingsError(
            "Le preferenze non sono disponibili. Sono stati mantenuti i valori standard.",
          );
          return;
        }
        const loaded = {
          ...DEFAULT_PREFERENCES,
          ...(data?.preferences || {}),
        };
        setPreferences(loaded);
        if (START_VIEW_OPTIONS.some(([value]) => value === loaded.start_view)) {
          setView(loaded.start_view);
        }
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    if (!["history", "settings"].includes(view)) return undefined;
    let active = true;
    setHistoryError("");
    setHistoryLoading(true);
    supabase
      .from("activity_history")
      .select("*")
      .eq("user_id", session.user.id)
      .order("occurred_at", { ascending: false })
      .limit(500)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setHistoryError(
            "Lo storico non è disponibile. Riprova dopo aver aggiornato la pagina.",
          );
        } else {
          setHistory(data || []);
        }
        setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.user.id, view]);

  useEffect(() => {
    let active = true;
    setApplicationError("");
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setApplicationError(
            "Le candidature non sono disponibili. Riprova dopo aver aggiornato la pagina.",
          );
          return;
        }
        setApplications(data || []);
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setPersonalError("");
    supabase
      .from("opportunity_user_state")
      .select("*")
      .eq("user_id", session.user.id)
      .then(({ data, error: stateError }) => {
        if (!active) return;
        if (stateError) {
          setPersonalError(
            "I dati personali non sono disponibili. Le opportunità pubbliche restano consultabili.",
          );
          return;
        }
        setPersonalStates(
          Object.fromEntries(
            (data || []).map((entry) => [entry.opportunity_id, entry]),
          ),
        );
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setMaterialError("");
    supabase
      .from("materials")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setMaterialError(
            "L’archivio materiali non è disponibile. Riprova dopo aver aggiornato la pagina.",
          );
          return;
        }
        setMaterials(data || []);
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setStudioError("");
    supabase
      .from("monitored_studios")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setStudioError(
            "Le fonti monitorate non sono disponibili. Riprova dopo aver aggiornato la pagina.",
          );
          return;
        }
        setStudios(data || []);
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    setProfessionError("");
    supabase
      .from("monitored_professions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setProfessionError(
            "Le professioni monitorate non sono disponibili. Riprova dopo aver aggiornato la pagina.",
          );
          return;
        }
        setProfessions(data || []);
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  async function savePersonalState(opportunityId, values) {
    const payload = {
      user_id: session.user.id,
      opportunity_id: opportunityId,
      personal_status: values.personal_status,
      priority: values.priority ? Number(values.priority) : null,
      notes: values.notes.trim() || null,
      next_action: values.next_action.trim() || null,
      follow_up_date: values.follow_up_date || null,
      material_readiness: values.material_readiness
        ? Number(values.material_readiness)
        : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("opportunity_user_state")
      .upsert(payload, { onConflict: "user_id,opportunity_id" })
      .select()
      .single();
    if (saveError) throw saveError;
    setPersonalStates((current) => ({ ...current, [opportunityId]: data }));
    return data;
  }

  async function deletePersonalState(opportunityId) {
    const { error: deleteError } = await supabase
      .from("opportunity_user_state")
      .delete()
      .eq("user_id", session.user.id)
      .eq("opportunity_id", opportunityId);
    if (deleteError) throw deleteError;
    setPersonalStates((current) => {
      const next = { ...current };
      delete next[opportunityId];
      return next;
    });
  }

  async function saveApplication(opportunityId, values) {
    const payload = {
      user_id: session.user.id,
      opportunity_id: opportunityId,
      status: values.status,
      priority: values.priority ? Number(values.priority) : null,
      notes: values.notes?.trim() || null,
      application_date: values.application_date || null,
      deadline: values.deadline || null,
      follow_up_date: values.follow_up_date || null,
      application_url: values.application_url?.trim() || null,
      contact_name: values.contact_name?.trim() || null,
      contact_email: values.contact_email?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("applications")
      .upsert(payload, { onConflict: "user_id,opportunity_id" })
      .select()
      .single();
    if (saveError) throw saveError;
    setApplications((current) => [
      data,
      ...current.filter((entry) => entry.opportunity_id !== opportunityId),
    ]);
    return data;
  }

  async function deleteApplication(opportunityId) {
    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", session.user.id)
      .eq("opportunity_id", opportunityId);
    if (deleteError) throw deleteError;
    setApplications((current) =>
      current.filter((entry) => entry.opportunity_id !== opportunityId),
    );
  }

  async function createMaterial(values, file) {
    let storagePath = null;
    if (file) {
      if (file.size > MATERIAL_MAX_BYTES) {
        throw new Error("Il file supera il limite di 25 MB.");
      }
      storagePath = `${session.user.id}/${crypto.randomUUID()}/${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
    }

    const payload = {
      user_id: session.user.id,
      name: values.name.trim(),
      material_type: values.material_type,
      areas: values.areas,
      url: values.url.trim() || null,
      storage_path: storagePath,
      version_label: values.version_label.trim() || null,
      notes: values.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: insertError } = await supabase
      .from("materials")
      .insert(payload)
      .select()
      .single();
    if (insertError) {
      if (storagePath) {
        await supabase.storage.from("materials").remove([storagePath]);
      }
      throw insertError;
    }
    setMaterials((current) => [data, ...current]);
    return data;
  }

  async function saveMaterial(id, values) {
    const payload = {
      name: values.name.trim(),
      material_type: values.material_type,
      areas: values.areas,
      url: values.url.trim() || null,
      version_label: values.version_label.trim() || null,
      notes: values.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("materials")
      .update(payload)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (saveError) throw saveError;
    setMaterials((current) =>
      current.map((entry) => (entry.id === id ? data : entry)),
    );
    return data;
  }

  async function deleteMaterial(material) {
    if (material.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("materials")
        .remove([material.storage_path]);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", material.id)
      .eq("user_id", session.user.id);
    if (deleteError) throw deleteError;
    setMaterials((current) =>
      current.filter((entry) => entry.id !== material.id),
    );
  }

  async function downloadMaterial(material) {
    if (!material.storage_path) return;
    const { data, error: downloadError } = await supabase.storage
      .from("materials")
      .download(material.storage_path);
    if (downloadError) throw downloadError;
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = material.storage_path.split("/").pop() || material.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function createStudio(values) {
    const payload = {
      user_id: session.user.id,
      name: values.name.trim(),
      website_url: normalizedSourceUrl(values.website_url) || null,
      focus_areas: values.focus_areas,
      location: values.location.trim() || null,
      notes: values.notes.trim() || null,
      next_check_date: values.next_check_date || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { data, error: insertError } = await supabase
      .from("monitored_studios")
      .insert(payload)
      .select()
      .single();
    if (insertError) throw insertError;
    setStudios((current) => [data, ...current]);
    return data;
  }

  async function saveStudio(id, values) {
    const payload = {
      name: values.name.trim(),
      website_url: normalizedSourceUrl(values.website_url) || null,
      focus_areas: values.focus_areas,
      location: values.location.trim() || null,
      notes: values.notes.trim() || null,
      next_check_date: values.next_check_date || null,
      is_active: Boolean(values.is_active),
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("monitored_studios")
      .update(payload)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (saveError) throw saveError;
    setStudios((current) =>
      current.map((entry) => (entry.id === id ? data : entry)),
    );
    return data;
  }

  async function markStudioChecked(studio) {
    const { data, error: saveError } = await supabase
      .from("monitored_studios")
      .update({
        last_checked_at: new Date().toISOString(),
        next_check_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studio.id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (saveError) throw saveError;
    setStudios((current) =>
      current.map((entry) => (entry.id === studio.id ? data : entry)),
    );
    return data;
  }

  async function deleteStudio(id) {
    const { error: deleteError } = await supabase
      .from("monitored_studios")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (deleteError) throw deleteError;
    setStudios((current) => current.filter((entry) => entry.id !== id));
  }

  async function createProfession(values) {
    const nextOrder = professions.reduce(
      (maximum, entry) => Math.max(maximum, entry.sort_order || 0),
      0,
    ) + 1;
    const payload = {
      user_id: session.user.id,
      name: values.name.trim(),
      category: values.category,
      seniority_level: values.seniority_level
        ? Number(values.seniority_level)
        : null,
      seniority_locked: false,
      is_direction: false,
      is_active: true,
      notes: values.notes.trim() || null,
      sort_order: nextOrder,
      updated_at: new Date().toISOString(),
    };
    const { data, error: insertError } = await supabase
      .from("monitored_professions")
      .insert(payload)
      .select()
      .single();
    if (insertError) throw insertError;
    setProfessions((current) => [...current, data]);
    return data;
  }

  async function saveProfession(id, values) {
    const payload = {
      name: values.name.trim(),
      category: values.category,
      seniority_level: values.seniority_level
        ? Number(values.seniority_level)
        : null,
      is_active: Boolean(values.is_active),
      notes: values.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("monitored_professions")
      .update(payload)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (saveError) throw saveError;
    setProfessions((current) =>
      current.map((entry) => (entry.id === id ? data : entry)),
    );
    return data;
  }

  async function deleteProfession(id) {
    const { error: deleteError } = await supabase
      .from("monitored_professions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (deleteError) throw deleteError;
    setProfessions((current) => current.filter((entry) => entry.id !== id));
  }

  function savedSearchPayload(values) {
    return {
      name: values.name.trim(),
      description: values.description.trim() || null,
      include_keywords: splitTerms(values.include_keywords),
      exclude_keywords: splitTerms(values.exclude_keywords),
      locations: splitTerms(values.locations),
      work_modes: values.work_modes,
      days_of_week: values.days_of_week.map(Number).sort((a, b) => a - b),
      use_all_sources: Boolean(values.use_all_sources),
      priority: Number(values.priority),
      is_active: Boolean(values.is_active),
      updated_at: new Date().toISOString(),
    };
  }

  function savedSearchRelationRows(searchId, values) {
    const professionRows = Object.entries(values.profession_levels).map(
      ([professionId, level]) => ({
        search_id: searchId,
        profession_id: professionId,
        seniority_level: level ? Number(level) : null,
      }),
    );
    const sourceRows = values.use_all_sources
      ? []
      : values.source_ids.map((sourceId) => ({
          search_id: searchId,
          source_id: Number(sourceId),
        }));
    return { professionRows, sourceRows };
  }

  async function createSavedSearch(values) {
    const { data: search, error: insertError } = await supabase
      .from("saved_searches")
      .insert({ user_id: session.user.id, ...savedSearchPayload(values) })
      .select()
      .single();
    if (insertError) throw insertError;
    const { professionRows, sourceRows } = savedSearchRelationRows(search.id, values);
    const relationResults = await Promise.all([
      professionRows.length
        ? supabase.from("saved_search_professions").insert(professionRows).select()
        : Promise.resolve({ data: [], error: null }),
      sourceRows.length
        ? supabase.from("saved_search_sources").insert(sourceRows).select()
        : Promise.resolve({ data: [], error: null }),
    ]);
    const relationError = relationResults.find((result) => result.error)?.error;
    if (relationError) {
      await supabase.from("saved_searches").delete().eq("id", search.id);
      throw relationError;
    }
    setSavedSearches((current) => [search, ...current]);
    setSavedSearchProfessions((current) => [...current, ...(relationResults[0].data || [])]);
    setSavedSearchSources((current) => [...current, ...(relationResults[1].data || [])]);
    return search;
  }

  async function saveSavedSearch(id, values) {
    const { data: search, error: updateError } = await supabase
      .from("saved_searches")
      .update(savedSearchPayload(values))
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (updateError) throw updateError;
    const deleteResults = await Promise.all([
      supabase.from("saved_search_professions").delete().eq("search_id", id),
      supabase.from("saved_search_sources").delete().eq("search_id", id),
    ]);
    const deleteError = deleteResults.find((result) => result.error)?.error;
    if (deleteError) throw deleteError;
    const { professionRows, sourceRows } = savedSearchRelationRows(id, values);
    const insertResults = await Promise.all([
      professionRows.length
        ? supabase.from("saved_search_professions").insert(professionRows).select()
        : Promise.resolve({ data: [], error: null }),
      sourceRows.length
        ? supabase.from("saved_search_sources").insert(sourceRows).select()
        : Promise.resolve({ data: [], error: null }),
    ]);
    const insertError = insertResults.find((result) => result.error)?.error;
    if (insertError) throw insertError;
    setSavedSearches((current) => current.map((entry) => (entry.id === id ? search : entry)));
    setSavedSearchProfessions((current) => [
      ...current.filter((entry) => entry.search_id !== id),
      ...(insertResults[0].data || []),
    ]);
    setSavedSearchSources((current) => [
      ...current.filter((entry) => entry.search_id !== id),
      ...(insertResults[1].data || []),
    ]);
    return search;
  }

  async function deleteSavedSearch(id) {
    const { error: deleteError } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
    if (deleteError) throw deleteError;
    setSavedSearches((current) => current.filter((entry) => entry.id !== id));
    setSavedSearchProfessions((current) => current.filter((entry) => entry.search_id !== id));
    setSavedSearchSources((current) => current.filter((entry) => entry.search_id !== id));
    setSavedSearchMatches((current) => current.filter((entry) => entry.search_id !== id));
  }

  async function saveSettings(values) {
    const nextPreferences = {
      start_view: values.start_view,
      reminder_window_days: Number(values.reminder_window_days),
    };
    const updatedAt = new Date().toISOString();
    const [profileResult, settingsResult] = await Promise.all([
      supabase
        .from("profiles")
        .upsert(
          {
            user_id: session.user.id,
            display_name: values.display_name.trim(),
            updated_at: updatedAt,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single(),
      supabase
        .from("settings")
        .upsert(
          {
            user_id: session.user.id,
            preferences: nextPreferences,
            backup_version: 1,
            updated_at: updatedAt,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single(),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (settingsResult.error) throw settingsResult.error;
    setDisplayName(profileResult.data.display_name || "Grim");
    setPreferences(nextPreferences);
    return { profile: profileResult.data, settings: settingsResult.data };
  }

  async function downloadBackup() {
    const tableNames = [
      "profiles",
      "settings",
      "opportunity_user_state",
      "applications",
      "materials",
      "monitored_studios",
      "monitored_professions",
      "saved_searches",
      "saved_search_professions",
      "saved_search_sources",
      "saved_search_matches",
      "activity_history",
    ];
    const relationTables = new Set([
      "saved_search_professions",
      "saved_search_sources",
      "saved_search_matches",
    ]);
    const results = await Promise.all(
      tableNames.map((table) => {
        const request = supabase.from(table).select("*").limit(10000);
        return relationTables.has(table)
          ? request
          : request.eq("user_id", session.user.id);
      }),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    const data = Object.fromEntries(
      tableNames.map((table, index) => [table, results[index].data || []]),
    );
    const backup = {
      product: "GRIM Opportunity Hub",
      schema_version: 2,
      exported_at: new Date().toISOString(),
      account_email: session.user.email,
      note: "I file dello Storage non sono inclusi. Il backup contiene i loro riferimenti privati.",
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `grim-opportunity-hub-backup-${dateKey()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return backup;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const opportunities = useMemo(
    () =>
      (feed?.opportunities || []).map((item) => ({
        ...item,
        urgencyComputed: urgencyOf(item),
      })),
    [feed],
  );

  const live = opportunities.filter((item) => item.liveStatus === "LIVE");
  const opportunityMap = useMemo(
    () => Object.fromEntries(opportunities.map((item) => [item.id, item])),
    [opportunities],
  );
  const applicationMap = useMemo(
    () =>
      Object.fromEntries(
        applications.map((entry) => [entry.opportunity_id, entry]),
      ),
    [applications],
  );
  const reminders = useMemo(() => {
    const byOpportunity = new Map();
    Object.values(personalStates).forEach((entry) => {
      if (entry.follow_up_date) {
        byOpportunity.set(entry.opportunity_id, {
          opportunityId: entry.opportunity_id,
          date: entry.follow_up_date,
          source: "Promemoria personale",
        });
      }
    });
    applications.forEach((entry) => {
      if (entry.follow_up_date) {
        byOpportunity.set(entry.opportunity_id, {
          opportunityId: entry.opportunity_id,
          date: entry.follow_up_date,
          source: "Candidatura",
        });
      }
    });
    return [...byOpportunity.values()]
      .map((entry) => ({
        ...entry,
        opportunity: opportunityMap[entry.opportunityId],
        timing: reminderTiming(entry.date),
      }))
      .filter((entry) => entry.timing)
      .sort((a, b) => a.timing.days - b.timing.days);
  }, [applications, opportunityMap, personalStates]);
  const studioReminders = useMemo(
    () =>
      studios
        .filter((entry) => entry.is_active && entry.next_check_date)
        .map((entry) => ({
          studioId: entry.id,
          date: entry.next_check_date,
          studio: entry,
          timing: reminderTiming(entry.next_check_date),
        }))
        .filter((entry) => entry.timing)
        .sort((a, b) => a.timing.days - b.timing.days),
    [studios],
  );
  const areaCounts = Object.fromEntries(
    Object.keys(AREAS).map((area) => [
      area,
      live.filter((item) => item.area === area).length,
    ]),
  );
  const counts = {
    live: live.length,
    ...areaCounts,
    fresh: live.filter((item) => item.isNew).length,
    changed: live.filter(
      (item) => item.changeType && item.changeType !== "UNCHANGED",
    ).length,
    verify: opportunities.filter(
      (item) =>
        item.applicationStatus === "TO_VERIFY" ||
        item.liveStatus === "TO_VERIFY",
    ).length,
    urgent: live.filter((item) =>
      ["CRITICAL", "URGENT"].includes(item.urgencyComputed),
    ).length,
  };
  const photoReady = counts.photography > 0;
  const nav = BASE_NAV.map((item) =>
    item.id === "photography" ? { ...item, disabled: !photoReady } : item,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const area = view === "today" ? null : view;
    return opportunities
      .filter((item) => !area || item.area === area)
      .filter((item) => status === "ALL" || item.liveStatus === status)
      .filter((item) => urgency === "ALL" || item.urgencyComputed === urgency)
      .filter((item) => {
        if (location === "ALL") return true;
        const text =
          `${item.location || ""} ${item.country || ""} ${item.city || ""} ${item.remotePolicy || ""}`.toLowerCase();
        if (location === "MILAN") return /milano|lombardia/.test(text);
        if (location === "ITALY") return /italia|italy/.test(text);
        if (location === "REMOTE") return /remote|remoto/.test(text);
        return !/italia|italy/.test(text);
      })
      .filter(
        (item) =>
          !needle ||
          [
            item.title,
            item.org,
            item.category,
            item.location,
            item.summary,
            item.relevance,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(needle),
          ),
      )
      .sort((a, b) => {
        if (sort === "deadline")
          return (a.daysRemaining ?? 99999) - (b.daysRemaining ?? 99999);
        if (sort === "new")
          return (
            Number(b.isNew) - Number(a.isNew) ||
            String(b.firstSeen || "").localeCompare(String(a.firstSeen || ""))
          );
        return (
          (URGENCY_ORDER[a.urgencyComputed] ?? 99) -
            (URGENCY_ORDER[b.urgencyComputed] ?? 99) ||
          (b.score || 0) - (a.score || 0)
        );
      });
  }, [opportunities, view, query, status, urgency, location, sort]);

  const heading =
    view === "today"
      ? "Oggi"
      : view === "applications"
        ? "Candidature"
      : view === "materials"
          ? "Materiali"
        : view === "studios"
          ? "Fonti monitorate"
        : view === "professions"
          ? "Professioni monitorate"
        : view === "searches"
          ? "Ricerche salvate"
        : view === "history"
          ? "Storico"
        : view === "settings"
          ? "Impostazioni"
        : BASE_NAV.find((item) => item.id === view)?.label;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>GRIM</span>
          <strong>Opportunity Hub</strong>
        </div>
        <nav aria-label="Sezioni principali">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              disabled={item.disabled}
              type="button"
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => !item.disabled && setView(item.id)}
            >
              <i>{item.mark}</i>
              <b>{item.label}</b>
              {item.disabled && <small>PREVISTA</small>}
              {item.id === "applications" && <small>{applications.length}</small>}
              {item.id === "materials" && <small>{materials.length}</small>}
              {item.id === "studios" && <small>{studios.filter((entry) => entry.is_active).length}</small>}
              {item.id === "professions" && <small>{professions.filter((entry) => entry.is_active).length}</small>}
              {item.id === "searches" && <small>{savedSearches.filter((entry) => entry.is_active).length}</small>}
            </button>
          ))}
        </nav>
        <div className="future-nav">
          <p>SVILUPPI FUTURI</p>
          <span>Feed Fotografia</span>
        </div>
        <div className="account">
          <span>{displayName}</span>
          <small>ACCESSO PRIVATO</small>
          <button type="button" onClick={handleSignOut}>Esci</button>
        </div>
        <div className="sync">
          <i />{" "}
          <span>
            Feed GitHub
            <small>
              {feed ? "Sincronizzato" : error ? "Errore" : "Connessione…"}
            </small>
          </span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">RADAR VERIFICATO</p>
            <h1>{heading}</h1>
          </div>
          <div className="updated">
            <span>APP AGGIORNATA</span>
            <strong>{formatDate(APP_BUILD_TIME)}</strong>
            <small>
              Dati verificati {feed?.generatedAt ? formatDate(feed.generatedAt) : "…"}
            </small>
          </div>
        </header>

        {error && (
          <div className="error">
            <strong>Feed non disponibile</strong>
            <span>{error}</span>
          </div>
        )}
        {personalError && (
          <div className="error personal-error" role="alert">
            <strong>Dati personali non disponibili</strong>
            <span>{personalError}</span>
          </div>
        )}
        {applicationError && (
          <div className="error personal-error" role="alert">
            <strong>Candidature non disponibili</strong>
            <span>{applicationError}</span>
          </div>
        )}
        {materialError && (
          <div className="error personal-error" role="alert">
            <strong>Materiali non disponibili</strong>
            <span>{materialError}</span>
          </div>
        )}
        {studioError && (
          <div className="error personal-error" role="alert">
            <strong>Fonti monitorate non disponibili</strong>
            <span>{studioError}</span>
          </div>
        )}
        {professionError && (
          <div className="error personal-error" role="alert">
            <strong>Professioni non disponibili</strong>
            <span>{professionError}</span>
          </div>
        )}
        {savedSearchError && (
          <div className="error personal-error" role="alert">
            <strong>Ricerche salvate non disponibili</strong>
            <span>{savedSearchError}</span>
          </div>
        )}
        {historyError && (
          <div className="error personal-error" role="alert">
            <strong>Storico non disponibile</strong>
            <span>{historyError}</span>
          </div>
        )}
        {settingsError && (
          <div className="error personal-error" role="alert">
            <strong>Preferenze non disponibili</strong>
            <span>{settingsError}</span>
          </div>
        )}
        {!feed && !error && (
          <div className="loading">
            <i />
            <p>Caricamento delle opportunità verificate…</p>
          </div>
        )}

        {feed && (
          <>
            {view === "settings" ? (
              <SettingsView
                displayName={displayName}
                email={session.user.email}
                provider={session.user.app_metadata?.provider || "email"}
                preferences={preferences}
                counts={{
                  personalStates: Object.keys(personalStates).length,
                  applications: applications.length,
                  materials: materials.length,
                  studios: studios.length,
                  professions: professions.length,
                  searches: savedSearches.length,
                  history: history.length,
                }}
                onSave={saveSettings}
                onBackup={downloadBackup}
                onSignOut={handleSignOut}
              />
            ) : view === "history" ? (
              <HistoryView
                entries={history}
                loading={historyLoading}
                opportunityMap={opportunityMap}
              />
            ) : view === "studios" ? (
              <StudiosVault
                studios={studios}
                onCreate={createStudio}
                onSave={saveStudio}
                onMarkChecked={markStudioChecked}
                onDelete={deleteStudio}
              />
            ) : view === "professions" ? (
              <ProfessionsVault
                professions={professions}
                onCreate={createProfession}
                onSave={saveProfession}
                onDelete={deleteProfession}
              />
            ) : view === "searches" ? (
              <SavedSearchesView
                searches={savedSearches}
                searchProfessions={savedSearchProfessions}
                searchSources={savedSearchSources}
                searchMatches={savedSearchMatches}
                professions={professions}
                studios={studios}
                opportunityMap={opportunityMap}
                onCreate={createSavedSearch}
                onSave={saveSavedSearch}
                onDelete={deleteSavedSearch}
              />
            ) : view === "materials" ? (
              <MaterialVault
                materials={materials}
                onCreate={createMaterial}
                onSave={saveMaterial}
                onDelete={deleteMaterial}
                onDownload={downloadMaterial}
              />
            ) : view === "applications" ? (
              <ApplicationsBoard
                applications={applications}
                opportunityMap={opportunityMap}
                onSave={saveApplication}
                onDelete={deleteApplication}
              />
            ) : (
              <>
                {view === "today" && (
                  <Dashboard
                    counts={counts}
                    opportunities={live}
                    reminders={reminders}
                    studioReminders={studioReminders}
                    applicationCount={applications.length}
                    onOpenApplications={() => setView("applications")}
                    studioCount={studios.filter((entry) => entry.is_active).length}
                    onOpenStudios={() => setView("studios")}
                    reminderWindowDays={preferences.reminder_window_days}
                  />
                )}
                <section className="results">
              <div className="section-title">
                <div>
                  <p className="eyebrow">
                    {view === "today" ? "TUTTE LE AREE" : "OPPORTUNITÀ"}
                  </p>
                  <h2>{view === "today" ? "Priorità operative" : heading}</h2>
                </div>
                <strong>{filtered.length} RISULTATI</strong>
              </div>
              <details className="collapsible-panel filter-panel" open>
                <summary><strong>Filtri</strong><span>Ricerca, stato, urgenza, area e ordine</span></summary>
                <div className="collapsible-content">
                  <Filters
                    {...{
                      query,
                      setQuery,
                      status,
                      setStatus,
                      urgency,
                      setUrgency,
                      location,
                      setLocation,
                      sort,
                      setSort,
                    }}
                  />
                </div>
              </details>
              <details className="collapsible-panel list-panel" open>
                <summary><strong>Elenco opportunità</strong><span>{filtered.length} risultati</span></summary>
                <div className="opportunity-list collapsible-content">
                  {filtered.slice(0, view === "today" ? 12 : 100).map((item) => (
                    <OpportunityCard
                      key={item.id}
                      item={item}
                      personalState={personalStates[item.id]}
                      application={applicationMap[item.id]}
                      onSave={savePersonalState}
                      onDelete={deletePersonalState}
                      onSaveApplication={saveApplication}
                    />
                  ))}
                  {!filtered.length && (
                    <div className="empty">
                      Nessuna opportunità corrisponde ai filtri selezionati.
                    </div>
                  )}
                </div>
              </details>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Dashboard({
  counts,
  opportunities,
  reminders,
  studioReminders,
  applicationCount,
  onOpenApplications,
  studioCount,
  onOpenStudios,
  reminderWindowDays,
}) {
  const deadlines = [...opportunities]
    .filter((item) => item.daysRemaining != null && item.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 4);
  const nextActionUrl = safeExternalUrl(
    deadlines[0]?.applicationUrl || deadlines[0]?.sourceUrl,
  );
  return (
    <section className="dashboard-folds">
      <details className="collapsible-panel dashboard-panel" open>
        <summary><strong>Riepilogo radar</strong><span>{counts.live} opportunità live</span></summary>
        <div className="collapsible-content metric-grid">
          <Metric label="LIVE" value={counts.live} tone="lime" />
          <Metric label="WORK" value={counts.work} tone="cyan" />
          <Metric label="ART" value={counts.art} tone="rose" />
          <Metric label="GRAFFITI" value={counts.graffiti} tone="amber" />
          <Metric
            label="PHOTO"
            value={counts.photography}
            tone="violet"
            planned={!counts.photography}
          />
          <Metric label="NEW" value={counts.fresh} />
          <Metric label="TO VERIFY" value={counts.verify} />
          <Metric label="CRITICAL + URGENT" value={counts.urgent} tone="danger" />
        </div>
      </details>

      <details className="collapsible-panel dashboard-panel" open>
        <summary><strong>Prossima azione e scadenze</strong><span>{deadlines.length} scadenze vicine</span></summary>
        <div className="collapsible-content brief-grid">
          <article className="next-action">
            <p className="eyebrow">NEXT ACTION</p>
            <h3>{deadlines[0]?.title || "Controlla le nuove opportunità"}</h3>
            <p>
              {deadlines[0]?.org ||
                "Il radar è aggiornato e pronto per la revisione."}
            </p>
            {nextActionUrl && (
              <a
                href={nextActionUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apri opportunità ↗
              </a>
            )}
          </article>
          <article className="deadline-box">
            <div className="brief-title">
              <p className="eyebrow">SCADENZE VICINE</p>
              <span>{deadlines.length}</span>
            </div>
            {deadlines.map((item) => (
              <div className="deadline-row" key={item.id}>
                <b>{item.daysRemaining}g</b>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.org}</small>
                </span>
              </div>
            ))}
          </article>
        </div>
      </details>

      <details className="collapsible-panel dashboard-panel" open>
        <summary><strong>Promemoria operativi</strong><span>Finestra di {reminderWindowDays} giorni</span></summary>
        <div className="collapsible-content">
          <ReminderPanel
            reminders={reminders}
            studioReminders={studioReminders}
            applicationCount={applicationCount}
            onOpenApplications={onOpenApplications}
            studioCount={studioCount}
            onOpenStudios={onOpenStudios}
            reminderWindowDays={reminderWindowDays}
          />
        </div>
      </details>
    </section>
  );
}

function ReminderPanel({
  reminders,
  studioReminders,
  applicationCount,
  onOpenApplications,
  studioCount,
  onOpenStudios,
  reminderWindowDays,
}) {
  const combined = [
    ...reminders.map((entry) => ({
      ...entry,
      key: `opportunity-${entry.opportunityId}`,
      title: entry.opportunity?.title || entry.opportunityId,
      subtitle: entry.opportunity?.org || entry.source,
    })),
    ...studioReminders.map((entry) => ({
      ...entry,
      key: `studio-${entry.studioId}`,
      title: entry.studio.name,
      subtitle: entry.studio.location || "Controllo fonte",
    })),
  ].sort((a, b) => a.timing.days - b.timing.days);
  const windowDays = Number(reminderWindowDays) || 3;
  const actionable = combined.filter((entry) => entry.timing.days <= windowDays);
  const overdue = actionable.filter((entry) => entry.timing.days < 0).length;
  const today = actionable.filter((entry) => entry.timing.days === 0).length;
  const soon = actionable.filter((entry) => entry.timing.days > 0).length;

  return (
    <section className="reminder-panel">
      <div className="reminder-head">
        <div>
          <p className="eyebrow">PROMEMORIA OPERATIVI</p>
          <h3>Follow-up</h3>
        </div>
        <div className="reminder-links">
          <button type="button" onClick={onOpenApplications}>
            Candidature {applicationCount}
          </button>
          <button type="button" onClick={onOpenStudios}>
            Fonti {studioCount}
          </button>
        </div>
      </div>
      <div className="reminder-metrics">
        <span className={overdue ? "danger" : ""}>
          <b>{overdue}</b> scaduti
        </span>
        <span className={today ? "today" : ""}>
          <b>{today}</b> oggi
        </span>
        <span className={soon ? "soon" : ""}>
          <b>{soon}</b> entro {windowDays} giorni
        </span>
      </div>
      {actionable.length ? (
        <div className="reminder-list">
          {actionable.slice(0, 6).map((entry) => (
            <article
              key={entry.key}
              className={`reminder-item ${entry.timing.tone}`}
            >
              <b>{entry.timing.label}</b>
              <span>
                <strong>{entry.title}</strong>
                <small>
                  {entry.subtitle} · {formatDate(entry.date)}
                </small>
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="reminder-empty">
          Nessun follow-up scaduto o previsto {windowDays === 1
            ? "nel prossimo giorno"
            : `nei prossimi ${windowDays} giorni`}.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value, tone = "neutral", planned = false }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {planned && <small>STRUTTURA PRONTA</small>}
    </article>
  );
}

function Filters({
  query,
  setQuery,
  status,
  setStatus,
  urgency,
  setUrgency,
  location,
  setLocation,
  sort,
  setSort,
}) {
  return (
    <div className="filters">
      <label className="search">
        <span>⌕</span>
        <input
          aria-label="Cerca opportunità"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca titolo, studio, categoria…"
        />
      </label>
      <select
        aria-label="Stato"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="LIVE">Solo LIVE</option>
        <option value="ALL">Tutti gli stati</option>
        <option value="CLOSED">Closed</option>
      </select>
      <select
        aria-label="Urgenza"
        value={urgency}
        onChange={(e) => setUrgency(e.target.value)}
      >
        <option value="ALL">Tutte le urgenze</option>
        <option value="CRITICAL">Critical</option>
        <option value="URGENT">Urgent</option>
        <option value="SOON">Soon</option>
        <option value="ACTIVE">Active</option>
        <option value="NO_DEADLINE">No deadline</option>
      </select>
      <select
        aria-label="Area geografica"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      >
        <option value="ALL">Tutte le aree</option>
        <option value="MILAN">Milano / Lombardia</option>
        <option value="ITALY">Italia</option>
        <option value="INTERNATIONAL">International</option>
        <option value="REMOTE">Remote</option>
      </select>
      <select
        aria-label="Ordinamento"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="priority">Priorità</option>
        <option value="deadline">Scadenza</option>
        <option value="new">Più recenti</option>
      </select>
    </div>
  );
}

function OpportunityCard({
  item,
  personalState,
  application,
  onSave,
  onDelete,
  onSaveApplication,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_PERSONAL_STATE);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const meta = AREAS[item.area] || {
    label: String(item.area || "ALTRO").toUpperCase(),
    short: "ALTRO",
    tone: "neutral",
  };
  const destination =
    item.directApplyUrl ||
    item.applicationUrl ||
    item.canonicalUrl ||
    item.sourceUrl;
  const safeDestination = safeExternalUrl(destination);

  useEffect(() => {
    setForm({
      personal_status:
        personalState?.personal_status || EMPTY_PERSONAL_STATE.personal_status,
      priority: personalState?.priority ?? "",
      notes: personalState?.notes || "",
      next_action: personalState?.next_action || "",
      follow_up_date: personalState?.follow_up_date || "",
      material_readiness: personalState?.material_readiness ?? "",
    });
  }, [personalState]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await onSave(item.id, form);
      setMessage("Salvato");
    } catch {
      setMessage("Salvataggio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setMessage("");
    try {
      await onDelete(item.id);
      setForm(EMPTY_PERSONAL_STATE);
      setMessage("Dati personali rimossi");
    } catch {
      setMessage("Rimozione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddApplication() {
    setBusy(true);
    setMessage("");
    try {
      await onSaveApplication(item.id, {
        ...EMPTY_APPLICATION,
        priority: form.priority,
        notes: form.notes,
        follow_up_date: form.follow_up_date,
        deadline: item.deadlineEuropeRome || item.deadline || "",
        application_url:
          item.directApplyUrl ||
          item.applicationUrl ||
          item.canonicalUrl ||
          item.sourceUrl ||
          "",
      });
      setMessage("Aggiunta alle candidature");
    } catch {
      setMessage("Impossibile aggiungere la candidatura. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="opportunity">
      <div className="rail">
        <span className={`area ${meta.tone}`}>{meta.short}</span>
        <span
          className={`urgency ${String(item.urgencyComputed).toLowerCase()}`}
        >
          {String(item.urgencyComputed).replace("_", " ")}
        </span>
      </div>
      <div className="opportunity-main">
        <div className="opportunity-title">
          <div>
            <h3>{item.title}</h3>
            <p>{item.org}</p>
          </div>
          <div className="score">
            <span>FIT</span>
            <b>{scoreDots(item.score)}</b>
          </div>
        </div>
        <p className="summary">
          {item.summary || item.relevance || "Descrizione non disponibile."}
        </p>
        <div className="meta">
          <span>{item.location || "Località non indicata"}</span>
          <span>{item.category || item.tag || "Categoria N/V"}</span>
          <span>{formatDate(item.deadlineEuropeRome || item.deadline)}</span>
          <span>Verifica {formatDate(item.lastVerifiedAt)}</span>
        </div>
        <div className="personal-summary">
          <strong className={personalState ? "saved" : "empty-state"}>
            {personalState
              ? personalStatusLabel(personalState.personal_status)
              : "Non ancora gestita"}
          </strong>
          {personalState?.priority && (
            <span>Priorità {personalState.priority}/5</span>
          )}
          {personalState?.follow_up_date && (
            <span>Follow-up {formatDate(personalState.follow_up_date)}</span>
          )}
          {personalState?.material_readiness && (
            <span>Materiali {personalState.material_readiness}/5</span>
          )}
          {application && (
            <strong className="application-badge">
              Candidatura: {applicationStatusLabel(application.status)}
            </strong>
          )}
        </div>
      </div>
      <div className="action">
        {item.isNew && <span>NEW</span>}
        <button
          type="button"
          className={editing ? "active" : ""}
          onClick={() => {
            setEditing((current) => !current);
            setMessage("");
          }}
          aria-expanded={editing}
          aria-label={`Gestisci ${item.title}`}
          title="Gestisci"
        >
          {editing ? "×" : "+"}
        </button>
        {safeDestination ? (
          <a
            href={safeDestination}
            target="_blank"
            rel="noreferrer"
            aria-label={`Apri ${item.title}`}
          >
            ↗
          </a>
        ) : (
          <i>N/V</i>
        )}
      </div>
      {editing && (
        <form className="personal-editor" onSubmit={handleSave}>
          <div className="editor-heading">
            <div>
              <p className="eyebrow">GESTIONE PERSONALE</p>
              <h4>Stato e prossimi passi</h4>
            </div>
            <small>Privato, visibile solo nel tuo account</small>
          </div>
          <div className="editor-grid">
            <label>
              <span>Stato</span>
              <select
                name="personal_status"
                value={form.personal_status}
                onChange={updateField}
              >
                {PERSONAL_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Priorità</span>
              <select name="priority" value={form.priority} onChange={updateField}>
                <option value="">Non assegnata</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Preparazione materiali</span>
              <select
                name="material_readiness"
                value={form.material_readiness}
                onChange={updateField}
              >
                <option value="">Non valutata</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Data follow-up</span>
              <input
                type="date"
                name="follow_up_date"
                value={form.follow_up_date}
                onChange={updateField}
              />
            </label>
            <label className="wide">
              <span>Prossima azione</span>
              <input
                name="next_action"
                value={form.next_action}
                onChange={updateField}
                maxLength="500"
                placeholder="Es. preparare showreel mirato"
              />
            </label>
            <label className="wide">
              <span>Note</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                maxLength="5000"
                rows="4"
                placeholder="Contatti, requisiti, idee e dettagli utili…"
              />
            </label>
          </div>
          <div className="editor-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Salvataggio…" : "Salva dati personali"}
            </button>
            {personalState && (
              <button
                type="button"
                className="delete-personal"
                onClick={handleDelete}
                disabled={busy}
              >
                Rimuovi dati
              </button>
            )}
            {!application && (
              <button
                type="button"
                className="add-application"
                onClick={handleAddApplication}
                disabled={busy}
              >
                Aggiungi alle candidature
              </button>
            )}
            {message && <span role="status">{message}</span>}
          </div>
        </form>
      )}
    </article>
  );
}

function SettingsView({
  displayName,
  email,
  provider,
  preferences,
  counts,
  onSave,
  onBackup,
  onSignOut,
}) {
  const [form, setForm] = useState({
    display_name: displayName,
    start_view: preferences.start_view,
    reminder_window_days: preferences.reminder_window_days,
  });
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");

  useEffect(() => {
    setForm({
      display_name: displayName,
      start_view: preferences.start_view,
      reminder_window_days: preferences.reminder_window_days,
    });
  }, [displayName, preferences]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaveMessage("");
    if (!form.display_name.trim()) {
      setSaveMessage("Inserisci il nome da mostrare nell’app.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      setSaveMessage("Impostazioni salvate.");
    } catch {
      setSaveMessage("Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackupMessage("");
    setBackingUp(true);
    try {
      await onBackup();
      setBackupMessage("Backup scaricato sul computer.");
    } catch {
      setBackupMessage("Download del backup non riuscito.");
    } finally {
      setBackingUp(false);
    }
  }

  const providerLabel = provider === "google" ? "Google" : "Email e password";

  return (
    <section className="settings-section">
      <div className="section-title settings-title">
        <div>
          <p className="eyebrow">CONFIGURAZIONE PRIVATA</p>
          <h2>Profilo e preferenze</h2>
          <p>Le impostazioni vengono salvate nel tuo account Supabase.</p>
        </div>
        <strong>0 EURO</strong>
      </div>

      <div className="settings-grid">
        <form className="settings-card settings-preferences" onSubmit={handleSave}>
          <div className="settings-card-head">
            <span>01</span>
            <div>
              <p className="eyebrow">APP</p>
              <h3>Preferenze operative</h3>
            </div>
          </div>
          <label>
            <span>Nome visualizzato</span>
            <input
              name="display_name"
              value={form.display_name}
              onChange={updateField}
              maxLength="120"
              required
            />
          </label>
          <label>
            <span>Pagina iniziale</span>
            <select name="start_view" value={form.start_view} onChange={updateField}>
              {START_VIEW_OPTIONS.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Mostra promemoria in arrivo entro</span>
            <select
              name="reminder_window_days"
              value={form.reminder_window_days}
              onChange={updateField}
            >
              {REMINDER_WINDOW_OPTIONS.map((days) => (
                <option value={days} key={days}>
                  {days} {days === 1 ? "giorno" : "giorni"}
                </option>
              ))}
            </select>
          </label>
          <div className="settings-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Salvataggio…" : "Salva impostazioni"}
            </button>
            {saveMessage && <span role="status">{saveMessage}</span>}
          </div>
        </form>

        <section className="settings-card account-card">
          <div className="settings-card-head">
            <span>02</span>
            <div>
              <p className="eyebrow">ACCOUNT</p>
              <h3>Accesso privato</h3>
            </div>
          </div>
          <dl>
            <div><dt>Email</dt><dd>{email}</dd></div>
            <div><dt>Metodo di accesso</dt><dd>{providerLabel}</dd></div>
            <div><dt>Protezione dati</dt><dd>RLS attiva</dd></div>
            <div><dt>Piano</dt><dd>Supabase Free</dd></div>
          </dl>
          <p className="settings-note">
            Recupero password attivo dalla pagina di accesso.
          </p>
          <button type="button" className="settings-signout" onClick={onSignOut}>Esci dall’account</button>
        </section>

        <section className="settings-card backup-card">
          <div className="settings-card-head">
            <span>03</span>
            <div>
              <p className="eyebrow">COPIA PERSONALE</p>
              <h3>Backup dei dati</h3>
            </div>
          </div>
          <p>
            Scarica un file JSON con profilo, preferenze, candidature, materiali,
            fonti, professioni, ricerche salvate e storico. I file caricati nello Storage non vengono duplicati.
          </p>
          <div className="backup-counts">
            <span><b>{counts.personalStates}</b> opportunità gestite</span>
            <span><b>{counts.applications}</b> candidature</span>
            <span><b>{counts.materials}</b> materiali</span>
            <span><b>{counts.studios}</b> fonti</span>
            <span><b>{counts.professions}</b> professioni</span>
            <span><b>{counts.searches}</b> ricerche</span>
            <span><b>{counts.history}</b> eventi storici</span>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={handleBackup} disabled={backingUp}>
              {backingUp ? "Preparazione…" : "Scarica backup JSON"}
            </button>
            {backupMessage && <span role="status">{backupMessage}</span>}
          </div>
        </section>
      </div>
    </section>
  );
}

function HistoryView({ entries, loading, opportunityMap }) {
  const [entity, setEntity] = useState("all");
  const [period, setPeriod] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const periodDays = period === "all" ? null : Number(period);
    const cutoff = periodDays
      ? Date.now() - periodDays * 24 * 60 * 60 * 1000
      : null;

    return entries.filter((entry) => {
      if (entity !== "all" && entry.entity_type !== entity) return false;
      if (cutoff && new Date(entry.occurred_at).getTime() < cutoff) return false;
      const subject =
        entry.entity_type === "application"
          ? opportunityMap[entry.entity_id]?.title || entry.subject_label
          : entry.subject_label;
      return (
        !needle ||
        [subject, HISTORY_EVENT_LABELS[entry.event_type], entry.entity_type].some(
          (value) => String(value || "").toLowerCase().includes(needle),
        )
      );
    });
  }, [entries, entity, period, query, opportunityMap]);

  const grouped = visible.reduce((groups, entry) => {
    const key = dateKey(new Date(entry.occurred_at));
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {});

  function dayLabel(key) {
    const today = dateKey();
    const yesterday = dateKey(new Date(Date.now() - 86400000));
    if (key === today) return "Oggi";
    if (key === yesterday) return "Ieri";
    return formatDate(`${key}T12:00:00`);
  }

  function detail(entry) {
    if (entry.event_type === "application_status_changed") {
      return `${applicationStatusLabel(entry.metadata?.from_status)} → ${applicationStatusLabel(entry.metadata?.to_status)}`;
    }
    if (entry.event_type.startsWith("material_") && entry.metadata?.material_type) {
      return entry.metadata.material_type;
    }
    if (entry.entity_type === "studio" && entry.metadata?.location) {
      return entry.metadata.location;
    }
    return "";
  }

  if (loading) {
    return (
      <div className="history-loading">
        <i />
        <span>Caricamento dello storico…</span>
      </div>
    );
  }

  return (
    <section className="history-section">
      <div className="section-title history-title">
        <div>
          <p className="eyebrow">CRONOLOGIA PRIVATA</p>
          <h2>Attività registrate</h2>
        </div>
        <strong>{visible.length} EVENTI</strong>
      </div>

      <div className="history-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca nello storico…"
          aria-label="Cerca nello storico"
        />
        <select
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          aria-label="Tipo di attività"
        >
          <option value="all">Tutte le attività</option>
          <option value="application">Candidature</option>
          <option value="material">Materiali</option>
          <option value="studio">Fonti monitorate</option>
        </select>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          aria-label="Periodo dello storico"
        >
          <option value="all">Tutto il periodo</option>
          <option value="7">Ultimi 7 giorni</option>
          <option value="30">Ultimi 30 giorni</option>
          <option value="90">Ultimi 90 giorni</option>
        </select>
      </div>

      {!visible.length ? (
        <div className="history-empty">
          <strong>Nessuna attività registrata</strong>
          <span>
            Da ora compariranno qui le modifiche importanti a candidature,
            materiali e fonti monitorate.
          </span>
        </div>
      ) : (
        <div className="history-groups">
          {Object.entries(grouped).map(([key, dayEntries]) => (
            <details className="history-day" key={key}>
              <summary>
                <h3>{dayLabel(key)}</h3>
                <span>{dayEntries.length}</span>
              </summary>
              <div className="history-list">
                {dayEntries.map((entry) => {
                  const subject =
                    entry.entity_type === "application"
                      ? opportunityMap[entry.entity_id]?.title ||
                        "Opportunità non più presente nel feed"
                      : entry.subject_label;
                  return (
                    <article className={`history-entry ${entry.entity_type}`} key={entry.id}>
                      <i />
                      <div className="history-entry-main">
                        <span>{HISTORY_ENTITY_LABELS[entry.entity_type]}</span>
                        <h4>{HISTORY_EVENT_LABELS[entry.event_type] || entry.event_type}</h4>
                        <strong>{subject}</strong>
                        {detail(entry) && <small>{detail(entry)}</small>}
                      </div>
                      <time dateTime={entry.occurred_at}>{formatDateTime(entry.occurred_at)}</time>
                    </article>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function SavedSearchesView({
  searches,
  searchProfessions,
  searchSources,
  searchMatches,
  professions,
  studios,
  opportunityMap,
  onCreate,
  onSave,
  onDelete,
}) {
  const [creating, setCreating] = useState(false);

  return (
    <section className="saved-searches-section">
      <div className="section-title studio-title">
        <div>
          <p className="eyebrow">RADAR MULTIPLO</p>
          <h2>Ricerche indipendenti</h2>
          <p>Ogni ricerca conserva ruoli, livelli, fonti e risultati separati.</p>
        </div>
        <strong>{searches.filter((entry) => entry.is_active).length} ATTIVE</strong>
      </div>

      <div className="search-intro">
        <div>
          <strong>Una sola scansione mattutina</strong>
          <span>Aggiorna tutte le ricerche previste per quel giorno senza costi aggiuntivi.</span>
        </div>
        <button type="button" onClick={() => setCreating((value) => !value)}>
          {creating ? "Chiudi" : "+ Nuova ricerca"}
        </button>
      </div>

      {creating && (
        <SearchEditor
          initial={EMPTY_SAVED_SEARCH}
          professions={professions}
          studios={studios}
          submitLabel="Salva nuova ricerca"
          onSubmit={async (values) => {
            await onCreate(values);
            setCreating(false);
          }}
        />
      )}

      <details className="collapsible-panel list-panel" open>
        <summary><strong>Ricerche salvate</strong><span>{searches.length}</span></summary>
        <div className="saved-search-list collapsible-content">
        {searches.map((search) => (
          <SavedSearchCard
            key={search.id}
            search={search}
            professionLinks={searchProfessions.filter((entry) => entry.search_id === search.id)}
            sourceLinks={searchSources.filter((entry) => entry.search_id === search.id)}
            matches={searchMatches.filter((entry) => entry.search_id === search.id)}
            professions={professions}
            studios={studios}
            opportunityMap={opportunityMap}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
        {!searches.length && (
          <div className="studio-empty">
            <strong>Nessuna ricerca salvata</strong>
            <span>Crea il primo radar separato per professione o obiettivo.</span>
          </div>
        )}
        </div>
      </details>
    </section>
  );
}

function SearchEditor({ initial, professions, studios, submitLabel, onSubmit }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_SAVED_SEARCH,
    ...initial,
    profession_levels: { ...(initial.profession_levels || {}) },
    source_ids: [...(initial.source_ids || [])],
    work_modes: [...(initial.work_modes || [])],
    days_of_week: [...(initial.days_of_week || WEEK_DAYS.map(([day]) => day))],
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArray(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((entry) => entry !== value)
        : [...current[field], value],
    }));
  }

  function toggleProfession(profession) {
    setForm((current) => {
      const next = { ...current.profession_levels };
      if (Object.hasOwn(next, profession.id)) delete next[profession.id];
      else next[profession.id] = profession.seniority_level || "";
      return { ...current, profession_levels: next };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (!Object.keys(form.profession_levels).length) {
      setMessage("Seleziona almeno una professione.");
      return;
    }
    if (!form.days_of_week.length) {
      setMessage("Seleziona almeno un giorno.");
      return;
    }
    if (!form.use_all_sources && !form.source_ids.length) {
      setMessage("Seleziona almeno una fonte oppure usa tutte le fonti.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (saveError) {
      setMessage(
        saveError?.code === "23505"
          ? "Esiste già una ricerca con questo nome."
          : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="search-editor" onSubmit={handleSubmit}>
      <details className="collapsible-panel search-editor-section" open>
        <summary><strong>Dati della ricerca</strong><span>Nome, priorità e descrizione</span></summary>
        <div className="collapsible-content studio-form-grid">
          <label><span>Nome della ricerca</span><input name="name" value={form.name} onChange={updateField} placeholder="Es. Matte Painter Senior" required maxLength="160" /></label>
          <label><span>Priorità</span><select name="priority" value={form.priority} onChange={updateField}>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{value}/5</option>)}</select></label>
          <label className="wide"><span>Descrizione</span><input name="description" value={form.description} onChange={updateField} placeholder="Obiettivo e tipo di opportunità cercate" maxLength="1000" /></label>
        </div>
      </details>

      <details className="collapsible-panel search-editor-section">
        <summary><strong>Professioni e seniority</strong><span>{Object.keys(form.profession_levels).length} selezionate</span></summary>
        <div className="collapsible-content">
          <SeniorityLegend />
          <div className="search-role-groups">
          {PROFESSION_CATEGORIES.map(([category, label]) => {
            const entries = professions.filter((entry) => entry.category === category && entry.is_active);
            if (!entries.length) return null;
            return (
              <details key={category}>
                <summary>{label} <b>{entries.filter((entry) => Object.hasOwn(form.profession_levels, entry.id)).length}</b></summary>
                <div className="search-role-list">
                  {entries.map((profession) => {
                    const selected = Object.hasOwn(form.profession_levels, profession.id);
                    return (
                      <div className={selected ? "selected" : ""} key={profession.id}>
                        <label><input type="checkbox" checked={selected} onChange={() => toggleProfession(profession)} /><span>{profession.name}</span></label>
                        {selected && (
                          <select
                            value={form.profession_levels[profession.id]}
                            onChange={(event) => setForm((current) => ({ ...current, profession_levels: { ...current.profession_levels, [profession.id]: event.target.value } }))}
                            aria-label={`Seniority ${profession.name}`}
                          >
                            <option value="">Nessun livello specifico</option>
                            {SENIORITY_LEVELS.map(([value, seniority]) => <option value={value} key={value}>{seniority}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
          </div>
        </div>
      </details>

      <details className="collapsible-panel search-editor-section">
        <summary><strong>Fonti</strong><span>{form.use_all_sources ? "Tutte le fonti attive" : `${form.source_ids.length} selezionate`}</span></summary>
        <div className="collapsible-content">
          <label className="search-switch"><input type="checkbox" checked={form.use_all_sources} onChange={(event) => setForm((current) => ({ ...current, use_all_sources: event.target.checked }))} /><span>Usa tutte le fonti attive, comprese quelle aggiunte in futuro</span></label>
          {!form.use_all_sources && (
            <div className="search-source-grid">
              {studios.filter((entry) => entry.is_active).map((studio) => (
                <label key={studio.id}><input type="checkbox" checked={form.source_ids.includes(studio.id)} onChange={() => toggleArray("source_ids", studio.id)} /><span>{studio.name}</span></label>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="collapsible-panel search-editor-section">
        <summary><strong>Giorni del monitoraggio</strong><span>{form.days_of_week.length === 7 ? "Tutti i giorni" : `${form.days_of_week.length} giorni`} · 7:30-8:30</span></summary>
        <div className="collapsible-content search-day-settings">
          <div className="search-day-shortcuts" aria-label="Selezioni rapide dei giorni">
            <button type="button" onClick={() => setForm((current) => ({ ...current, days_of_week: WEEK_DAYS.map(([day]) => day) }))}>Tutti</button>
            <button type="button" onClick={() => setForm((current) => ({ ...current, days_of_week: [1, 2, 3, 4, 5] }))}>Lun-Ven</button>
          </div>
          <div className="search-day-picker">
            {WEEK_DAYS.map(([day, label]) => {
              const selected = form.days_of_week.includes(day);
              return (
                <label className={selected ? "active" : ""} key={day}>
                  <input type="checkbox" checked={selected} onChange={() => toggleArray("days_of_week", day)} />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </details>

      <details className="collapsible-panel search-editor-section">
        <summary><strong>Filtri aggiuntivi</strong><span>Località, modalità e parole chiave</span></summary>
        <div className="collapsible-content studio-form-grid search-filters">
          <label><span>Località, separate da virgola</span><input name="locations" value={form.locations} onChange={updateField} placeholder="Milano, Londra, Europa" /></label>
          <fieldset><legend>Modalità di lavoro</legend><div className="search-work-modes">{WORK_MODES.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.work_modes.includes(value)} onChange={() => toggleArray("work_modes", value)} /><span>{label}</span></label>)}</div></fieldset>
          <label><span>Parole da includere</span><textarea name="include_keywords" value={form.include_keywords} onChange={updateField} rows="3" placeholder="DMP, digital matte painting, environment" /></label>
          <label><span>Parole da escludere</span><textarea name="exclude_keywords" value={form.exclude_keywords} onChange={updateField} rows="3" placeholder="internship, unpaid" /></label>
        </div>
      </details>

      <div className="studio-create-actions">
        <button type="submit" disabled={busy}>{busy ? "Salvataggio…" : submitLabel}</button>
        {message && <span role="status">{message}</span>}
      </div>
    </form>
  );
}

function SeniorityLegend() {
  return (
    <details className="seniority-legend">
      <summary>Legenda seniority <span>Come leggere e impostare i pallini</span></summary>
      <div className="seniority-legend-grid">
        <div><span className="legend-dots empty" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span><strong>0 · Da definire</strong><small>Nessun livello selezionato</small></div>
        {SENIORITY_LEVELS.map(([level, label]) => (
          <div key={level}>
            <span className="legend-dots" aria-hidden="true">{SENIORITY_LEVELS.map(([dot]) => <i className={dot <= level ? "filled" : ""} key={dot} />)}</span>
            <strong>{level} · {label}</strong>
            <small>{SENIORITY_DESCRIPTIONS[level]}</small>
          </div>
        ))}
      </div>
      <p>Puoi azzerare e ricalibrare qualsiasi ruolo. Il titolo della professione non blocca più il livello scelto.</p>
    </details>
  );
}

function SavedSearchCard({ search, professionLinks, sourceLinks, matches, professions, studios, opportunityMap, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const professionMap = Object.fromEntries(professions.map((entry) => [entry.id, entry]));
  const sourceMap = Object.fromEntries(studios.map((entry) => [entry.id, entry]));
  const initial = {
    name: search.name,
    description: search.description || "",
    profession_levels: Object.fromEntries(professionLinks.map((entry) => [entry.profession_id, entry.seniority_level || ""])),
    include_keywords: (search.include_keywords || []).join(", "),
    exclude_keywords: (search.exclude_keywords || []).join(", "),
    locations: (search.locations || []).join(", "),
    work_modes: search.work_modes || [],
    days_of_week: search.days_of_week || WEEK_DAYS.map(([day]) => day),
    use_all_sources: search.use_all_sources,
    source_ids: sourceLinks.map((entry) => entry.source_id),
    priority: search.priority,
    is_active: search.is_active,
  };
  const currentMatches = matches.filter((entry) => entry.is_current);

  async function toggleActive() {
    setBusy(true);
    setMessage("");
    try {
      await onSave(search.id, { ...initial, is_active: !search.is_active });
    } catch {
      setMessage("Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Eliminare questa ricerca e le sue associazioni?")) return;
    setBusy(true);
    try { await onDelete(search.id); }
    catch { setMessage("Eliminazione non riuscita."); setBusy(false); }
  }

  return (
    <article className={`saved-search-card ${search.is_active ? "" : "archived"}`}>
      <div className="saved-search-summary">
        <div className="search-priority"><b>{search.priority}</b><span>PRIORITÀ</span></div>
        <div>
          <span className="search-state">{search.is_active ? "ATTIVA" : "SOSPESA"}</span>
          <h3>{search.name}</h3>
          <p>{search.description || "Ricerca professionale personalizzata"}</p>
          <div className="search-chip-row">
            {professionLinks.slice(0, 5).map((link) => <span key={link.profession_id}>{professionMap[link.profession_id]?.name || "Professione"}</span>)}
            {professionLinks.length > 5 && <span>+{professionLinks.length - 5}</span>}
          </div>
        </div>
        <div className="search-stats">
          <strong>{currentMatches.length}</strong><span>RISULTATI ATTUALI</span>
          <small>{search.last_checked_at ? `Aggiornata ${formatDate(search.last_checked_at)}` : "Prima scansione in attesa"}</small>
        </div>
      </div>
      <div className="search-meta">
        <span>{(search.days_of_week || []).map((day) => WEEK_DAYS.find(([value]) => value === day)?.[1]).join(" · ")}</span>
        <span>{search.use_all_sources ? "Tutte le fonti attive" : sourceLinks.map((link) => sourceMap[link.source_id]?.name).filter(Boolean).join(", ")}</span>
        {!!search.locations?.length && <span>{search.locations.join(", ")}</span>}
      </div>
      <div className="profession-actions">
        <button type="button" onClick={() => setOpen((value) => !value)}>{open ? "Chiudi risultati" : "Apri risultati"}</button>
        <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Chiudi modifica" : "Modifica"}</button>
        <button type="button" onClick={toggleActive} disabled={busy}>{search.is_active ? "Sospendi" : "Riattiva"}</button>
        <button type="button" className="delete-studio" onClick={remove} disabled={busy}>Elimina</button>
      </div>
      {message && <span className="studio-message profession-message" role="status">{message}</span>}
      {editing && <SearchEditor initial={initial} professions={professions} studios={studios} submitLabel="Salva modifiche" onSubmit={async (values) => { await onSave(search.id, values); setEditing(false); }} />}
      {open && (
        <div className="search-results">
          {!currentMatches.length ? <div className="search-results-empty">Nessun risultato associato. La prima scansione userà questa configurazione.</div> : currentMatches.map((match) => {
            const item = opportunityMap[match.opportunity_id];
            if (!item) return null;
            const url = safeExternalUrl(item.url || item.sourceUrl || item.link);
            return <article key={match.opportunity_id}><div><span>{AREAS[item.area]?.label || item.area}</span><h4>{item.title}</h4><p>{item.org} · {item.location || "Località non indicata"}</p></div>{url && <a href={url} target="_blank" rel="noreferrer">Apri ↗</a>}</article>;
          })}
        </div>
      )}
    </article>
  );
}

function ProfessionsVault({ professions, onCreate, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_PROFESSION });
  const [filter, setFilter] = useState("active");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const normalizedName = form.name.trim().toLocaleLowerCase("it");
    if (
      professions.some(
        (entry) => entry.name.trim().toLocaleLowerCase("it") === normalizedName,
      )
    ) {
      setMessage("Questa professione è già monitorata.");
      return;
    }
    setBusy(true);
    try {
      await onCreate(form);
      setForm({ ...EMPTY_PROFESSION });
      setMessage("Professione aggiunta al radar quotidiano.");
    } catch (saveError) {
      setMessage(
        saveError?.code === "23505"
          ? "Questa professione è già monitorata."
          : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }

  const activeCount = professions.filter((entry) => entry.is_active).length;
  const suspendedCount = professions.length - activeCount;
  const needle = query.trim().toLocaleLowerCase("it");
  const visible = professions.filter((entry) => {
    if (filter === "active" && !entry.is_active) return false;
    if (filter === "suspended" && entry.is_active) return false;
    const categoryLabel =
      PROFESSION_CATEGORIES.find(([value]) => value === entry.category)?.[1] || "";
    return (
      !needle ||
      [entry.name, categoryLabel, entry.notes].some((value) =>
        String(value || "").toLocaleLowerCase("it").includes(needle),
      )
    );
  });

  return (
    <section className="professions-section">
      <div className="section-title studio-title">
        <div>
          <p className="eyebrow">RADAR PROFESSIONALE</p>
          <h2>Ruoli VFX e AI da monitorare</h2>
          <p>
            Le professioni attive ampliano la ricerca quotidiana senza modificare le fonti già presenti.
          </p>
        </div>
        <strong>{activeCount} ATTIVE</strong>
      </div>

      <details className="collapsible-panel create-panel profession-create">
        <summary><strong>Aggiungi un altro ruolo</strong><span>Modulo professione aggiuntiva</span></summary>
        <form className="studio-create collapsible-content" onSubmit={handleSubmit}>
          <div className="studio-create-head">
          <div>
            <p className="eyebrow">PROFESSIONE AGGIUNTIVA</p>
            <h3>Aggiungi un altro ruolo</h3>
          </div>
          <small>Runner e Trainee non entrano nella scala</small>
          </div>
          <div className="studio-form-grid">
          <label>
            <span>Nome della professione</span>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Es. Creature TD"
              maxLength="200"
              required
            />
          </label>
          <label>
            <span>Categoria</span>
            <select name="category" value={form.category} onChange={updateField}>
              {PROFESSION_CATEGORIES.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Livello iniziale, facoltativo</span>
            <select
              name="seniority_level"
              value={form.seniority_level}
              onChange={updateField}
            >
              <option value="">Da definire</option>
              {SENIORITY_LEVELS.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Note</span>
            <input
              name="notes"
              value={form.notes}
              onChange={updateField}
              placeholder="Varianti del titolo o indicazioni utili"
              maxLength="1000"
            />
          </label>
          </div>
          <div className="studio-create-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Salvataggio…" : "Aggiungi professione"}
            </button>
            {message && <span role="status">{message}</span>}
          </div>
        </form>
      </details>

      <SeniorityLegend />

      <div className="studio-toolbar">
        <div className="studio-tabs" role="tablist" aria-label="Filtra professioni monitorate">
          <button type="button" role="tab" aria-selected={filter === "active"} className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Attive <b>{activeCount}</b></button>
          <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tutte <b>{professions.length}</b></button>
          <button type="button" role="tab" aria-selected={filter === "suspended"} className={filter === "suspended" ? "active" : ""} onClick={() => setFilter("suspended")}>Sospese <b>{suspendedCount}</b></button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca professione o categoria…"
          aria-label="Cerca professioni monitorate"
        />
      </div>

      <div className="profession-groups">
        {PROFESSION_CATEGORIES.map(([category, label]) => {
          const entries = visible.filter((entry) => entry.category === category);
          if (!entries.length) return null;
          return (
            <details className="profession-group" key={category} open={needle ? true : undefined}>
              <summary>
                <h3>{label}</h3>
                <span>{entries.length}</span>
              </summary>
              <div className="profession-list">
                {entries.map((profession) => (
                  <ProfessionCard
                    key={profession.id}
                    profession={profession}
                    onSave={onSave}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </details>
          );
        })}
        {!visible.length && (
          <div className="studio-empty">
            <strong>Nessuna professione in questa vista</strong>
            <span>Modifica il filtro o aggiungi un ruolo con il modulo qui sopra.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfessionCard({ profession, onSave, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(changes) {
    setBusy(true);
    setMessage("");
    try {
      await onSave(profession.id, {
        name: profession.name,
        category: profession.category,
        seniority_level: profession.seniority_level || "",
        notes: profession.notes || "",
        is_active: profession.is_active,
        ...changes,
      });
    } catch {
      setMessage("Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Eliminare definitivamente questa professione aggiunta?")) return;
    setBusy(true);
    try {
      await onDelete(profession.id);
    } catch {
      setMessage("Eliminazione non riuscita.");
      setBusy(false);
    }
  }

  const currentLevel = profession.seniority_level || 0;
  const currentLabel =
    SENIORITY_LEVELS.find(([value]) => value === currentLevel)?.[1] || "Da definire";
  const builtIn = profession.sort_order <= 38;

  return (
    <article className={`profession-card ${profession.is_active ? "" : "archived"}`}>
      <div className="profession-main">
        <div className="studio-status">
          <i />
          <span>{profession.is_active ? "ATTIVA" : "SOSPESA"}</span>
        </div>
        <div className="profession-copy">
          <h4>{profession.name}</h4>
          {(PROFESSION_HINTS[profession.name] || profession.notes) && (
            <p>{PROFESSION_HINTS[profession.name] || profession.notes}</p>
          )}
        </div>
        <div className="seniority-block">
          <span>SENIORITY</span>
          <div className="seniority-dots" aria-label={`Livello ${currentLabel}`}>
            {SENIORITY_LEVELS.map(([level, label]) => (
              <button
                type="button"
                key={level}
                className={level <= currentLevel ? "filled" : ""}
                aria-label={`${profession.name}: ${label}`}
                title={label}
                disabled={busy}
                onClick={() => save({ seniority_level: level })}
              />
            ))}
          </div>
          <strong>{currentLabel}{profession.is_direction ? " · livello personale facoltativo" : ""}</strong>
        </div>
      </div>
      <div className="profession-actions">
        {currentLevel > 0 && (
          <button type="button" onClick={() => save({ seniority_level: "" })} disabled={busy}>Azzera livello</button>
        )}
        <button type="button" onClick={() => save({ is_active: !profession.is_active })} disabled={busy}>
          {profession.is_active ? "Sospendi" : "Riattiva"}
        </button>
        {!builtIn && <button type="button" className="delete-studio" onClick={handleDelete} disabled={busy}>Elimina</button>}
      </div>
      {message && <span className="studio-message profession-message" role="status">{message}</span>}
    </article>
  );
}

function StudiosVault({ studios, onCreate, onSave, onMarkChecked, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_STUDIO });
  const [filter, setFilter] = useState("active");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArea(area) {
    setForm((current) => ({
      ...current,
      focus_areas: current.focus_areas.includes(area)
        ? current.focus_areas.filter((value) => value !== area)
        : [...current.focus_areas, area],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (!form.focus_areas.length) {
      setMessage("Seleziona almeno un’area.");
      return;
    }
    const normalizedUrl = normalizedSourceUrl(form.website_url);
    const duplicate = studios.some(
      (entry) => normalizedSourceUrl(entry.website_url) === normalizedUrl,
    );
    if (normalizedUrl && duplicate) {
      setMessage("Questa fonte è già monitorata.");
      return;
    }
    setBusy(true);
    try {
      await onCreate(form);
      setForm({ ...EMPTY_STUDIO });
      setMessage("Fonte aggiunta al monitoraggio quotidiano.");
    } catch (saveError) {
      setMessage(
        saveError?.code === "23505"
          ? "Questa fonte è già monitorata."
          : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = studios
    .filter((entry) => {
      if (filter === "active") return entry.is_active;
      if (filter === "archived") return !entry.is_active;
      return true;
    })
    .filter(
      (entry) =>
        !needle ||
        [entry.name, entry.location, entry.notes].some((value) =>
          String(value || "").toLowerCase().includes(needle),
        ),
    )
    .sort((a, b) => {
      const aDate = a.next_check_date || "9999-12-31";
      const bDate = b.next_check_date || "9999-12-31";
      return aDate.localeCompare(bDate) || a.name.localeCompare(b.name);
    });

  const activeCount = studios.filter((entry) => entry.is_active).length;
  const archivedCount = studios.length - activeCount;

  return (
    <section className="studios-section">
      <div className="section-title studio-title">
        <div>
          <p className="eyebrow">RADAR PRIVATO</p>
          <h2>Siti e fonti da controllare</h2>
          <p>Ogni fonte attiva entra automaticamente nella ricerca del report giornaliero.</p>
        </div>
        <strong>{activeCount} ATTIVI</strong>
      </div>

      <details className="collapsible-panel create-panel">
        <summary><strong>Aggiungi sito o fonte</strong><span>Nuovo monitoraggio</span></summary>
        <form className="studio-create collapsible-content" onSubmit={handleSubmit}>
          <div className="studio-create-head">
          <div>
            <p className="eyebrow">NUOVO MONITORAGGIO</p>
            <h3>Aggiungi sito o fonte</h3>
          </div>
          <small>Privato · collegato al radar delle 7:30</small>
          </div>
          <div className="studio-form-grid">
          <label>
            <span>Nome del sito o della fonte</span>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Es. 22DOGS Careers"
              maxLength="200"
              required
            />
          </label>
          <label>
            <span>Località</span>
            <input
              name="location"
              value={form.location}
              onChange={updateField}
              placeholder="Es. Milano, Italia"
              maxLength="300"
            />
          </label>
          <label>
            <span>Link da monitorare</span>
            <input
              type="url"
              name="website_url"
              value={form.website_url}
              onChange={updateField}
              placeholder="https://…"
              required
            />
          </label>
          <label>
            <span>Prossimo controllo</span>
            <input
              type="date"
              name="next_check_date"
              value={form.next_check_date}
              onChange={updateField}
            />
          </label>
          <fieldset className="wide material-area-picker">
            <legend>Tipologia, selezionane una o più</legend>
            {MATERIAL_AREAS.map(([value, label, tone]) => (
              <label className={tone} key={value}>
                <input
                  type="checkbox"
                  checked={form.focus_areas.includes(value)}
                  onChange={() => toggleArea(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="wide">
            <span>Note</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows="3"
              maxLength="5000"
              placeholder="Pagina careers, tipo di opportunità, indicazioni utili per la ricerca…"
            />
          </label>
          </div>
          <div className="studio-create-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Salvataggio…" : "Aggiungi fonte"}
            </button>
            {message && <span role="status">{message}</span>}
          </div>
        </form>
      </details>

      <div className="studio-toolbar">
      <div className="studio-tabs" role="tablist" aria-label="Filtra fonti monitorate">
        <button type="button" role="tab" aria-selected={filter === "active"} className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Attivi <b>{activeCount}</b></button>
        <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tutti <b>{studios.length}</b></button>
        <button type="button" role="tab" aria-selected={filter === "archived"} className={filter === "archived" ? "active" : ""} onClick={() => setFilter("archived")}>Sospese <b>{archivedCount}</b></button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca sito, fonte o località…"
          aria-label="Cerca fonti monitorate"
        />
      </div>

      <details className="collapsible-panel list-panel" open>
        <summary><strong>Fonti monitorate</strong><span>{visible.length}</span></summary>
        <div className="studio-list collapsible-content">
        {visible.map((studio) => (
          <StudioCard
            key={studio.id}
            studio={studio}
            onSave={onSave}
            onMarkChecked={onMarkChecked}
            onDelete={onDelete}
          />
        ))}
        {!visible.length && (
          <div className="studio-empty">
            <strong>Nessuna fonte in questa vista</strong>
            <span>Aggiungi il primo sito da monitorare con il modulo qui sopra.</span>
          </div>
        )}
        </div>
      </details>
    </section>
  );
}

function StudioCard({ studio, onSave, onMarkChecked, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: studio.name,
    website_url: studio.website_url || "",
    focus_areas: studio.focus_areas || [],
    location: studio.location || "",
    notes: studio.notes || "",
    next_check_date: studio.next_check_date || "",
    is_active: studio.is_active,
  });

  useEffect(() => {
    setForm({
      name: studio.name,
      website_url: studio.website_url || "",
      focus_areas: studio.focus_areas || [],
      location: studio.location || "",
      notes: studio.notes || "",
      next_check_date: studio.next_check_date || "",
      is_active: studio.is_active,
    });
  }, [studio]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArea(area) {
    setForm((current) => ({
      ...current,
      focus_areas: current.focus_areas.includes(area)
        ? current.focus_areas.filter((value) => value !== area)
        : [...current.focus_areas, area],
    }));
  }

  async function save(values, close = true) {
    if (!values.focus_areas.length) {
      setMessage("Seleziona almeno un’area.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSave(studio.id, values);
      setMessage("Modifiche salvate.");
      if (close) setEditing(false);
    } catch (saveError) {
      setMessage(
        saveError?.code === "23505"
          ? "Questa fonte o questo link è già monitorato."
          : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await save(form);
  }

  async function handleToggleActive() {
    await save({ ...form, is_active: !studio.is_active }, false);
  }

  async function handleChecked() {
    setBusy(true);
    setMessage("");
    try {
      await onMarkChecked(studio);
      setMessage("Controllo della fonte registrato. Promemoria chiuso.");
    } catch {
      setMessage("Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Eliminare definitivamente questa fonte monitorata?")) return;
    setBusy(true);
    setMessage("");
    try {
      await onDelete(studio.id);
    } catch {
      setMessage("Eliminazione non riuscita.");
      setBusy(false);
    }
  }

  const timing = reminderTiming(studio.next_check_date);
  const websiteUrl = safeExternalUrl(studio.website_url);

  return (
    <article className={`studio-card ${studio.is_active ? "" : "archived"}`}>
      <div className="studio-card-main">
        <div className="studio-status">
          <i />
          <span>{studio.is_active ? "ATTIVO" : "ARCHIVIATO"}</span>
        </div>
        <div>
          <h3>{studio.name}</h3>
          <p>{studio.location || "Località non indicata"}</p>
          <div className="material-tags">
            {MATERIAL_AREAS.filter(([value]) => studio.focus_areas.includes(value)).map(
              ([value, label, tone]) => <span className={tone} key={value}>{label}</span>,
            )}
          </div>
          {studio.notes && <p className="studio-notes">{studio.notes}</p>}
        </div>
        <div className={`studio-check ${timing?.tone || "future"}`}>
          <span>PROSSIMO CONTROLLO FONTE</span>
          <strong>{studio.next_check_date ? formatDate(studio.next_check_date) : "Non programmato"}</strong>
          {timing && <small>{timing.label}</small>}
          {studio.last_checked_at && <em>Ultimo: {formatDate(studio.last_checked_at)}</em>}
        </div>
      </div>
      <div className="studio-card-actions">
        {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer">Apri sito ↗</a>}
        {studio.next_check_date && <button type="button" onClick={handleChecked} disabled={busy}>Controllata oggi</button>}
        <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Chiudi" : "Modifica"}</button>
        <button type="button" onClick={handleToggleActive} disabled={busy}>{studio.is_active ? "Sospendi" : "Riattiva"}</button>
        <button type="button" className="delete-studio" onClick={handleDelete} disabled={busy}>Elimina</button>
      </div>
      {message && <span className="studio-message" role="status">{message}</span>}
      {editing && (
        <form className="studio-edit" onSubmit={handleSubmit}>
          <label><span>Nome della fonte</span><input name="name" value={form.name} onChange={updateField} required /></label>
          <label><span>Località</span><input name="location" value={form.location} onChange={updateField} /></label>
          <label><span>Link da monitorare</span><input type="url" name="website_url" value={form.website_url} onChange={updateField} required /></label>
          <label><span>Prossimo controllo</span><input type="date" name="next_check_date" value={form.next_check_date} onChange={updateField} /></label>
          <fieldset className="wide material-area-picker">
            <legend>Tipologia</legend>
            {MATERIAL_AREAS.map(([value, label, tone]) => (
              <label className={tone} key={value}>
                <input type="checkbox" checked={form.focus_areas.includes(value)} onChange={() => toggleArea(value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="wide"><span>Note</span><textarea name="notes" value={form.notes} onChange={updateField} rows="3" /></label>
          <div className="wide studio-edit-actions"><button type="submit" disabled={busy}>{busy ? "Salvataggio…" : "Salva modifiche"}</button></div>
        </form>
      )}
    </article>
  );
}

function MaterialVault({ materials, onCreate, onSave, onDelete, onDownload }) {
  const [form, setForm] = useState({ ...EMPTY_MATERIAL });
  const [file, setFile] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArea(area) {
    setForm((current) => ({
      ...current,
      areas: current.areas.includes(area)
        ? current.areas.filter((value) => value !== area)
        : [...current.areas, area],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    if (!form.areas.length) {
      setMessage("Seleziona almeno un’area.");
      return;
    }
    if (!file && !form.url.trim()) {
      setMessage("Scegli un file oppure inserisci un link.");
      return;
    }
    setBusy(true);
    try {
      await onCreate(form, file);
      setForm({ ...EMPTY_MATERIAL });
      setFile(null);
      formElement.reset();
      setMessage("Materiale aggiunto e protetto.");
    } catch (uploadError) {
      setMessage(uploadError?.message || "Caricamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  const visible =
    filter === "all"
      ? materials
      : materials.filter((entry) => entry.areas.includes(filter));

  return (
    <section className="materials-section">
      <div className="section-title material-title">
        <div>
          <p className="eyebrow">ARCHIVIO PRIVATO</p>
          <h2>Material Vault</h2>
          <p>Un solo file può essere collegato a più aree, senza duplicazioni.</p>
        </div>
        <strong>{materials.length} MATERIALI</strong>
      </div>

      <details className="collapsible-panel create-panel">
        <summary><strong>Carica file o collega risorsa</strong><span>Nuovo materiale</span></summary>
        <form className="material-create collapsible-content" onSubmit={handleSubmit}>
          <div className="material-create-head">
          <div>
            <p className="eyebrow">NUOVO MATERIALE</p>
            <h3>Carica file o collega risorsa</h3>
          </div>
          <small>Privato · massimo 25 MB per file</small>
          </div>
          <div className="material-form-grid">
          <label>
            <span>Nome</span>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Es. Showreel compositing 2026"
              maxLength="200"
              required
            />
          </label>
          <label>
            <span>Tipo</span>
            <select name="material_type" value={form.material_type} onChange={updateField}>
              {MATERIAL_TYPES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Versione</span>
            <input
              name="version_label"
              value={form.version_label}
              onChange={updateField}
              placeholder="Es. IT 2026 / v2"
              maxLength="100"
            />
          </label>
          <label>
            <span>File</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.doc,.docx,.txt"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="wide">
            <span>Link esterno, utile per video grandi</span>
            <input
              type="url"
              name="url"
              value={form.url}
              onChange={updateField}
              placeholder="https://…"
            />
          </label>
          <fieldset className="wide material-area-picker">
            <legend>Aree, selezionane una o più</legend>
            {MATERIAL_AREAS.map(([value, label, tone]) => (
              <label className={tone} key={value}>
                <input
                  type="checkbox"
                  checked={form.areas.includes(value)}
                  onChange={() => toggleArea(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="wide">
            <span>Note</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows="3"
              maxLength="5000"
              placeholder="Contenuto, destinazione, aggiornamenti da fare…"
            />
          </label>
          </div>
          <div className="material-create-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Caricamento…" : "Aggiungi materiale"}
            </button>
            {message && <span role="status">{message}</span>}
          </div>
        </form>
      </details>

      <div className="material-tabs" role="tablist" aria-label="Filtra materiali">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Tutti <b>{materials.length}</b>
        </button>
        {MATERIAL_AREAS.map(([value, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
            key={value}
          >
            {label} <b>{materials.filter((entry) => entry.areas.includes(value)).length}</b>
          </button>
        ))}
      </div>

      <details className="collapsible-panel list-panel" open>
        <summary><strong>Materiali</strong><span>{visible.length}</span></summary>
        <div className="material-list collapsible-content">
        {visible.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            onSave={onSave}
            onDelete={onDelete}
            onDownload={onDownload}
          />
        ))}
        {!visible.length && (
          <div className="material-empty">
            <strong>Nessun materiale in questa area</strong>
            <span>Usa il modulo qui sopra per aggiungere il primo.</span>
          </div>
        )}
        </div>
      </details>
    </section>
  );
}

function MaterialCard({ material, onSave, onDelete, onDownload }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: material.name,
    material_type: material.material_type,
    areas: material.areas || [],
    url: material.url || "",
    version_label: material.version_label || "",
    notes: material.notes || "",
  });
  const materialUrl = safeExternalUrl(material.url);

  useEffect(() => {
    setForm({
      name: material.name,
      material_type: material.material_type,
      areas: material.areas || [],
      url: material.url || "",
      version_label: material.version_label || "",
      notes: material.notes || "",
    });
  }, [material]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleArea(area) {
    setForm((current) => ({
      ...current,
      areas: current.areas.includes(area)
        ? current.areas.filter((value) => value !== area)
        : [...current.areas, area],
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form.areas.length) {
      setMessage("Seleziona almeno un’area.");
      return;
    }
    if (!material.storage_path && !form.url.trim()) {
      setMessage("Questo materiale richiede un link esterno.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSave(material.id, form);
      setMessage("Modifiche salvate.");
      setEditing(false);
    } catch {
      setMessage("Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Eliminare questo materiale e il suo file privato?")) return;
    setBusy(true);
    setMessage("");
    try {
      await onDelete(material);
    } catch {
      setMessage("Eliminazione non riuscita.");
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    setMessage("");
    try {
      await onDownload(material);
    } catch {
      setMessage("Download non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="material-card">
      <div className="material-card-main">
        <div className="material-icon">{material.storage_path ? "FILE" : "LINK"}</div>
        <div>
          <div className="material-meta">
            <span>{material.material_type}</span>
            {material.version_label && <span>{material.version_label}</span>}
          </div>
          <h3>{material.name}</h3>
          <div className="material-tags">
            {MATERIAL_AREAS.filter(([value]) => material.areas.includes(value)).map(
              ([value, label, tone]) => <span className={tone} key={value}>{label}</span>,
            )}
          </div>
          {material.notes && <p>{material.notes}</p>}
        </div>
      </div>
      <div className="material-card-actions">
        {material.storage_path && (
          <button type="button" onClick={handleDownload} disabled={busy}>Scarica</button>
        )}
        {materialUrl && (
          <a href={materialUrl} target="_blank" rel="noreferrer">Apri link ↗</a>
        )}
        <button type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? "Chiudi" : "Modifica"}
        </button>
        <button type="button" className="delete-material" onClick={handleDelete} disabled={busy}>
          Elimina
        </button>
      </div>
      {message && <span className="material-message" role="status">{message}</span>}
      {editing && (
        <form className="material-edit" onSubmit={handleSave}>
          <label>
            <span>Nome</span>
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label>
            <span>Tipo</span>
            <select name="material_type" value={form.material_type} onChange={updateField}>
              {MATERIAL_TYPES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Versione</span>
            <input name="version_label" value={form.version_label} onChange={updateField} />
          </label>
          <label>
            <span>Link esterno</span>
            <input type="url" name="url" value={form.url} onChange={updateField} />
          </label>
          <fieldset className="wide material-area-picker">
            <legend>Aree</legend>
            {MATERIAL_AREAS.map(([value, label, tone]) => (
              <label className={tone} key={value}>
                <input type="checkbox" checked={form.areas.includes(value)} onChange={() => toggleArea(value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="wide">
            <span>Note</span>
            <textarea name="notes" value={form.notes} onChange={updateField} rows="3" />
          </label>
          <div className="wide material-edit-actions">
            <button type="submit" disabled={busy}>{busy ? "Salvataggio…" : "Salva modifiche"}</button>
          </div>
        </form>
      )}
    </article>
  );
}

function ApplicationsBoard({
  applications,
  opportunityMap,
  onSave,
  onDelete,
}) {
  if (!applications.length) {
    return (
      <section className="application-empty">
        <p className="eyebrow">KANBAN PRIVATO</p>
        <h2>Nessuna candidatura ancora inserita</h2>
        <p>
          Apri un’opportunità, premi il pulsante + e scegli “Aggiungi alle
          candidature”. Comparirà qui nel percorso operativo.
        </p>
      </section>
    );
  }

  return (
    <section className="applications-section">
      <div className="section-title application-title">
        <div>
          <p className="eyebrow">KANBAN PRIVATO</p>
          <h2>Percorso candidature</h2>
        </div>
        <strong>{applications.length} TOTALI</strong>
      </div>
      <div className="application-board">
        {APPLICATION_COLUMNS.map((column) => {
          const entries = applications.filter((entry) =>
            column.statuses.includes(entry.status),
          );
          return (
            <details className="application-column" key={column.id}>
              <summary>
                <h3>{column.label}</h3>
                <span>{entries.length}</span>
              </summary>
              <div className="application-stack">
                {entries.map((entry) => (
                  <ApplicationCard
                    key={entry.id}
                    application={entry}
                    opportunity={opportunityMap[entry.opportunity_id]}
                    onSave={onSave}
                    onDelete={onDelete}
                  />
                ))}
                {!entries.length && <p>Nessuna candidatura</p>}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ApplicationCard({ application, opportunity, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ ...EMPTY_APPLICATION });

  useEffect(() => {
    setForm({
      status: application.status,
      priority: application.priority ?? "",
      notes: application.notes || "",
      application_date: application.application_date || "",
      deadline: application.deadline || "",
      follow_up_date: application.follow_up_date || "",
      application_url: application.application_url || "",
      contact_name: application.contact_name || "",
      contact_email: application.contact_email || "",
    });
  }, [application]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(values = form) {
    setBusy(true);
    setMessage("");
    try {
      await onSave(application.opportunity_id, values);
      setMessage("Salvato");
    } catch {
      setMessage("Salvataggio non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(event) {
    const status = event.target.value;
    const next = { ...form, status };
    setForm(next);
    await save(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await save();
  }

  async function handleDelete() {
    if (!window.confirm("Rimuovere questa candidatura dal Kanban?")) return;
    setBusy(true);
    setMessage("");
    try {
      await onDelete(application.opportunity_id);
    } catch {
      setMessage("Rimozione non riuscita");
      setBusy(false);
    }
  }

  const timing = reminderTiming(application.follow_up_date);
  const destination =
    application.application_url ||
    opportunity?.directApplyUrl ||
    opportunity?.applicationUrl ||
    opportunity?.sourceUrl;
  const safeDestination = safeExternalUrl(destination);

  return (
    <article className="application-card">
      <div className="application-card-head">
        <span className={`area ${(AREAS[opportunity?.area] || {}).tone || "neutral"}`}>
          {(AREAS[opportunity?.area] || {}).short || "ALTRO"}
        </span>
        {application.priority && <b>P{application.priority}</b>}
      </div>
      <h4>{opportunity?.title || application.opportunity_id}</h4>
      <p>{opportunity?.org || "Opportunità non più presente nel feed"}</p>
      <label className="quick-status">
        <span>Stato</span>
        <select
          value={form.status}
          onChange={handleStatus}
          disabled={busy}
          aria-label="Sposta candidatura"
        >
          {APPLICATION_STATUSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="application-dates">
        {application.deadline && (
          <span>Scadenza {formatDate(application.deadline)}</span>
        )}
        {application.follow_up_date && (
          <span className={timing?.tone || ""}>
            Follow-up {formatDate(application.follow_up_date)}
          </span>
        )}
      </div>
      <div className="application-card-actions">
        <button type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? "Chiudi" : "Dettagli"}
        </button>
        {safeDestination && (
          <a href={safeDestination} target="_blank" rel="noreferrer">
            Apri ↗
          </a>
        )}
      </div>
      {editing && (
        <form className="application-form" onSubmit={handleSubmit}>
          <label>
            <span>Priorità</span>
            <select name="priority" value={form.priority} onChange={updateField}>
              <option value="">Non assegnata</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Data invio</span>
            <input
              type="date"
              name="application_date"
              value={form.application_date}
              onChange={updateField}
            />
          </label>
          <label>
            <span>Scadenza</span>
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={updateField}
            />
          </label>
          <label>
            <span>Follow-up</span>
            <input
              type="date"
              name="follow_up_date"
              value={form.follow_up_date}
              onChange={updateField}
            />
          </label>
          <label>
            <span>Referente</span>
            <input
              name="contact_name"
              value={form.contact_name}
              onChange={updateField}
              maxLength="200"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="contact_email"
              value={form.contact_email}
              onChange={updateField}
              maxLength="320"
            />
          </label>
          <label className="wide">
            <span>URL candidatura</span>
            <input
              type="url"
              name="application_url"
              value={form.application_url}
              onChange={updateField}
            />
          </label>
          <label className="wide">
            <span>Note</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows="4"
              maxLength="5000"
            />
          </label>
          <div className="application-form-actions wide">
            <button type="submit" disabled={busy}>
              {busy ? "Salvataggio…" : "Salva candidatura"}
            </button>
            <button
              type="button"
              className="delete-application"
              onClick={handleDelete}
              disabled={busy}
            >
              Rimuovi
            </button>
            {message && <span role="status">{message}</span>}
          </div>
        </form>
      )}
    </article>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
