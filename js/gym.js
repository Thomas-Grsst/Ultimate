// ============================================================
//  ONGLET MUSCU — séance par jour de semaine
//  Les exercices sont récurrents : le lundi affiche toujours
//  la même séance, etc. Tout est éditable et sauvegardé.
// ============================================================
import { DAYS_SHORT, DAYS, todayIndex, toast, esc } from "./ui.js";
import { listWorkouts, addWorkout, updateWorkout, deleteWorkout } from "./store.js";

let workouts = [];
let selected = todayIndex();
let saveTimers = {};

const byDay = (d) =>
  workouts.filter((w) => w.day_of_week === d).sort((a, b) => a.position - b.position);

function renderTabs() {
  const tabs = document.getElementById("gymDayTabs");
  const today = todayIndex();
  tabs.innerHTML = DAYS_SHORT.map(
    (s, d) => `<button class="day-tab ${d === selected ? "is-active" : ""} ${d === today ? "is-today" : ""}" data-day="${d}">${s}</button>`
  ).join("");
}

function renderPanel() {
  const panel = document.getElementById("gymPanel");
  const list = byDay(selected);
  const cards = list
    .map(
      (w) => `
    <div class="exo-card" data-id="${w.id}">
      <div class="exo-top">
        <input class="exo-name" value="${esc(w.name)}" data-field="name" placeholder="Exercice" />
        <button class="exo-del" data-act="del" title="Supprimer">×</button>
      </div>
      <div class="exo-grid">
        <div class="exo-field"><label>Séries</label><input type="number" inputmode="numeric" min="0" value="${w.sets}" data-field="sets" /></div>
        <div class="exo-field"><label>Reps</label><input type="number" inputmode="numeric" min="0" value="${w.reps}" data-field="reps" /></div>
        <div class="exo-field"><label>Poids (kg)</label><input type="number" inputmode="decimal" min="0" step="0.5" value="${w.weight}" data-field="weight" /></div>
      </div>
    </div>`
    )
    .join("");
  panel.innerHTML = `
    <div class="muted" style="margin-bottom:10px;">Séance du <strong>${DAYS[selected]}</strong></div>
    ${cards || `<div class="muted" style="padding:6px 0 14px;">Aucun exercice pour ce jour.</div>`}
    <button class="add-exo" id="addExo">+ Ajouter un exercice</button>`;
}

function renderAll() { renderTabs(); renderPanel(); }

function scheduleSave(id, patch) {
  workouts = workouts.map((w) => (w.id === id ? { ...w, ...patch } : w));
  clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(async () => {
    await updateWorkout(id, patch);
  }, 500);
}

async function reload() {
  workouts = await listWorkouts();
  renderAll();
}

export function initGym() {
  const tabs = document.getElementById("gymDayTabs");
  const panel = document.getElementById("gymPanel");

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".day-tab");
    if (!btn) return;
    selected = Number(btn.dataset.day);
    renderAll();
  });

  // édition des champs
  panel.addEventListener("input", (e) => {
    const card = e.target.closest(".exo-card");
    const field = e.target.dataset.field;
    if (!card || !field) return;
    const id = card.dataset.id;
    let val = e.target.value;
    if (field !== "name") val = field === "weight" ? parseFloat(val) || 0 : parseInt(val) || 0;
    scheduleSave(id, { [field]: val });
  });

  // ajout / suppression
  panel.addEventListener("click", async (e) => {
    if (e.target.id === "addExo") {
      const position = byDay(selected).length;
      const w = await addWorkout({
        day_of_week: selected, name: "Nouvel exercice", sets: 3, reps: 10, weight: 0, position,
      });
      workouts.push(w);
      renderPanel();
      return;
    }
    const del = e.target.closest('[data-act="del"]');
    if (del) {
      const card = del.closest(".exo-card");
      const id = card.dataset.id;
      workouts = workouts.filter((w) => w.id !== id);
      renderPanel();
      await deleteWorkout(id);
      toast("Exercice supprimé");
    }
  });

  reload();
}

export const refreshGym = reload;
