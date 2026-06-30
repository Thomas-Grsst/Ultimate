// ============================================================
//  ONGLET SCROLL — feed RSS pour APPRENDRE
//  Cartes : titre + explication (+ "Lire plus"). Pas de redirection.
//  Texte enrichi : on récupère les paragraphes de l'article quand le
//  flux ne donne qu'un court résumé.
// ============================================================
import { esc } from "./ui.js";

const CAT_LABEL = {
  ai: "IA", finance: "Finance & Trading", quantum: "Quantique", discovery: "Découvertes & Tech",
};

// Flux qui contiennent un vrai résumé/contenu dans le RSS.
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

// Plusieurs proxies CORS : on essaie le suivant si l'un échoue.
const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
];
async function proxiedText(url) {
  for (const make of PROXIES) {
    try {
      const res = await fetch(make(url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const t = await res.text();
        if (t && t.length > 200) return t;
      }
    } catch { /* proxy suivant */ }
  }
  return "";
}

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
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöûüç ]/gi, "").replace(/\s+/g, " ").trim();

function usefulDesc(rawDesc, title) {
  const d = stripHtml(rawDesc || "");
  if (!d) return "";
  const nd = norm(d), nt = norm(title);
  if (nd === nt || nt.includes(nd) || (nt && nd.startsWith(nt.slice(0, 40)))) return "";
  return d.length > 4000 ? d.slice(0, 3999).trimEnd() + "…" : d;
}

// Le résumé du flux est-il trop court / tronqué ? -> on ira chercher l'article
function needsMore(desc) {
  const d = (desc || "").trim();
  return !d || d.length < 500 || /(\.\.\.|…)$/.test(d);
}

// Récupère plusieurs paragraphes du corps de l'article
async function fetchArticle(url) {
  try {
    const html = await proxiedText(url);
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const scope = doc.querySelector("article") || doc.querySelector("main") || doc.body;
    if (!scope) return "";
    const ps = [...scope.querySelectorAll("p")]
      .map((p) => p.textContent.replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 50 && !/cookie|abonn|newsletter|publicité/i.test(t));
    const text = ps.join("\n\n");
    return text.length > 4000 ? text.slice(0, 3999).trimEnd() + "…" : text;
  } catch {
    return "";
  }
}

async function enrichItems(items) {
  const targets = items.filter((i) => i.link && needsMore(i.description)).slice(0, 14);
  await Promise.all(
    targets.map(async (i) => {
      const text = await fetchArticle(i.link);
      if (text && text.length > stripHtml(i.description || "").length) i.description = text;
    })
  );
}

function render(items) {
  const feed = document.getElementById("feed");
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
        <p class="fc-desc clamp">${esc(c.desc)}</p>
        <button class="fc-more" type="button" hidden>Lire plus ▾</button>
        ${c.meta ? `<div class="fc-meta">${esc(c.meta)}</div>` : ""}
      </article>`)
    .join("");

  // n'affiche "Lire plus" que si le texte dépasse vraiment la zone repliée
  requestAnimationFrame(() => {
    feed.querySelectorAll(".fc-desc.clamp").forEach((d) => {
      if (d.offsetParent === null) { d.nextElementSibling.hidden = false; return; } // onglet caché
      if (d.scrollHeight > d.clientHeight + 4) d.nextElementSibling.hidden = false;
      else d.classList.remove("clamp");
    });
  });
}

function skeletons() {
  document.getElementById("feed").innerHTML =
    Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join("");
}

async function fallbackFetch(cat) {
  const cats = cat === "all" ? Object.keys(FEEDS) : [cat];
  const all = [];
  await Promise.all(
    cats.flatMap((c) =>
      FEEDS[c].map(async (feed) => {
        try {
          const xml = await proxiedText(feed.url);
          if (!xml) return;
          const doc = new DOMParser().parseFromString(xml, "text/xml");
          doc.querySelectorAll("item, entry").forEach((it) => {
            const get = (sel) => it.querySelector(sel)?.textContent || "";
            const byTag = (n) => it.getElementsByTagName(n)[0]?.textContent || "";
            const description = [
              byTag("content:encoded"), get("encoded"), get("content"),
              get("description"), get("summary"),
            ].reduce((b, x) => ((x || "").length > b.length ? x : b), "");
            const linkEl = it.querySelector("link");
            const link = linkEl?.getAttribute("href") || linkEl?.textContent || "";
            const dt = get("pubDate") || get("updated") || get("date");
            all.push({
              title: get("title"), description, link, source: feed.name,
              date: dt ? new Date(dt).toISOString() : null, category: c,
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

  const hasDesc = items.some((i) => usefulDesc(i.description, i.title));
  if (!items.length || !hasDesc) {
    try {
      const fb = await fallbackFetch(cat);
      if (fb.length) items = fb;
    } catch { /* ignore */ }
  }

  if (cat === currentCat) render(items);       // affiche d'abord les résumés
  await enrichItems(items);                     // puis va chercher le texte complet
  if (cat === currentCat) render(items);        // ré-affiche enrichi
  loading = false;
}

function scheduleAutoRefresh() {
  clearInterval(timer);
  timer = setInterval(() => load(currentCat, { showSkeleton: false }), REFRESH_MS);
}

export function initFeed() {
  document.getElementById("feed").addEventListener("click", (e) => {
    const btn = e.target.closest(".fc-more");
    if (!btn) return;
    const desc = btn.previousElementSibling;
    const collapsed = desc.classList.toggle("clamp");
    btn.textContent = collapsed ? "Lire plus ▾" : "Lire moins ▴";
  });

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
