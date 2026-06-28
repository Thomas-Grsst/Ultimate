// ============================================================
//  ONGLET STREAK — sphère centrale + temps tenu + record
// ============================================================
import { toast } from "./ui.js";
import { getStreak, saveStreak } from "./store.js";

let state = { started_at: null, best_seconds: 0 };
let ticker = null;

const elapsed = () =>
  state.started_at ? Math.max(0, Math.floor((Date.now() - Date.parse(state.started_at)) / 1000)) : 0;

function fmt(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d)}j ${p(h)}h ${p(m)}m ${p(s)}s`;
}

function paint() {
  const sec = elapsed();
  const days = Math.floor(sec / 86400);
  document.getElementById("streakDays").textContent = days;
  document.getElementById("streakTimer").textContent = fmt(sec);
  document.getElementById("streakBest").textContent = Math.floor(state.best_seconds / 86400);
  document.getElementById("streakStart").textContent = state.started_at
    ? new Date(state.started_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  // anime la sphère un peu plus vite à mesure que la streak grandit
  const sphere = document.querySelector(".sphere-core");
  if (sphere) sphere.style.animationDuration = `${Math.max(3, 6 - days * 0.05)}s`;
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(paint, 1000);
}

async function reset() {
  const cur = elapsed();
  const best = Math.max(state.best_seconds, cur);
  state = { started_at: new Date().toISOString(), best_seconds: best };
  paint();
  await saveStreak(state);
  toast(cur >= state.best_seconds && cur > 0 ? "Nouveau record battu ! On repart." : "Streak réinitialisée. Courage 💪");
}

async function reload() {
  const data = await getStreak();
  if (data && data.started_at) {
    state = { started_at: data.started_at, best_seconds: data.best_seconds || 0 };
  } else {
    // première fois : on démarre maintenant
    state = { started_at: new Date().toISOString(), best_seconds: 0 };
    await saveStreak(state);
  }
  paint();
  startTicker();
}

export function initStreak() {
  document.getElementById("resetStreak").addEventListener("click", () => {
    if (confirm("Confirmer la réinitialisation de la streak ?")) reset();
  });
  reload();
}

export const refreshStreak = reload;
