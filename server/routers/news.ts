/* news.ts — Margin Sentinel
 * Aggregates real-time supply chain news from multiple RSS feeds.
 * Uses LLM to classify severity and extract relevant tags.
 * Results are cached for 15 minutes to avoid over-fetching.
 *
 * Sources:
 *   - Supply Chain Dive  (https://www.supplychaindive.com/feeds/news/)
 *   - FT Commodities     (https://www.ft.com/commodities?format=rss)
 *   - Splash247          (https://splash247.com/feed/)
 */

import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// ─── types ────────────────────────────────────────────────────────────────────

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
];

async function fetchRssFeed(url: string, sourceName: string): Promise<RawFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarginSentinel/1.0)" },
    });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const xml = await resp.text();

    // Parse XML items
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

  // Batch up to 12 items per LLM call to stay within token limits
  const batch = rawItems.slice(0, 12);

  const prompt = `You are a supply chain analyst. Classify each news headline for a retail margin intelligence dashboard.

For each item, return a JSON array with objects containing:
- "index": the item index (0-based)
- "severity": "critical" | "warning" | "info"
  - critical: major disruptions, port closures, >10% price spikes, war/conflict impacts on shipping
  - warning: moderate delays, 5-10% price changes, labor disputes, weather events
  - info: general market updates, minor changes
- "tags": array of 1-4 relevant hashtags from: #Oil, #Freight, #Logistics, #Delays, #Fuel, #Shipping, #Ports, #Trade, #Commodities, #Inflation, #SupplyChain, #Energy
- "affectedCategories": array of affected retail categories from: Electronics, Apparel, Toys, Home & Garden, Auto Parts, Sporting Goods, Food & Beverage, All Imports
- "etaImpact": string like "+7 days" or "+14 days" if there's a delay impact, otherwise null
- "costImpact": string like "+2.3%" or "+8%" if there's a cost/price impact, otherwise null
- "summary": 1-sentence plain-English summary of the supply chain impact (max 120 chars)

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
      // Try to extract JSON array from response
      const arrayMatch = /\[[\s\S]*\]/.exec(content);
      parsed = arrayMatch ? JSON.parse(arrayMatch[0]) : [];
    }

    // Handle both {items: [...]} and [...] response shapes
    const classifications: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.classifications)
      ? parsed.classifications
      : [];

    return batch.map((raw, i) => {
      const cls = classifications.find((c: any) => c.index === i) ?? {};
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
      };
    });
  } catch (err) {
    console.warn("[news] LLM classification failed:", err);
    // Fallback: return items with basic heuristic classification
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

// ─── main fetch + classify pipeline ──────────────────────────────────────────

async function fetchAndClassifyNews(): Promise<NewsItem[]> {
  // Return cache if still fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  console.log("[news] Fetching RSS feeds...");

  // Fetch all feeds in parallel
  const feedResults = await Promise.all(
    RSS_FEEDS.map((f) => fetchRssFeed(f.url, f.name))
  );

  // Merge and deduplicate by title similarity, sort by date
  const allRaw: RawFeedItem[] = feedResults
    .flat()
    .filter((item, idx, arr) => {
      // Deduplicate by title prefix (first 60 chars)
      const key = item.title.slice(0, 60).toLowerCase();
      return arr.findIndex((x) => x.title.slice(0, 60).toLowerCase() === key) === idx;
    })
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da; // newest first
    })
    .slice(0, 12); // top 12 most recent

  if (allRaw.length === 0) {
    console.warn("[news] No RSS items fetched — returning empty");
    return [];
  }

  console.log(`[news] Classifying ${allRaw.length} items with LLM...`);
  const classified = await classifyNewsItems(allRaw);

  // Sort: critical first, then warning, then info
  const sorted = classified.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  cache = { items: sorted, fetchedAt: Date.now() };
  console.log(`[news] Cached ${sorted.length} classified news items`);
  return sorted;
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

  refresh: publicProcedure.mutation(async () => {
    // Force cache invalidation
    cache = null;
    const items = await fetchAndClassifyNews();
    return { success: true, count: items.length };
  }),
});
