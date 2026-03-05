/* news.ts — Margin Sentinel
 * Aggregates real-time supply chain news from multiple RSS feeds.
 * Uses LLM to classify severity, extract tags, and identify geographic disruption locations.
 * Results are cached for 15 minutes to avoid over-fetching.
 *
 * Sources:
 *   - Supply Chain Dive  (https://www.supplychaindive.com/feeds/news/)
 *   - FT Commodities     (https://www.ft.com/commodities?format=rss)
 *   - Splash247          (https://splash247.com/feed/)
 */

import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { checkAndSendAlerts } from "../_core/alertTrigger";

// ─── types ────────────────────────────────────────────────────────────────────

export interface DisruptionLocation {
  name: string;        // e.g. "Strait of Hormuz"
  lat: number;
  lng: number;
  severity: "critical" | "warning" | "info";
  delayDays?: number;  // estimated delay in days
  costImpact?: string; // e.g. "+10%"
  description: string; // short description for tooltip
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  severity: "critical" | "warning" | "info";
  tags: string[];
  affectedCategories: string[];
  etaImpact?: string;
  costImpact?: string;
  locations?: DisruptionLocation[]; // geographic disruption points
}

interface RawFeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

// ─── cache ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── RSS fetcher ──────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  { url: "https://www.supplychaindive.com/feeds/news/", name: "Supply Chain Dive" },
  { url: "https://www.ft.com/commodities?format=rss", name: "FT Commodities" },
  { url: "https://splash247.com/feed/", name: "Splash247" },
  { url: "https://www.freightwaves.com/news/feed", name: "FreightWaves" },
  { url: "https://www.hellenicshippingnews.com/feed/", name: "Hellenic Shipping News" },
  { url: "https://theloadstar.com/feed/", name: "The Loadstar" },
  { url: "https://www.joc.com/rss.xml", name: "Journal of Commerce" },
];

async function fetchRssFeed(url: string, sourceName: string): Promise<RawFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const xml = await resp.text();

    const items: RawFeedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractXmlText(block, "title");
      const link = extractXmlText(block, "link") || extractXmlAttr(block, "link", "href");
      const pubDate = extractXmlText(block, "pubDate");
      const description = stripHtml(extractXmlText(block, "description") || "");

      if (title && link) {
        items.push({ title, description: description.slice(0, 300), link, pubDate, source: sourceName });
      }
    }

    return items;
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`[news] Failed to fetch ${sourceName}: ${err}`);
    return [];
  }
}

function extractXmlText(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}>[\\s]*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>[\\s]*<\\/${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const textMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  if (textMatch) return textMatch[1].trim();
  return "";
}

