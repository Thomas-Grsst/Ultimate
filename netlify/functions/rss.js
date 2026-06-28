// ============================================================
//  Fonction serverless : agrège des flux RSS et renvoie du JSON.
//  Appel : /api/rss?cat=ai|finance|quantum|discovery|all
//  Objectif APPRENDRE : on n'utilise que des flux qui contiennent
//  un VRAI résumé dans le RSS, et on ne garde que les actus avec
//  description. Pas d'enrichissement réseau (rapide, pas de timeout).
// ============================================================

const FEEDS = {
  ai: [
    { url: "https://export.arxiv.org/rss/cs.AI", name: "arXiv" },
    { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch" },
    { url: "https://www.futura-sciences.com/rss/tech/actualites.xml", name: "Futura" },
    { url: "https://www.numerama.com/tech/feed/", name: "Numerama" },
  ],
  finance: [
    { url: "https://www.investing.com/rss/news_25.rss", name: "Investing" },
    { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", name: "CNBC" },
    { url: "https://www.lemonde.fr/economie/rss_full.xml", name: "Le Monde" },
  ],
  quantum: [
    { url: "https://export.arxiv.org/rss/quant-ph", name: "arXiv" },
    { url: "https://phys.org/rss-feed/physics-news/quantum-physics/", name: "Phys.org" },
    { url: "https://www.futura-sciences.com/rss/sciences/actualites.xml", name: "Futura" },
  ],
  discovery: [
    { url: "https://www.sciencedaily.com/rss/top/science.xml", name: "ScienceDaily" },
    { url: "https://phys.org/rss-feed/", name: "Phys.org" },
    { url: "https://www.futura-sciences.com/rss/actualites.xml", name: "Futura" },
    { url: "https://www.numerama.com/sciences/feed/", name: "Numerama" },
  ],
};

const CATEGORIES = Object.keys(FEEDS);

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç ]/gi, "").replace(/\s+/g, " ").trim();
const clip = (s, n = 700) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function descOf(block, title) {
  // on choisit le champ le plus riche disponible (contenu complet > résumé court)
  const candidates = [
    tag(block, "content:encoded"),
    tag(block, "content"),
    tag(block, "description"),
    tag(block, "summary"),
    tag(block, "media:description"),
  ];
  let d = candidates.reduce((best, c) => (c.length > best.length ? c : best), "");
  if (/^\s*$/.test(d)) return "";
  const nd = norm(d), nt = norm(title);
  if (nd === nt || nt.includes(nd) || (nt && nd.startsWith(nt.slice(0, 40)))) return "";
  return clip(d);
}
function parse(xml, category, source) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const b of blocks) {
    const title = tag(b, "title");
    if (!title) continue;
    const dateRaw = tag(b, "pubDate") || tag(b, "updated") || tag(b, "published") || tag(b, "dc:date");
    items.push({
      title,
      description: descOf(b, title),
      source,
      date: dateRaw ? new Date(dateRaw).toISOString() : null,
      category,
    });
  }
  return items;
}

async function fetchFeed(feed, category) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 UltimateFeed/1.0" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    return parse(await res.text(), category, feed.name);
  } catch {
    return [];
  }
}

export async function handler(event) {
  const cat = (event.queryStringParameters?.cat || "all").toLowerCase();
  const cats = cat === "all" || !CATEGORIES.includes(cat) ? CATEGORIES : [cat];

  const jobs = [];
  for (const c of cats) for (const f of FEEDS[c]) jobs.push(fetchFeed(f, c));
  let items = (await Promise.all(jobs)).flat();

  // dédoublonnage par titre
  const seen = new Set();
  items = items.filter((i) => {
    const k = norm(i.title).slice(0, 60);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  // on ne garde que les actus AVEC une vraie explication
  const withDesc = items.filter((i) => i.description && i.description.length > 30);
  let final = withDesc.length ? withDesc : items;

  final.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ items: final.slice(0, 80) }),
  };
}
