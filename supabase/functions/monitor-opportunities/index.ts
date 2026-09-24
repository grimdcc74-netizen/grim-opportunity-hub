import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_SOURCES_PER_RUN = 30;
const MAX_CANDIDATES_PER_SOURCE = 120;
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "GRIM-Opportunity-Hub/1.0 (+private-public-source-monitor)";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-grim-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Json = Record<string, unknown>;
type Candidate = {
  title: string;
  url: string;
  organization?: string;
  summary?: string;
  location?: string;
  country?: string;
  deadline?: string;
  datePosted?: string;
  type?: string;
  parser: string;
};

type RomeClock = {
  date: string;
  weekday: number;
  hour: number;
  minute: number;
};

const ROLE_ALIASES: Record<string, string[]> = {
  "3d modeler": ["3d modeller", "modeling artist", "modelling artist"],
  "look dev artist": ["look development artist", "lookdev artist", "lookdev"],
  "texture painter": ["texturing artist", "texture painting artist"],
  "environment generalist td": ["environment td", "environment generalist"],
  "matte painter / environment generalist": [
    "matte painter environment generalist",
    "digital matte painter environment",
    "dmp environment",
  ],
  "real-time environment artist": ["realtime environment artist"],
  "fx td": ["effects technical director", "fx technical director"],
  "houdini fx operator": ["houdini artist", "houdini fx artist"],
  "lighting td": ["lighting technical director", "lighting artist"],
  "vfx 3d/render operator": ["3d render operator", "render operator"],
  "matte painter": ["digital matte painter", "dmp artist"],
  compositor: ["compositing artist"],
  "rotoscope artist": ["roto artist", "rotoscoping artist"],
  "lead generative ai artist": ["lead genai artist", "generative ai lead"],
  "ai creative specialist": ["creative ai specialist"],
  "visual development artist, ai & generative tools": [
    "ai visual development artist",
    "generative visual development artist",
  ],
  "ai workflow specialist": ["generative ai workflow specialist"],
  "ai integrator": ["generative ai integrator"],
  "ai-enhanced vfx specialist": ["ai vfx specialist", "ai enhanced vfx"],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanText(value: unknown, max = 4000) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizedText(value: unknown) {
  return cleanText(value, 20_000)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: string, base?: string) {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every((value) => Number.isInteger(value))) {
    return (
      parts[0] === 0 ||
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] >= 224
    );
  }
  return false;
}

function assertPublicUrl(value: string) {
  const normalized = normalizeUrl(value);
  if (!normalized) throw new Error("INVALID_URL");
  const url = new URL(normalized);
  if (isBlockedHostname(url.hostname)) throw new Error("BLOCKED_HOST");
  return normalized;
}