function extractXmlAttr(xml: string, tag: string, attr: string): string {
  const match = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i").exec(xml);
  return match ? match[1] : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── LLM classifier ───────────────────────────────────────────────────────────

async function classifyNewsItems(rawItems: RawFeedItem[]): Promise<NewsItem[]> {
  if (rawItems.length === 0) return [];

  const batch = rawItems.slice(0, 25);

  const prompt = `You are a supply chain analyst. Classify each news headline for a retail margin intelligence dashboard.

For each item, return a JSON array with objects containing:
- "index": the item index (0-based)
- "severity": "critical" | "warning" | "info"
  - critical: major disruptions, port closures, >10% price spikes, war/conflict impacts on shipping
  - warning: moderate delays, 5-10% price changes, labor disputes, weather events
  - info: general market updates, minor changes
- "tags": array of 1-4 relevant hashtags from: #Oil, #Freight, #Logistics, #Delays, #Fuel, #Shipping, #Ports, #Trade, #Commodities, #Inflation, #SupplyChain, #Energy
- "affectedCategories": array of affected retail categories from: Electronics, Apparel, Toys, Home & Garden, Auto Parts, Sporting Goods, Food & Beverage, All Imports
- "etaImpact": REQUIRED for critical/warning severity items — estimate shipping delay even if not explicitly stated.
  Use these benchmarks: tanker sinking/incident → "+10 days", port closure → "+14 days",
  conflict disrupting key route → "+7 days", supply disruption (oil/fertiliser) → "+5 days",
  weather/labor dispute → "+3 days". Return null ONLY for pure info/market-update items.
- "costImpact": string like "+2.3%" or "+8%" if there's a cost/price impact, otherwise null
- "summary": 1-sentence plain-English summary of the supply chain impact (max 120 chars)
- "locations": array of geographic disruption points mentioned or implied in the article. Each location:
  {
    "name": "location name (e.g. Strait of Hormuz, Suez Canal, Port of Shanghai)",
    "lat": latitude as number,
    "lng": longitude as number,
    "severity": same as article severity,
    "delayDays": estimated delay days as number or null,
    "costImpact": cost impact string or null,
    "description": 1 short phrase describing the disruption at this location (max 60 chars)
  }
  Only include locations that are genuinely mentioned or strongly implied. Use accurate coordinates.
  If no specific location is identifiable, return an empty array.

News items:
${batch.map((item, i) => `${i}. [${item.source}] ${item.title}. ${item.description.slice(0, 150)}`).join("\n")}

Respond with ONLY a valid JSON array, no markdown, no explanation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a supply chain analyst. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as any,
    });

    const rawContent = response?.choices?.[0]?.message?.content ?? "{}";
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      const arrayMatch = /\[[\s\S]*\]/.exec(content);
      parsed = arrayMatch ? JSON.parse(arrayMatch[0]) : [];
    }

    const classifications: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.classifications)
      ? parsed.classifications
      : [];

    return batch.map((raw, i) => {
      const cls = classifications.find((c: any) => c.index === i) ?? {};
      const rawLocs: any[] = Array.isArray(cls.locations) ? cls.locations : [];
      const locations: DisruptionLocation[] = rawLocs
        .filter((l: any) => l.name && typeof l.lat === "number" && typeof l.lng === "number")
        .map((l: any) => ({
          name: l.name,
          lat: l.lat,
          lng: l.lng,
          severity: (l.severity as DisruptionLocation["severity"]) || cls.severity || "info",
          delayDays: typeof l.delayDays === "number" ? l.delayDays : undefined,
          costImpact: l.costImpact || cls.costImpact || undefined,
          description: l.description || cls.summary?.slice(0, 60) || raw.title.slice(0, 60),
        }));

      return {
        id: `${Date.now()}-${i}`,
        title: raw.title,
        summary: cls.summary || raw.description.slice(0, 120) || raw.title,
        source: raw.source,
        url: raw.link,
        publishedAt: raw.pubDate || new Date().toUTCString(),
        severity: (cls.severity as NewsItem["severity"]) || "info",
        tags: Array.isArray(cls.tags) ? cls.tags : [],
        affectedCategories: Array.isArray(cls.affectedCategories) ? cls.affectedCategories : [],
        etaImpact: cls.etaImpact || undefined,
        costImpact: cls.costImpact || undefined,
        locations: locations.length > 0 ? locations : undefined,
      };
    });
  } catch (err) {
    console.warn("[news] LLM classification failed:", err);
    return batch.map((raw, i) => ({
      id: `${Date.now()}-${i}`,
      title: raw.title,
      summary: raw.description.slice(0, 120) || raw.title,
      source: raw.source,
      url: raw.link,
      publishedAt: raw.pubDate || new Date().toUTCString(),
      severity: heuristicSeverity(raw.title),
      tags: heuristicTags(raw.title),
      affectedCategories: [],
      etaImpact: undefined,
      costImpact: undefined,
      locations: undefined,
    }));
  }
}

function heuristicSeverity(title: string): NewsItem["severity"] {
  const t = title.toLowerCase();
  if (/blockage|closure|strike|war|conflict|surge|spike|disruption|halt|ban/.test(t)) return "critical";
  if (/delay|slow|rise|increase|shortage|congestion|tension|warning/.test(t)) return "warning";
  return "info";
}

function heuristicTags(title: string): string[] {
  const t = title.toLowerCase();
  const tags: string[] = [];
  if (/oil|crude|brent|wti|fuel|energy/.test(t)) tags.push("#Oil");
  if (/freight|shipping|vessel|container|ship/.test(t)) tags.push("#Freight");
  if (/port|terminal|dock/.test(t)) tags.push("#Ports");
  if (/delay|slow|backlog/.test(t)) tags.push("#Delays");
  if (/supply chain|logistics/.test(t)) tags.push("#SupplyChain");
  if (/price|cost|inflation|surge|spike/.test(t)) tags.push("#Inflation");
  return tags.length > 0 ? tags : ["#Trade"];
}

// ─── aggregate disruption locations ──────────────────────────────────────────

export function aggregateDisruptionLocations(items: NewsItem[]): DisruptionLocation[] {
  const locationMap = new Map<string, DisruptionLocation>();

  for (const item of items) {
    if (!item.locations) continue;
    for (const loc of item.locations) {
      const key = loc.name.toLowerCase();
      const existing = locationMap.get(key);
      if (!existing) {
        locationMap.set(key, { ...loc });
      } else {
        // Escalate severity if a more severe article mentions the same location
        const order = { critical: 2, warning: 1, info: 0 };
        if (order[loc.severity] > order[existing.severity]) {
          locationMap.set(key, { ...loc });
        }
      }
    }
  }

  return Array.from(locationMap.values());
}

// ─── main fetch + classify pipeline ──────────────────────────────────────────

/** Exported for use by the system router (admin triggerAlerts procedure) */
export async function fetchAndClassifyNewsPublic(): Promise<NewsItem[]> {
  return fetchAndClassifyNews();
}

async function fetchAndClassifyNews(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  console.log("[news] Fetching RSS feeds...");

  const feedResults = await Promise.all(
    RSS_FEEDS.map((f) => fetchRssFeed(f.url, f.name))
  );

  const allRaw: RawFeedItem[] = feedResults
    .flat()
    .filter((item, idx, arr) => {
      const key = item.title.slice(0, 60).toLowerCase();
      return arr.findIndex((x) => x.title.slice(0, 60).toLowerCase() === key) === idx;
    })
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 25);
  if (allRaw.length === 0) {
    console.warn("[news] No RSS items fetched — returning empty");
    return [];
  }

  console.log(`[news] Classifying ${allRaw.length} items with LLM...`);
  const classified = await classifyNewsItems(allRaw);

  const sorted = classified.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  cache = { items: sorted, fetchedAt: Date.now() };
  console.log(`[news] Cached ${sorted.length} classified news items`);

  // Fire alert emails asynchronously — do not block the news response
  checkAndSendAlerts(sorted).then((result) => {
    if (result.triggered) {
      console.log(`[news] Alert triggered: ${result.criticalCount} critical items → ${result.successCount}/${result.subscriberCount} emails sent`);
    }
  }).catch((err) => {
    console.error("[news] Alert trigger failed:", err);
  });

  return sorted;
}

// ─── carrier definitions (used by shippingLines procedure) ──────────────────

const CARRIER_LIST = [
  // Marine
  { id: "maersk",       name: "Maersk",                    country: "Denmark",     type: "marine", routes: ["Asia–Europe", "Trans-Pacific", "Trans-Atlantic"] },
  { id: "msc",          name: "MSC",                       country: "Switzerland", type: "marine", routes: ["Asia–Europe (Suez)", "Trans-Atlantic", "South America"] },
  { id: "cmacgm",       name: "CMA CGM",                   country: "France",      type: "marine", routes: ["Asia–Europe", "Trans-Pacific", "Indian Ocean"] },
  { id: "cosco",        name: "COSCO Shipping",            country: "China",       type: "marine", routes: ["Trans-Pacific", "Intra-Asia", "Asia–Europe"] },
  { id: "evergreen",    name: "Evergreen",                 country: "Taiwan",      type: "marine", routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"] },
  { id: "hapag",        name: "Hapag-Lloyd",               country: "Germany",     type: "marine", routes: ["Asia–Europe", "Trans-Atlantic", "US Gulf"] },
  { id: "one",          name: "Ocean Network Express",     country: "Japan",       type: "marine", routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"] },
  { id: "yangming",     name: "Yang Ming",                 country: "Taiwan",      type: "marine", routes: ["Trans-Pacific", "Intra-Asia"] },
  { id: "zim",          name: "ZIM",                       country: "Israel",      type: "marine", routes: ["Asia–Europe (Suez)", "Trans-Pacific", "Mediterranean"] },
  { id: "pil",          name: "Pacific Int'l Lines",       country: "Singapore",   type: "marine", routes: ["Intra-Asia", "Indian Ocean", "Africa"] },
  { id: "hmmm",         name: "HMM (Hyundai)",             country: "South Korea", type: "marine", routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"] },
  { id: "wan-hai",      name: "Wan Hai Lines",             country: "Taiwan",      type: "marine", routes: ["Intra-Asia", "Trans-Pacific"] },
  // Air cargo
  { id: "emirates-cargo",     name: "Emirates SkyCargo",       country: "UAE",          type: "air",    routes: ["Asia–Europe", "Middle East Hub", "Trans-Pacific"] },
  { id: "fedex",              name: "FedEx Express",            country: "USA",          type: "air",    routes: ["Trans-Pacific", "Trans-Atlantic", "Intra-Americas"] },
  { id: "dhl",                name: "DHL Aviation",             country: "Germany",      type: "air",    routes: ["Asia–Europe", "Middle East", "Africa"] },
  { id: "cargolux",           name: "Cargolux",                 country: "Luxembourg",   type: "air",    routes: ["Trans-Atlantic", "Asia–Europe", "Americas"] },
  { id: "cathay-cargo",       name: "Cathay Cargo",             country: "Hong Kong",    type: "air",    routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"] },
  { id: "korean-air-cargo",   name: "Korean Air Cargo",         country: "South Korea",  type: "air",    routes: ["Trans-Pacific", "Intra-Asia", "Europe"] },
  { id: "qatar-cargo",        name: "Qatar Airways Cargo",      country: "Qatar",        type: "air",    routes: ["Asia–Europe", "Middle East Hub", "Africa"] },
  { id: "ups-airlines",       name: "UPS Airlines",             country: "USA",          type: "air",    routes: ["Trans-Pacific", "Trans-Atlantic", "Intra-Americas"] },
  { id: "lufthansa-cargo",    name: "Lufthansa Cargo",          country: "Germany",      type: "air",    routes: ["Trans-Atlantic", "Asia–Europe", "Middle East"] },
  { id: "air-france-cargo",   name: "Air France-KLM Cargo",     country: "France",       type: "air",    routes: ["Trans-Atlantic", "Asia–Europe", "Africa"] },
];

export interface CarrierStatus {
  id: string;
  name: string;
  country: string;
  type: "marine" | "air";
  routes: string[];
  affected: boolean;
  affectedRoutes: string[];
  reason: string; // short explanation e.g. "Suez Canal closure affects Asia-Europe route"
  severity: "critical" | "warning" | "none";
}

// Separate cache for shipping lines — 5 hour TTL as requested
const SHIPPING_LINES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (refresh more frequently for accuracy)
let shippingLinesCache: { carriers: CarrierStatus[]; fetchedAt: number } | null = null;

async function classifyCarrierImpacts(newsHeadlines: string[]): Promise<CarrierStatus[]> {
  // Use cached result if fresh
  if (shippingLinesCache && Date.now() - shippingLinesCache.fetchedAt < SHIPPING_LINES_CACHE_TTL_MS) {
    return shippingLinesCache.carriers;
  }

  if (newsHeadlines.length === 0) {
    // No news — all carriers operating normally
    return CARRIER_LIST.map((c) => ({
      ...c,
      type: c.type as "marine" | "air",
      affected: false,
      affectedRoutes: [],
      reason: "No active disruptions reported",
      severity: "none" as const,
    }));
  }

  const headlineText = newsHeadlines.slice(0, 10).map((h, i) => `${i + 1}. ${h}`).join("\n");
  const carrierNames = CARRIER_LIST.map((c) => c.name).join(", ");

  try {
    const response = await invokeLLM({
      messages: [
          {
          role: "system" as const,
          content: [
            "You are a supply chain analyst. Based on current news headlines, determine which shipping carriers are affected by disruptions. Return ONLY valid JSON.",
            `Carriers to assess: ${carrierNames}`,
            "For each carrier, determine:",
            "- affected: true/false. Be liberal: if any headline mentions disruptions near a carrier's key routes, mark as affected.",
            "- affectedRoutes: array of route names from their known routes that are impacted",
            "- reason: 1 sentence explanation (empty string if not affected)",
            "- severity: critical, warning, or none",
            "",
            "Geographic impact rules (apply broadly):",
            "- Iran conflict / Gulf oil disruption / LNG tanker incident: affects Arabian Sea, Hormuz, Middle East routes. Mark Emirates SkyCargo, Qatar Airways Cargo, ZIM, Maersk, MSC, CMA CGM, Hapag-Lloyd as affected.",
            "- Suez Canal / Red Sea / Houthi: affects Asia-Europe routes. Mark Maersk, MSC, CMA CGM, Hapag-Lloyd, ZIM as affected.",
            "- South China Sea / Taiwan Strait: affects Trans-Pacific/Intra-Asia. Mark COSCO, Evergreen, Yang Ming, ONE as affected.",
            "- Mediterranean incidents: affects Maersk, MSC, CMA CGM, ZIM.",
            "- Any tanker sinking or major incident: mark carriers operating nearby routes as affected.",
            "",
            "IMPORTANT: If headlines mention Iran, Gulf, oil disruption, tanker incidents, or Middle East conflict, this DOES affect shipping routes. Do NOT return all carriers as unaffected when such news exists.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Current news headlines:\n${headlineText}\n\nAssess each carrier's disruption status. Return JSON array matching this schema exactly:\n[{"id": "maersk", "affected": true, "affectedRoutes": ["Asia–Europe"], "reason": "Suez Canal closure disrupts Asia-Europe route", "severity": "critical"}, ...]`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "carrier_impacts",
          strict: true,
          schema: {
            type: "object",
            properties: {
              carriers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id:             { type: "string" },
                    affected:       { type: "boolean" },
                    affectedRoutes: { type: "array", items: { type: "string" } },
                    reason:         { type: "string" },
                    severity:       { type: "string", enum: ["critical", "warning", "none"] },
                  },
                  required: ["id", "affected", "affectedRoutes", "reason", "severity"],
                  additionalProperties: false,
                },
              },
            },
            required: ["carriers"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0].message.content as string;
    const raw = JSON.parse(rawContent) as {
      carriers: { id: string; affected: boolean; affectedRoutes: string[]; reason: string; severity: string }[];
    };
    // Merge LLM results with static carrier data
    // The LLM may return display names (e.g. "Maersk") instead of IDs (e.g. "maersk")
    // Build a lookup map that matches on both id and name (case-insensitive)
    const llmByIdOrName = new Map<string, typeof raw.carriers[0]>();
    for (const c of raw.carriers) {
      llmByIdOrName.set(c.id.toLowerCase(), c);
    }
    const result: CarrierStatus[] = CARRIER_LIST.map((carrier) => {
      // Try by exact id first, then by lowercase id, then by lowercase name
      const llm =
        llmByIdOrName.get(carrier.id) ??
        llmByIdOrName.get(carrier.id.toLowerCase()) ??
        llmByIdOrName.get(carrier.name.toLowerCase());
      return {
        ...carrier,
        type: carrier.type as "marine" | "air",
        affected:       llm?.affected       ?? false,
        affectedRoutes: llm?.affectedRoutes ?? [],
        reason:         llm?.reason         ?? "",
        severity:       (llm?.severity as CarrierStatus["severity"]) ?? "none",
      };
    });

    shippingLinesCache = { carriers: result, fetchedAt: Date.now() };
    return result;
  } catch (err) {
    console.warn("[shippingLines] LLM classification failed, falling back to zone matching:", err);
    // Fallback: use geographic zone matching from disruption locations
    return CARRIER_LIST.map((c) => ({
      ...c,
      type: c.type as "marine" | "air",
      affected: false,
      affectedRoutes: [],
      reason: "Status unavailable",
      severity: "none" as const,
    }));
  }
}

