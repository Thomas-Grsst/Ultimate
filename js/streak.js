// ============================================================
//  ONGLET STREAK — deux compteurs côte à côte
//  "No Porn" et "No Insta", chacun avec sa sphère évolutive.
// ============================================================
import { toast } from "./ui.js";
import { getStreak, saveStreak } from "./store.js";

const UNITS = [
  { kind: "porn", title: "No Porn" },
  { kind: "insta", title: "No Insta" },
];

const LEVELS = [
  { min: 0, name: "Étincelle" }, { min: 3, name: "Braise" }, { min: 7, name: "Flux" },
  { min: 14, name: "Orbite" }, { min: 30, name: "Solaire" }, { min: 60, name: "Cristal" },
  { min: 100, name: "Aurora" },
];
function levelFor(days) { let l = 0; LEVELS.forEach((L, i) => { if (days >= L.min) l = i; }); return l; }

const state = {};   // kind -> { started_at, best_seconds }
let ticker = null;

const el = (kind, name) =>
  document.querySelector(`.streak-unit[data-kind="${kind}"] [data-el="${name}"]`);

const elapsed = (kind) =>
  state[kind]?.started_at
    ? Math.max(0, Math.floor((Date.now() - Date.parse(state[kind].started_at)) / 1000))
    : 0;

function fmt(sec) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(sec / 86400))}j ${p(Math.floor((sec % 86400) / 3600))}h ` +
         `${p(Math.floor((sec % 3600) / 60))}m ${p(sec % 60)}s`;
}

function unitHtml(u) {
  return `
  <div class="streak-unit" data-kind="${u.kind}">
    <div class="streak-title">${u.title}</div>
    <div class="sphere lvl-0" data-el="sphere">
      <div class="sphere-ring ring1"></div>
      <div class="sphere-ring ring2"></div>
      <div class="sphere-glow"></div>
      <div class="sphere-orbit"><span></span><span></span><span></span><span></span></div>
      <div class="sphere-core">
        <div class="streak-days" data-el="days">0</div>
        <div class="streak-label">jours</div>
      </div>
    </div>
    <div class="sphere-badge" data-el="badge">Niv. 0 · Étincelle</div>
    <div class="streak-timer" data-el="timer">00j 00h 00m 00s</div>
    <div class="streak-stats">
      <div class="stat"><div class="stat-num" data-el="best">0</div><div class="stat-lbl">Record (j)</div></div>
      <div class="stat"><div class="stat-num" data-el="start">—</div><div class="stat-lbl">Début</div></div>
    </div>
    <button class="btn-danger" data-el="reset">J'ai rechuté</button>
  </div>`;
}

function paint(kind) {
  if (!state[kind]) return;
  const sec = elapsed(kind);
  const days = Math.floor(sec / 86400);
  el(kind, "days").textContent = days;
  el(kind, "timer").textContent = fmt(sec);
  el(kind, "best").textContent = Math.floor((state[kind].best_seconds || 0) / 86400);
  el(kind, "start").textContent = state[kind].started_at
    ? new Date(state[kind].started_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const lvl = levelFor(days);
  el(kind, "sphere").className = `sphere lvl-${lvl}`;
  const next = LEVELS[lvl + 1];
  el(kind, "badge").textContent =
    `Niv. ${lvl} · ${LEVELS[lvl].name}` + (next ? `  →  ${next.min - days}j` : "  ·  max");
}

function paintAll() { UNITS.forEach((u) => paint(u.kind)); }

async function reset(kind) {
  const cur = elapsed(kind);
  const best = Math.max(state[kind].best_seconds || 0, cur);
  state[kind] = { started_at: new Date().toISOString(), best_seconds: best };
  paint(kind);
  await saveStreak(kind, state[kind]);
  toast(cur > 0 && cur >= best ? "Nouveau record ! On repart." : "Streak réinitialisée. Courage 💪");
}

async function reloadOne(kind) {
  const data = await getStreak(kind);
  if (data && data.started_at) {
    state[kind] = { started_at: data.started_at, best_seconds: data.best_seconds || 0 };
  } else {
    state[kind] = { started_at: new Date().toISOString(), best_seconds: 0 };
    await saveStreak(kind, state[kind]);
  }
  paint(kind);
}

async function reload() {
  await Promise.all(UNITS.map((u) => reloadOne(u.kind)));
  clearInterval(ticker);
  ticker = setInterval(paintAll, 1000);
}

export function initStreak() {
  const grid = document.getElementById("streaksGrid");
  grid.innerHTML = UNITS.map(unitHtml).join("");

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-el="reset"]');
    if (!btn) return;
    const kind = btn.closest(".streak-unit").dataset.kind;
    const title = UNITS.find((u) => u.kind === kind)?.title || "";
    if (confirm(`Réinitialiser la streak « ${title} » ?`)) reset(kind);
  });

  reload();
}

export const refreshStreak = reload;
