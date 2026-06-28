// ============================================================
//  ONGLET TÂCHES — calendrier hebdo L M M J V S D
//  Tâches récurrentes par jour de semaine.
// ============================================================
import { DAYS, todayIndex, toast, esc } from "./ui.js";
import { listTasks, addTask, updateTask, deleteTask } from "./store.js";

let tasks = [];

function byDay(d) {
  return tasks.filter((t) => t.day_of_week === d).sort((a, b) => a.position - b.position);
}

function render() {
  const week = document.getElementById("week");
  const today = todayIndex();
  week.innerHTML = DAYS.map((name, d) => {
    const list = byDay(d);
    const rows = list.length
      ? list.map((t) => `
        <div class="task-row" data-id="${t.id}">
          <button class="task-check ${t.done ? "done" : ""}" data-act="toggle">✓</button>
          <span class="task-text ${t.done ? "done" : ""}">${esc(t.title)}</span>
          <button class="task-del" data-act="del" title="Supprimer">×</button>
        </div>`).join("")
      : `<div class="muted" style="padding:4px 0;">Aucune tâche.</div>`;
    return `
      <div class="day-card ${d === today ? "is-today" : ""}" data-day="${d}">
        <div class="day-head">
          <span class="day-name">${name} ${d === today ? '<span class="day-badge">Aujourd\'hui</span>' : ""}</span>
        </div>
        ${rows}
        <div class="add-row">
          <input type="text" placeholder="Nouvelle tâche…" data-add="${d}" />
          <button class="add-btn" data-addbtn="${d}">+</button>
        </div>
      </div>`;
  }).join("");
}

async function reload() {
  tasks = await listTasks();
  render();
}

async function onAdd(day) {
  const input = document.querySelector(`input[data-add="${day}"]`);
  const title = input.value.trim();
  if (!title) return;
  const position = byDay(day).length;
  const t = await addTask({ day_of_week: day, title, position });
  tasks.push(t);
  render();
  // remet le focus sur le bon champ
  const fresh = document.querySelector(`input[data-add="${day}"]`);
  if (fresh) fresh.focus();
}

export function initTasks() {
  const week = document.getElementById("week");

  week.addEventListener("click", async (e) => {
    const addBtn = e.target.closest("[data-addbtn]");
    if (addBtn) return onAdd(Number(addBtn.dataset.addbtn));

    const row = e.target.closest(".task-row");
    const act = e.target.closest("[data-act]");
    if (!row || !act) return;
    const id = row.dataset.id;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (act.dataset.act === "toggle") {
      task.done = !task.done;
      render();
      await updateTask(id, { done: task.done });
    } else if (act.dataset.act === "del") {
      tasks = tasks.filter((t) => t.id !== id);
      render();
      await deleteTask(id);
      toast("Tâche supprimée");
    }
  });

  week.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-add]")) {
      onAdd(Number(e.target.dataset.add));
    }
  });

  reload();
}

// Rechargé quand l'utilisateur se connecte / déconnecte
export const refreshTasks = reload;
