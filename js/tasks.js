// ============================================================
//  ONGLET TÂCHES — matrice hebdomadaire
//  Lignes = tâches, colonnes = L M M J V S D, cases à cocher.
//  Les croix sont mémorisées PAR SEMAINE : chaque semaine repart
//  à zéro, et on peut revenir voir les semaines précédentes.
// ============================================================
import { DAYS_SHORT, todayIndex, toast, esc } from "./ui.js";
import { listTasks, addTask, updateTask, deleteTask } from "./store.js";

let tasks = [];
let saveTimers = {};
let currentMonday = mondayOf(new Date());

// --- helpers semaine (lundi = début de semaine) ---
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - offset);
  return d;
}
function weekKey(monday) {
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const da = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function fmtDay(d) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
const isCurrentWeek = () => weekKey(currentMonday) === weekKey(mondayOf(new Date()));

// checks de la tâche pour la semaine affichée (toujours un tableau de 7)
function weekChecks(task) {
  const map = task.checks && !Array.isArray(task.checks) ? task.checks : {};
  const arr = map[weekKey(currentMonday)];
  return Array.isArray(arr) && arr.length === 7
    ? arr.slice()
    : [false, false, false, false, false, false, false];
}

function renderWeekLabel() {
  const sunday = addDays(currentMonday, 6);
  const label = document.getElementById("weekLabel");
  label.textContent = isCurrentWeek()
    ? `Cette semaine · ${fmtDay(currentMonday)} – ${fmtDay(sunday)}`
    : `${fmtDay(currentMonday)} – ${fmtDay(sunday)}`;
  // on n'autorise pas d'aller dans le futur
  document.getElementById("weekNext").disabled = isCurrentWeek();
}

function render() {
  renderWeekLabel();
  const grid = document.getElementById("taskGrid");
  const today = todayIndex();
  const showToday = isCurrentWeek();

  let html = `<div class="mx-corner"></div>`;
  html += DAYS_SHORT.map(
    (s, d) => `<div class="mx-day ${showToday && d === today ? "is-today" : ""}">${s}</div>`
  ).join("");

  if (!tasks.length) {
    html += `<div class="mx-empty">Aucune tâche. Ajoute-en une ci-dessous.</div>`;
  } else {
    for (const t of tasks) {
      const c = weekChecks(t);
      html += `
        <div class="mx-label" data-id="${t.id}">
          <input class="mx-title" value="${esc(t.title)}" data-id="${t.id}" />
          <button class="mx-del" data-del="${t.id}" title="Supprimer">×</button>
        </div>`;
      html += c
        .map(
          (done, d) =>
            `<button class="mx-check ${done ? "done" : ""} ${showToday && d === today ? "col-today" : ""}" data-id="${t.id}" data-day="${d}">✓</button>`
        )
        .join("");
    }
  }
  grid.innerHTML = html;
}

async function toggle(id, day) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  if (!t.checks || Array.isArray(t.checks)) t.checks = {};
  const key = weekKey(currentMonday);
  const arr = weekChecks(t);
  arr[day] = !arr[day];
  t.checks[key] = arr;
  render();
  await updateTask(id, { checks: t.checks });
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

  grid.addEventListener("click", async (e) => {
    const check = e.target.closest(".mx-check");
    if (check) return toggle(check.dataset.id, Number(check.dataset.day));
    const del = e.target.closest("[data-del]");
    if (del) {
      const id = del.dataset.del;
      tasks = tasks.filter((x) => x.id !== id);
      render();
      await deleteTask(id);
      toast("Tâche supprimée");
    }
  });

  grid.addEventListener("input", (e) => {
    if (e.target.classList.contains("mx-title")) {
      scheduleTitleSave(e.target.dataset.id, e.target.value);
    }
  });

  document.getElementById("taskAddBtn").addEventListener("click", onAdd);
  document.getElementById("taskAdd").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAdd();
  });

  document.getElementById("weekPrev").addEventListener("click", () => {
    currentMonday = addDays(currentMonday, -7);
    render();
  });
  document.getElementById("weekNext").addEventListener("click", () => {
    if (isCurrentWeek()) return;
    currentMonday = addDays(currentMonday, 7);
    render();
  });

  reload();
}

export const refreshTasks = reload;