async function fetchPublicUrl(initialUrl: string) {
  let current = assertPublicUrl(initialUrl);
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/json;q=0.9,*/*;q=0.5",
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const target = response.headers.get("location");
      if (!target) throw new Error("REDIRECT_WITHOUT_LOCATION");
      current = assertPublicUrl(new URL(target, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_TOO_LARGE");
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error("RESPONSE_TOO_LARGE");
    }
    return {
      text,
      url: current,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
    };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

function locationFromJson(value: unknown): { location?: string; country?: string } {
  if (!value) return {};
  if (typeof value === "string") return { location: cleanText(value, 500) };
  if (Array.isArray(value)) {
    const parts = value.map(locationFromJson).filter((entry) => entry.location);
    return {
      location: parts.map((entry) => entry.location).join("; ").slice(0, 500),
      country: parts.find((entry) => entry.country)?.country,
    };
  }
  const object = value as Json;
  const address = (object.address || object.jobLocation || object.location) as Json | string | undefined;
  if (typeof address === "string") return { location: cleanText(address, 500) };
  const addressObject = (address || object) as Json;
  const city = cleanText(addressObject.addressLocality || addressObject.city, 150);
  const region = cleanText(addressObject.addressRegion || addressObject.region, 150);
  const countryValue = addressObject.addressCountry || addressObject.country;
  const country = cleanText(
    typeof countryValue === "object" && countryValue
      ? (countryValue as Json).name
      : countryValue,
    150,
  );
  return { location: [city, region, country].filter(Boolean).join(", "), country: country || undefined };
}

function candidateFromObject(object: Json, baseUrl: string, parser: string): Candidate | null {
  const title = cleanText(
    object.title || object.name || object.position || object.jobTitle || object.headline,
    500,
  );
  const rawUrl = cleanText(
    object.url || object.link || object.directApplyUrl || object.applyUrl || object.applicationUrl || object.canonicalUrl || object.sourceUrl || object.absolute_url,
    2000,
  );
  const url = normalizeUrl(rawUrl || baseUrl, baseUrl);
  if (!title || !url) return null;
  const hiring = (object.hiringOrganization || object.organization || object.company || object.org) as Json | string | undefined;
  const organization = cleanText(
    typeof hiring === "object" && hiring ? hiring.name : hiring,
    300,
  );
  const place = locationFromJson(object.jobLocation || object.location || object.address);
  return {
    title,
    url,
    organization: organization || undefined,
    summary: cleanText(object.description || object.summary || object.relevance || object.text, 4000) || undefined,
    location: place.location || undefined,
    country: place.country || undefined,
    deadline: cleanText(object.validThrough || object.deadlineEuropeRome || object.deadline || object.endDate, 80) || undefined,
    datePosted: cleanText(object.datePosted || object.datePublished || object.pubDate, 80) || undefined,
    type: cleanText(object.employmentType || object.type || object["@type"], 150) || undefined,
    parser,
  };
}

function flattenObjects(value: unknown, depth = 0): Json[] {
  if (depth > 5 || value == null) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => flattenObjects(entry, depth + 1));
  if (typeof value !== "object") return [];
  const object = value as Json;
  const candidates = [object];
  for (const key of ["jobs", "items", "results", "data", "opportunities", "positions", "@graph"]) {
    if (key in object) candidates.push(...flattenObjects(object[key], depth + 1));
  }
  return candidates;
}

function extractJsonCandidates(text: string, baseUrl: string) {
  try {
    const parsed = JSON.parse(text);
    return flattenObjects(parsed)
      .map((entry) => candidateFromObject(entry, baseUrl, "json"))
      .filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

function extractJsonLdCandidates(html: string, baseUrl: string) {
  const candidates: Candidate[] = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && candidates.length < MAX_CANDIDATES_PER_SOURCE) {
    const raw = match[1].replace(/<!--|-->/g, "").trim();
    try {
      const parsed = JSON.parse(raw);
      for (const object of flattenObjects(parsed)) {
        const type = normalizedText(object["@type"]);
        if (!type || /jobposting|event|creativework|project/.test(type)) {
          const candidate = candidateFromObject(object, baseUrl, "json-ld");
          if (candidate) candidates.push(candidate);
        }
      }
    } catch {
      // A malformed JSON-LD block must not stop the rest of the page.
    }
  }
  return candidates;
}

function xmlValue(block: string, names: string[]) {
  for (const name of names) {
    const pattern = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
    const match = block.match(pattern);
    if (match) return cleanText(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, ""), 4000);
  }
  return "";
}

function extractFeedCandidates(xml: string, baseUrl: string) {
  const blocks = xml.match(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];
  return blocks.slice(0, MAX_CANDIDATES_PER_SOURCE).map((block) => {
    const title = xmlValue(block, ["title"]);
    const linkTag = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    const rawUrl = linkTag?.[1] || xmlValue(block, ["link", "guid"]);
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!title || !url) return null;
    return {
      title,
      url,
      summary: xmlValue(block, ["description", "summary", "content"]),
      datePosted: xmlValue(block, ["pubDate", "published", "updated"]),
      parser: "rss-atom",
    } as Candidate;
  }).filter(Boolean) as Candidate[];
}

function extractAnchorCandidates(html: string, baseUrl: string) {
  const candidates: Candidate[] = [];
  const pattern = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && candidates.length < MAX_CANDIDATES_PER_SOURCE) {
    const title = cleanText(match[4], 500);
    const url = normalizeUrl(match[2], baseUrl);
    if (!url || title.length < 3 || title.length > 500) continue;
    candidates.push({ title, url, parser: "html-link" });
  }
  return candidates;
}

function dedupeCandidates(candidates: Candidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${normalizeUrl(candidate.url) || candidate.url}|${normalizedText(candidate.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_CANDIDATES_PER_SOURCE);
}

function detectProfessionIds(text: string, professions: Json[]) {
  const haystack = normalizedText(text);
  return professions
    .filter((profession) => {
      const name = String(profession.name || "");
      const normalizedName = normalizedText(name);
      const aliases = ROLE_ALIASES[name.toLocaleLowerCase("en")] || [];
      return [normalizedName, ...aliases.map(normalizedText)]
        .filter((term) => term.length >= 3)
        .some((term) => haystack.includes(term));
    })
    .map((profession) => String(profession.id));
}

function detectSeniority(text: string) {
  const value = normalizedText(text);
  if (/\bhead of (department|dept)\b|\bhod\b/.test(value)) return 6;
  if (/\bsupervisor\b/.test(value)) return 5;
  if (/\blead\b/.test(value)) return 4;
  if (/\bsenior\b|\bsr\b/.test(value)) return 3;
  if (/\bmid level\b|\bmidlevel\b|\bmid\b/.test(value)) return 2;
  if (/\bjunior\b|\bjr\b/.test(value)) return 1;
  return null;
}

function detectWorkMode(text: string) {
  const value = normalizedText(text);
  if (/\bhybrid\b|\bibrid/.test(value)) return "hybrid";
  if (/\bremote\b|\bremot/.test(value)) return "remote";
  if (/\bon site\b|\bonsite\b|\bin sede\b/.test(value)) return "on_site";
  return null;
}

function areaForSource(source: Json) {
  const areas = Array.isArray(source.focus_areas) ? source.focus_areas.map(String) : [];
  if (areas.includes("vfx_cgi_ai")) return "work";
  if (areas.includes("art")) return "art";
  if (areas.includes("street_art_graffiti")) return "graffiti";
  if (areas.includes("photography")) return "photography";
  return "work";
}

function isoDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function romeClock(now = new Date()): RomeClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );
  const weekday = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[parts.weekday];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function inScheduledWindow(clock: RomeClock) {
  const minutes = clock.hour * 60 + clock.minute;
  return minutes >= 7 * 60 + 30 && minutes <= 8 * 60 + 30;
}

function sourceIdsForSearch(search: Json, links: Json[], activeSourceIds: number[]) {
  if (search.use_all_sources) return activeSourceIds;
  return links
    .filter((link) => link.search_id === search.id)
    .map((link) => Number(link.source_id))
    .filter((id) => activeSourceIds.includes(id));
}

function opportunityMatchesSearch(
  opportunity: Json,
  search: Json,
  professionLinks: Json[],
) {
  const links = professionLinks.filter((link) => link.search_id === search.id);
  const detected = new Set((opportunity.detected_profession_ids as string[] || []).map(String));
  const opportunityLevel = opportunity.seniority_level == null ? null : Number(opportunity.seniority_level);
  const roleMatches = links.some((link) => {
    if (!detected.has(String(link.profession_id))) return false;
    const selectedLevel = link.seniority_level == null ? null : Number(link.seniority_level);
    return opportunityLevel == null || selectedLevel == null || opportunityLevel === selectedLevel;
  });
  if (!roleMatches) return false;

  const text = normalizedText([
    opportunity.title,
    opportunity.organization,
    opportunity.summary,
    opportunity.category,
    opportunity.location,
  ].join(" "));
  const include = (search.include_keywords as string[] || []).map(normalizedText).filter(Boolean);
  const exclude = (search.exclude_keywords as string[] || []).map(normalizedText).filter(Boolean);
  if (include.length && !include.some((term) => text.includes(term))) return false;
  if (exclude.some((term) => text.includes(term))) return false;

  const locations = (search.locations as string[] || []).map(normalizedText).filter(Boolean);
  if (locations.length && !locations.some((term) => normalizedText(opportunity.location).includes(term))) return false;

  const modes = (search.work_modes as string[] || []).map(String);
  const detectedMode = String(opportunity.remote_policy || "");
  if (modes.length && detectedMode && !modes.includes(detectedMode)) return false;
  return true;
}

async function scanSource(source: Json, professions: Json[]) {
  const fetched = await fetchPublicUrl(String(source.website_url));
  const isJson = /json/i.test(fetched.contentType) || /^[\s\r\n]*[\[{]/.test(fetched.text);
  const isFeed = /rss|atom|xml/i.test(fetched.contentType) || /<(rss|feed)\b/i.test(fetched.text);
  const extracted = isJson
    ? extractJsonCandidates(fetched.text, fetched.url)
    : isFeed
      ? extractFeedCandidates(fetched.text, fetched.url)
      : [
          ...extractJsonLdCandidates(fetched.text, fetched.url),
          ...extractAnchorCandidates(fetched.text, fetched.url),
        ];
  const candidates = dedupeCandidates(extracted).filter((candidate) => {
    const text = `${candidate.title} ${candidate.summary || ""}`;
    return detectProfessionIds(text, professions).length > 0;
  });
  return { ...fetched, candidates };
}

async function processUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  trigger: "scheduled" | "manual",
  clock: RomeClock,
) {
  let searchQuery = admin
    .from("saved_searches")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (trigger === "scheduled") searchQuery = searchQuery.contains("days_of_week", [clock.weekday]);
  const { data: searches, error: searchError } = await searchQuery;
  if (searchError) throw searchError;
  if (!searches?.length) return { user_id: userId, status: "skipped", reason: "NO_ELIGIBLE_SEARCHES" };

  const [sourcesResult, professionsResult, professionLinksResult, sourceLinksResult] = await Promise.all([
    admin.from("monitored_studios").select("*").eq("user_id", userId).eq("is_active", true).not("website_url", "is", null),
    admin.from("monitored_professions").select("*").eq("user_id", userId).eq("is_active", true),
    admin.from("saved_search_professions").select("*").in("search_id", searches.map((search) => search.id)),
    admin.from("saved_search_sources").select("*").in("search_id", searches.map((search) => search.id)),
  ]);
  for (const result of [sourcesResult, professionsResult, professionLinksResult, sourceLinksResult]) {
    if (result.error) throw result.error;
  }
  const sources = (sourcesResult.data || []).slice(0, MAX_SOURCES_PER_RUN);
  const professions = professionsResult.data || [];
  const professionLinks = professionLinksResult.data || [];
  const sourceLinks = sourceLinksResult.data || [];
  const activeSourceIds = sources.map((source) => Number(source.id));
  const selectedSourceIds = new Set<number>();
  for (const search of searches) {
    for (const id of sourceIdsForSearch(search, sourceLinks, activeSourceIds)) selectedSourceIds.add(id);
  }
  const selectedSources = sources.filter((source) => selectedSourceIds.has(Number(source.id)));

  const { data: run, error: runError } = await admin
    .from("monitoring_runs")
    .insert({
      user_id: userId,
      local_run_date: clock.date,
      run_kind: trigger,
      status: "running",
      sources_total: selectedSources.length,
    })
    .select()
    .single();
  if (runError?.code === "23505" && trigger === "scheduled") {
    return { user_id: userId, status: "skipped", reason: "ALREADY_RUN_TODAY" };
  }
  if (runError) throw runError;

  const { data: existingRows, error: existingError } = await admin
    .from("monitored_opportunities")
    .select("*")
    .eq("user_id", userId)
    .in("source_id", selectedSources.length ? selectedSources.map((source) => source.id) : [-1]);
  if (existingError) throw existingError;
  const existingByUrl = new Map(
    (existingRows || []).map((row) => [normalizeUrl(String(row.canonical_url)) || row.canonical_url, row]),
  );

  let sourcesSucceeded = 0;
  let sourcesFailed = 0;
  let opportunitiesFound = 0;
  const sourceErrors: string[] = [];

  for (const source of selectedSources) {
    const started = Date.now();
    try {
      const result = await scanSource(source, professions);
      const seenIds: string[] = [];
      const rows: Json[] = [];
      for (const candidate of result.candidates) {
        const canonicalUrl = normalizeUrl(candidate.url) || candidate.url;
        const text = `${candidate.title} ${candidate.summary || ""}`;
        const detectedProfessionIds = detectProfessionIds(text, professions);
        if (!detectedProfessionIds.length) continue;
        const existing = existingByUrl.get(canonicalUrl);
        const id = `mon-${(await sha256(`${userId}|${canonicalUrl}`)).slice(0, 32)}`;
        const contentHash = await sha256(JSON.stringify({
          title: candidate.title,
          organization: candidate.organization || source.name,
          summary: candidate.summary || "",
          location: candidate.location || source.location || "",
          deadline: candidate.deadline || "",
        }));
        const nowIso = new Date().toISOString();
        const firstSeen = String(existing?.first_seen || nowIso);
        const isNew = Date.now() - new Date(firstSeen).getTime() <= 7 * 86_400_000;
        rows.push({
          id,
          user_id: userId,
          source_id: source.id,
          title: cleanText(candidate.title, 500),
          organization: cleanText(candidate.organization || source.name, 300),
          area: areaForSource(source),
          category: cleanText(candidate.type || "", 150) || null,
          summary: cleanText(candidate.summary || "", 4000) || null,
          location: cleanText(candidate.location || source.location || "", 500) || null,
          country: cleanText(candidate.country || "", 150) || null,
          remote_policy: detectWorkMode(text),
          opportunity_type: cleanText(candidate.type || "", 150) || null,
          seniority_level: detectSeniority(candidate.title),
          detected_profession_ids: detectedProfessionIds,
          canonical_url: canonicalUrl,
          source_url: String(source.website_url),
          application_url: canonicalUrl,
          deadline: isoDate(candidate.deadline),
          first_seen: firstSeen,
          last_seen: nowIso,
          last_verified_at: nowIso,
          live_status: "LIVE",
          is_current: true,
          is_new: isNew,
          change_type: !existing ? "NEW" : existing.content_hash === contentHash ? "UNCHANGED" : "UPDATED",
          content_hash: contentHash,
          raw_metadata: { parser: candidate.parser, date_posted: candidate.datePosted || null },
          updated_at: nowIso,
        });
        seenIds.push(id);
      }
      if (rows.length) {
        const { error } = await admin.from("monitored_opportunities").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      const staleIds = (existingRows || [])
        .filter((row) => Number(row.source_id) === Number(source.id) && row.is_current && !seenIds.includes(String(row.id)))
        .map((row) => row.id);
      if (staleIds.length) {
        const { error } = await admin
          .from("monitored_opportunities")
          .update({ is_current: false, is_new: false, live_status: "TO_VERIFY", change_type: "REMOVED", updated_at: new Date().toISOString() })
          .in("id", staleIds);
        if (error) throw error;
      }
      await admin.from("monitored_studios").update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", source.id).eq("user_id", userId);
      await admin.from("monitoring_source_runs").insert({
        run_id: run.id,
        user_id: userId,
        source_id: source.id,
        source_name: source.name,
        source_url: source.website_url,
        status: "completed",
        http_status: result.status,
        candidates_found: result.candidates.length,
        opportunities_saved: rows.length,
        duration_ms: Date.now() - started,
      });
      sourcesSucceeded += 1;
      opportunitiesFound += rows.length;
    } catch (error) {
      const message = cleanText(error instanceof Error ? error.message : error, 1000);
      sourceErrors.push(`${source.name}: ${message}`);
      await admin.from("monitoring_source_runs").insert({
        run_id: run.id,
        user_id: userId,
        source_id: source.id,
        source_name: source.name,
        source_url: source.website_url,
        status: "failed",
        duration_ms: Date.now() - started,
        error_code: message.split(" ")[0].slice(0, 100),
        error_message: message,
      });
      sourcesFailed += 1;
    }
  }

  const { data: currentOpportunities, error: opportunitiesError } = await admin
    .from("monitored_opportunities")
    .select("*")
    .eq("user_id", userId)
    .eq("is_current", true);
  if (opportunitiesError) throw opportunitiesError;
  let matchesFound = 0;
  for (const search of searches) {
    const allowedSourceIds = new Set(sourceIdsForSearch(search, sourceLinks, activeSourceIds));
    const matches = (currentOpportunities || []).filter((opportunity) =>
      allowedSourceIds.has(Number(opportunity.source_id)) &&
      opportunityMatchesSearch(opportunity, search, professionLinks)
    );
    await admin.from("saved_search_matches").update({ is_current: false }).eq("search_id", search.id);
    if (matches.length) {
      const nowIso = new Date().toISOString();
      const { error } = await admin.from("saved_search_matches").upsert(
        matches.map((opportunity) => ({
          search_id: search.id,
          opportunity_id: opportunity.id,
          is_current: true,
          last_matched_at: nowIso,
        })),
        { onConflict: "search_id,opportunity_id" },
      );
      if (error) throw error;
    }
    await admin.from("saved_searches").update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", search.id);
    matchesFound += matches.length;
  }
  if (professions.length) {
    await admin.from("monitored_professions").update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId).eq("is_active", true);
  }

  const status = sourcesFailed === 0 ? "completed" : sourcesSucceeded > 0 ? "partial" : "failed";
  const message = selectedSources.length === 0
    ? "Nessuna fonte pubblica attiva associata alle ricerche di oggi."
    : sourceErrors.slice(0, 5).join(" | ") || "Scansione completata.";
  await admin.from("monitoring_runs").update({
    status,
    finished_at: new Date().toISOString(),
    sources_succeeded: sourcesSucceeded,
    sources_failed: sourcesFailed,
    opportunities_found: opportunitiesFound,
    matches_found: matchesFound,
    message,
  }).eq("id", run.id);

  return {
    user_id: userId,
    run_id: run.id,
    status,
    sources_total: selectedSources.length,
    sources_succeeded: sourcesSucceeded,
    sources_failed: sourcesFailed,
    opportunities_found: opportunitiesFound,
    matches_found: matchesFound,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "SERVER_CONFIGURATION_MISSING" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let body: Json = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const requestedTrigger = body.trigger === "scheduled" ? "scheduled" : "manual";
  const cronToken = request.headers.get("x-grim-cron-token");
  let userId: string | null = null;
  let trigger: "scheduled" | "manual" = "manual";

  if (cronToken) {
    const tokenHash = await sha256(cronToken);
    const { data: config } = await admin
      .from("monitoring_runtime_config")
      .select("cron_token_hash")
      .eq("id", true)
      .maybeSingle();
    if (!config?.cron_token_hash || config.cron_token_hash !== tokenHash || requestedTrigger !== "scheduled") {
      return jsonResponse({ error: "INVALID_CRON_AUTHENTICATION" }, 401);
    }
    trigger = "scheduled";
  } else {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return jsonResponse({ error: "AUTHENTICATION_REQUIRED" }, 401);
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data.user) return jsonResponse({ error: "INVALID_USER_SESSION" }, 401);
    userId = data.user.id;
    trigger = "manual";
  }

  const clock = romeClock();
  if (cronToken && typeof body.test_url === "string") {
    try {
      const { data: professions, error } = await admin
        .from("monitored_professions")
        .select("*")
        .eq("is_active", true)
        .limit(500);
      if (error) throw error;
      const result = await scanSource(
        {
          id: -1,
          name: "Test tecnico",
          website_url: body.test_url,
          focus_areas: ["vfx_cgi_ai"],
        },
        professions || [],
      );
      return jsonResponse({
        ok: true,
        status: "test_completed",
        http_status: result.status,
        candidates_found: result.candidates.length,
        candidates: result.candidates.slice(0, 5).map((candidate) => ({
          title: candidate.title,
          url: candidate.url,
          parser: candidate.parser,
        })),
      });
    } catch (error) {
      return jsonResponse({
        ok: false,
        status: "test_failed",
        message: cleanText(error instanceof Error ? error.message : error, 1000),
      }, 422);
    }
  }
  if (trigger === "scheduled" && !inScheduledWindow(clock)) {
    return jsonResponse({ ok: true, status: "skipped", reason: "OUTSIDE_EUROPE_ROME_WINDOW", clock });
  }

  try {
    let userIds: string[];
    if (userId) {
      userIds = [userId];
    } else {
      const { data, error } = await admin
        .from("saved_searches")
        .select("user_id")
        .eq("is_active", true)
        .contains("days_of_week", [clock.weekday]);
      if (error) throw error;
      userIds = [...new Set((data || []).map((entry) => String(entry.user_id)))];
    }
    const results = [];
    for (const id of userIds) results.push(await processUser(admin, id, trigger, clock));
    return jsonResponse({ ok: true, trigger, clock, results });
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error, 1000);
    console.error("monitor-opportunities", message);
    return jsonResponse({ ok: false, error: "MONITORING_FAILED", message }, 500);
  }
});
