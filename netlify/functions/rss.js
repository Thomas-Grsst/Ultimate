// ============================================================
//  Fonction serverless : agrège des flux RSS et renvoie du JSON.
//  Appel : /api/rss?cat=ai|finance|quantum|discovery|all
//  Évite les problèmes CORS du fetch RSS côté navigateur.
// ============================================================

// Requêtes Google News RSS (fiables, multilingues, sans clé API)
const gnews = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;

const FEEDS = {
  ai: [
    gnews("intelligence artificielle OR IA OR \"AI model\""),
    "https://www.technologyreview.com/feed/",
  ],
  finance: [
    gnews("finance OR bourse OR \"trading\" OR économie"),
    gnews("crypto OR bitcoin OR marchés financiers"),
  ],
  quantum: [
    gnews("mécanique quantique OR \"quantum computing\" OR physique quantique"),
    "http://export.arxiv.org/rss/quant-ph",
  ],
  discovery: [
    gnews("découverte scientifique OR technologie OR innovation OR espace"),
    "https://www.sciencedaily.com/rss/top/science.xml",
  ],
};

const CATEGORIES = Object.keys(FEEDS);

// --- petit parseur RSS/Atom sans dépendance ---
function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}
function linkOf(block) {
  // RSS <link>...</link> ou Atom <link href="..."/>
  let m = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (m && m[1].trim()) return decode(m[1]);
  m = block.match(/<link[^>]*href="([^"]+)"/i);
  return m ? m[1] : "";
}
function parse(xml, category) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const b of blocks) {
    const title = tag(b, "title");
    if (!title) continue;
    const dateRaw = tag(b, "pubDate") || tag(b, "updated") || tag(b, "published");
    items.push({
      title,
      link: linkOf(b),
      source: tag(b, "source") || "",
      date: dateRaw ? new Date(dateRaw).toISOString() : null,
      category,
    });
  }
  return items;
}

async function fetchFeed(url, category) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 UltimateFeed/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parse(await res.text(), category);
  } catch {
    return [];
  }
}

export async function handler(event) {
  const cat = (event.queryStringParameters?.cat || "all").toLowerCase();
  const cats = cat === "all" || !CATEGORIES.includes(cat) ? CATEGORIES : [cat];

  const jobs = [];
  for (const c of cats) for (const url of FEEDS[c]) jobs.push(fetchFeed(url, c));

  let items = (await Promise.all(jobs)).flat();

  // dédoublonnage par titre
  const seen = new Set();
  items = items.filter((i) => {
    const k = i.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  // tri par date décroissante (les sans-date à la fin)
  items.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600", // cache 10 min
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ items: items.slice(0, 80) }),
  };
}
