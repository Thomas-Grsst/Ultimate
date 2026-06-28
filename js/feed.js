// ============================================================
//  ONGLET SCROLL — feed RSS
//  1) essaie la fonction Netlify /api/rss (propre, sans CORS)
//  2) sinon repli direct sur Google News RSS via proxy public
// ============================================================
import { esc } from "./ui.js";

const CAT_LABEL = {
  ai: "IA", finance: "Finance & Trading", quantum: "Quantique", discovery: "Découvertes & Tech",
};

// Requêtes utilisées par le repli client (doivent rester cohérentes avec la fonction Netlify)
const FALLBACK_QUERY = {
  ai: "intelligence artificielle OR IA",
  finance: "finance OR bourse OR trading OR économie",
  quantum: "mécanique quantique OR quantum computing",
  discovery: "découverte scientifique OR technologie OR innovation",
};

let currentCat = "all";
let loading = false;

function timeAgo(iso) {
  if (!iso) return "";
  const d = (Date.now() - Date.parse(iso)) / 1000;
  if (isNaN(d)) return "";
  if (d < 3600) return `il y a ${Math.max(1, Math.round(d / 60))} min`;
  if (d < 86400) return `il y a ${Math.round(d / 3600)} h`;
  return `il y a ${Math.round(d / 86400)} j`;
}

function render(items) {
  const feed = document.getElementById("feed");
  if (!items.length) {
    feed.innerHTML = `<div class="feed-empty">Aucun article trouvé pour l'instant. Réessaie plus tard.</div>`;
    return;
  }
  feed.innerHTML = items
    .map(
      (i) => `
    <a class="feed-card" href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">
      <span class="fc-cat">${esc(CAT_LABEL[i.category] || "Info")}</span>
      <div class="fc-title">${esc(i.title)}</div>
      <div class="fc-meta">${esc(i.source || "")}${i.source && i.date ? " · " : ""}${timeAgo(i.date)}</div>
    </a>`
    )
    .join("");
}

function skeletons() {
  document.getElementById("feed").innerHTML =
    Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join("");
}

// --- repli : parse RSS côté navigateur ---
async function fallbackFetch(cat) {
  const cats = cat === "all" ? Object.keys(FALLBACK_QUERY) : [cat];
  const proxy = (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
  const all = [];
  await Promise.all(
    cats.map(async (c) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        FALLBACK_QUERY[c]
      )}&hl=fr&gl=FR&ceid=FR:fr`;
      try {
        const res = await fetch(proxy(url));
        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        doc.querySelectorAll("item").forEach((it) => {
          all.push({
            title: it.querySelector("title")?.textContent || "",
            link: it.querySelector("link")?.textContent || "",
            source: it.querySelector("source")?.textContent || "",
            date: it.querySelector("pubDate")?.textContent
              ? new Date(it.querySelector("pubDate").textContent).toISOString()
              : null,
            category: c,
          });
        });
      } catch { /* ignore */ }
    })
  );
  all.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));
  return all.slice(0, 60);
}

async function load(cat) {
  if (loading) return;
  loading = true;
  skeletons();
  let items = [];
  try {
    const res = await fetch(`/api/rss?cat=${cat}`);
    if (res.ok) items = (await res.json()).items || [];
  } catch { /* la fonction n'est pas dispo (preview statique) */ }

  if (!items.length) {
    try { items = await fallbackFetch(cat); } catch { /* ignore */ }
  }
  render(items);
  loading = false;
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
  load(currentCat);
}
