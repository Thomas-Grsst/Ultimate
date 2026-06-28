// ============================================================
//  ONGLET TÂCHES — matrice
//  Lignes = tâches, colonnes = L M M J V S D, cases à cocher.
// ============================================================
import { DAYS_SHORT, todayIndex, toast, esc } from "./ui.js";
import { listTasks, addTask, updateTask, deleteTask } from "./store.js";

let tasks = [];
let saveTimers = {};

const checksOf = (t) =>
  Array.isArray(t.checks) && t.checks.length === 7
    ? t.checks
    : [false, false, false, false, false, false, false];

function render() {
  const grid = document.getElementById("taskGrid");
  const today = todayIndex();

  // En-tête : coin vide + 7 jours
  let html = `<div class="mx-corner"></div>`;
  html += DAYS_SHORT.map(
    (s, d) => `<div class="mx-day ${d === today ? "is-today" : ""}">${s}</div>`
  ).join("");

  // Une ligne par tâche
  if (!tasks.length) {
    html += `<div class="mx-empty">Aucune tâche. Ajoute-en une ci-dessous.</div>`;
  } else {
    for (const t of tasks) {
      const c = checksOf(t);
      html += `
        <div class="mx-label" data-id="${t.id}">
          <input class="mx-title" value="${esc(t.title)}" data-id="${t.id}" />
          <button class="mx-del" data-del="${t.id}" title="Supprimer">×</button>
        </div>`;
      html += c
        .map(
          (done, d) =>
            `<button class="mx-check ${done ? "done" : ""} ${d === today ? "col-today" : ""}" data-id="${t.id}" data-day="${d}">✓</button>`
        )
        .join("");
    }
  }
  grid.innerHTML = html;
}

function scheduleTitleSave(id, title) {
  const t = tasks.find((x) => x.id === id);
  if (t) t.title = title;
  clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(() => updateTask(id, { title }), 500);
}

async function onAdd() {
  const input = document.getElementById("taskAdd");
  const title = input.value.trim();
  if (!title) return;
  const t = await addTask({ title, position: tasks.length });
  tasks.push(t);
  input.value = "";
  render();
}

async function reload() {
  tasks = await listTasks();
  render();
}

export function initTasks() {
  const grid = document.getElementById("taskGrid");

  // cocher / décocher une case + suppression
  grid.addEventListener("click", async (e) => {
    const check = e.target.closest(".mx-check");
    if (check) {
      const id = check.dataset.id;
      const day = Number(check.dataset.day);
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const checks = checksOf(t).slice();
      checks[day] = !checks[day];
      t.checks = checks;
      render();
      await updateTask(id, { checks });
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      const id = del.dataset.del;
      tasks = tasks.filter((x) => x.id !== id);
      render();
      await deleteTask(id);
      toast("Tâche supprimée");
    }
  });

  // modifier le libellé
  grid.addEventListener("input", (e) => {
    if (e.target.classList.contains("mx-title")) {
      scheduleTitleSave(e.target.dataset.id, e.target.value);
    }
  });

  // ajout
  document.getElementById("taskAddBtn").addEventListener("click", onAdd);
  document.getElementById("taskAdd").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAdd();
  });

  reload();
}

export const refreshTasks = reload;