// ─── router ───────────────────────────────────────────────────────────────────

export const newsRouter = router({
  feed: publicProcedure.query(async () => {
    try {
      const items = await fetchAndClassifyNews();
      return {
        items,
        lastUpdated: cache?.fetchedAt ? new Date(cache.fetchedAt).toISOString() : new Date().toISOString(),
        sources: RSS_FEEDS.map((f) => f.name),
      };
    } catch (err) {
      console.error("[news] Feed query failed:", err);
      return {
        items: [] as NewsItem[],
        lastUpdated: new Date().toISOString(),
        sources: RSS_FEEDS.map((f) => f.name),
      };
    }
  }),

  disruptions: publicProcedure.query(async () => {
    try {
      const items = await fetchAndClassifyNews();
      const locations = aggregateDisruptionLocations(items);
      return {
        locations,
        lastUpdated: cache?.fetchedAt ? new Date(cache.fetchedAt).toISOString() : new Date().toISOString(),
        totalItems: items.length,
        criticalCount: items.filter((i) => i.severity === "critical").length,
      };
    } catch (err) {
      console.error("[news] Disruptions query failed:", err);
      return {
        locations: [] as DisruptionLocation[],
        lastUpdated: new Date().toISOString(),
        totalItems: 0,
        criticalCount: 0,
      };
    }
  }),

  shippingLines: publicProcedure.query(async () => {
    try {
      const items = await fetchAndClassifyNews();
      const headlines = items.map((i) => i.title);
      const carriers = await classifyCarrierImpacts(headlines);
      return {
        carriers,
        lastUpdated: shippingLinesCache?.fetchedAt
          ? new Date(shippingLinesCache.fetchedAt).toISOString()
          : new Date().toISOString(),
        affectedCount: carriers.filter((c) => c.affected).length,
        criticalCount: carriers.filter((c) => c.severity === "critical").length,
      };
    } catch (err) {
      console.error("[shippingLines] Query failed:", err);
      return {
        carriers: CARRIER_LIST.map((c) => ({
          ...c,
          type: c.type as "marine" | "air",
          affected: false,
          affectedRoutes: [],
          reason: "Status unavailable",
          severity: "none" as const,
        })),
        lastUpdated: new Date().toISOString(),
        affectedCount: 0,
        criticalCount: 0,
      };
    }
  }),

  refresh: publicProcedure.mutation(async () => {
    cache = null;
    shippingLinesCache = null;
    const items = await fetchAndClassifyNews();
    return { success: true, count: items.length };
  }),
});
