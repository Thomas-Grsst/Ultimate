// Petits utilitaires partagés.

// Jours : index 0 = Lundi ... 6 = Dimanche
export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

// Index 0..6 (Lundi=0) du jour actuel
export const todayIndex = () => (new Date().getDay() + 6) % 7;

let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

export const esc = (s = "") =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
