// ============================================================
//  ONGLET SCROLL — feed RSS pour APPRENDRE
//  Chaque carte : titre + résumé/explication + source. Pas de clic.
//  1) fonction Netlify /api/rss  2) repli direct sur les mêmes flux
//     (via proxy CORS) — plus du tout Google News.
// ============================================================
import { esc } from "./ui.js";

const CAT_LABEL = {
  ai: "IA", finance: "Finance & Trading", quantum: "Quantique", discovery: "Découvertes & Tech",
};

// Mêmes flux que la fonction Netlify : ils contiennent un vrai résumé dans le RSS.
const FEEDS = {
  ai: [
    { url: "https://export.arxiv.org/rss/cs.AI", name: "arXiv" },
    { url: "https://www.futura-sciences.com/rss/tech/actualites.xml", name: "Futura" },
    { url: "https://www.numerama.com/tech/feed/", name: "Numerama" },
  ],
  finance: [
    { url: "https://www.investing.com/rss/news_25.rss", name: "Investing" },
    { url: "https://www.lemonde.fr/economie/rss_full.xml", name: "Le Monde" },
  ],
  quantum: [
    { url: "https://export.arxiv.org/rss/quant-ph", name: "arXiv" },
    { url: "https://phys.org/rss-feed/physics-news/quantum-physics/", name: "Phys.org" },
    { url: "https://www.futura-sciences.com/rss/sciences/actualites.xml", name: "Futura" },
  ],
  discovery: [
    { url: "https://www.sciencedaily.com/rss/top/science.xml", name: "ScienceDaily" },
    { url: "https://www.futura-sciences.com/rss/actualites.xml", name: "Futura" },
    { url: "https://www.numerama.com/sciences/feed/", name: "Numerama" },
  ],
};
const REFRESH_MS = 5 * 60 * 1000;

let currentCat = "all";
let loading = false;
let timer = null;

function timeAgo(iso) {
  if (!iso) return "";
  const d = (Date.now() - Date.parse(iso)) / 1000;
  if (isNaN(d)) return "";
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.round(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.round(d / 3600)} h`;
  return `il y a ${Math.round(d / 86400)} j`;
}
function stripHtml(s = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  return (tmp.textContent || "").replace(/\s+/g, " ").trim();
}
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç ]/gi, "").replace(/\s+/g, " ").trim();

function usefulDesc(rawDesc, title) {
  const d = stripHtml(rawDesc || "");
  if (!d) return "";
  const nd = norm(d), nt = norm(title);
  if (nd === nt || nt.includes(nd) || (nt && nd.startsWith(nt.slice(0, 40)))) return "";
  return d.length > 700 ? d.slice(0, 699).trimEnd() + "…" : d;
}

function render(items) {
  const feed = document.getElementById("feed");
  // prépare + ne garde que les actus avec une explication
  const cards = items
    .map((i) => ({
      cat: i.category,
      title: i.title.trim(),
      desc: usefulDesc(i.description, i.title),
      meta: [i.source, timeAgo(i.date)].filter(Boolean).join(" · "),
    }))
    .filter((c) => c.desc);

  if (!cards.length) {
    feed.innerHTML = `<div class="feed-empty">Chargement des actus… réessaie dans un instant.</div>`;
    return;
  }
  feed.innerHTML = cards
    .map((c) => `
      <article class="feed-card">
        <span class="fc-cat">${esc(CAT_LABEL[c.cat] || "Info")}</span>
        <h3 class="fc-title">${esc(c.title)}</h3>
        <p class="fc-desc">${esc(c.desc)}</p>
        ${c.meta ? `<div class="fc-meta">${esc(c.meta)}</div>` : ""}
      </article>`)
    .join("");
}

function skeletons() {
  document.getElementById("feed").innerHTML =
    Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join("");
}

// Repli : récupère les mêmes flux côté navigateur via un proxy CORS
async function fallbackFetch(cat) {
  const cats = cat === "all" ? Object.keys(FEEDS) : [cat];
  const proxy = (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
  const all = [];
  await Promise.all(
    cats.flatMap((c) =>
      FEEDS[c].map(async (feed) => {
        try {
          const res = await fetch(proxy(feed.url));
          const xml = await res.text();
          const doc = new DOMParser().parseFromString(xml, "text/xml");
          doc.querySelectorAll("item, entry").forEach((it) => {
            const get = (sel) => it.querySelector(sel)?.textContent || "";
            const byTag = (n) => it.getElementsByTagName(n)[0]?.textContent || "";
            // choisit le champ le plus riche (contenu complet > résumé court)
            const description = [
              byTag("content:encoded"), get("encoded"), get("content"),
              get("description"), get("summary"),
            ].reduce((b, x) => ((x || "").length > b.length ? x : b), "");
            const dt = get("pubDate") || get("updated") || get("date");
            all.push({
              title: get("title"),
              description,
              source: feed.name,
              date: dt ? new Date(dt).toISOString() : null,
              category: c,
            });
          });
        } catch { /* ignore */ }
      })
    )
  );
  all.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));
  return all;
}

async function load(cat, { showSkeleton = true } = {}) {
  if (loading) return;
  loading = true;
  if (showSkeleton) skeletons();
  let items = [];
  try {
    const res = await fetch(`/api/rss?cat=${cat}`, { cache: "no-store" });
    if (res.ok) items = (await res.json()).items || [];
  } catch { /* fonction absente */ }

  // si la fonction ne renvoie rien d'exploitable, on récupère les flux nous-mêmes
  const hasDesc = items.some((i) => usefulDesc(i.description, i.title));
  if (!items.length || !hasDesc) {
    try {
      const fb = await fallbackFetch(cat);
      if (fb.length) items = fb;
    } catch { /* ignore */ }
  }
  if (cat === currentCat) render(items);
  loading = false;
}

function scheduleAutoRefresh() {
  clearInterval(timer);
  timer = setInterval(() => load(currentCat, { showSkeleton: false }), REFRESH_MS);
}

export function initFeed() {
  const chips = document.getElementById("feedChips");
  chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentCat = btn.dataset.cat;
    load(currentCat);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load(currentCat, { showSkeleton: false });
  });
  load(currentCat);
  scheduleAutoRefresh();
}
