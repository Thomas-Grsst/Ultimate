// ============================================================
//  ONGLET OBJECTIFS — court / moyen / long terme
//  Trois listes : cocher, ajouter, modifier, supprimer.
// ============================================================
import { toast, esc } from "./ui.js";
import { listGoals, addGoal, updateGoal, deleteGoal } from "./store.js";

const COLS = [
  { key: "short", title: "Court terme", sub: "Cette semaine / ce mois" },
  { key: "mid",   title: "Moyen terme", sub: "Quelques mois" },
  { key: "long",  title: "Long terme",  sub: "Un an et plus" },
];

let goals = [];
let saveTimers = {};

const ofHorizon = (h) =>
  goals.filter((g) => g.horizon === h).sort((a, b) => a.position - b.position);

function render() {
  const board = document.getElementById("goalsBoard");
  board.innerHTML = COLS.map((col) => {
    const list = ofHorizon(col.key);
    const rows = list.length
      ? list.map((g) => `
        <div class="goal-row" data-id="${g.id}">
          <button class="goal-check ${g.done ? "done" : ""}" data-act="toggle">✓</button>
          <input class="goal-text ${g.done ? "done" : ""}" value="${esc(g.title)}" data-act="edit" />
          <button class="goal-del" data-act="del" title="Supprimer">×</button>
        </div>`).join("")
      : `<div class="muted" style="padding:4px 0;">Rien pour l'instant.</div>`;
    return `
      <div class="goal-col h-${col.key}" data-h="${col.key}">
        <div class="goal-head">${col.title}</div>
        <div class="goal-sub">${col.sub}</div>
        ${rows}
        <div class="goal-add">
          <input type="text" placeholder="Nouvel objectif…" data-add="${col.key}" />
          <button class="add-btn" data-addbtn="${col.key}">+</button>
        </div>
      </div>`;
  }).join("");
}

function scheduleTitleSave(id, title) {
  const g = goals.find((x) => x.id === id);
  if (g) g.title = title;
  clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(() => updateGoal(id, { title }), 500);
}

async function onAdd(horizon) {
  const input = document.querySelector(`input[data-add="${horizon}"]`);
  const title = input.value.trim();
  if (!title) return;
  const g = await addGoal({ horizon, title, position: ofHorizon(horizon).length });
  goals.push(g);
  render();
  const fresh = document.querySelector(`input[data-add="${horizon}"]`);
  if (fresh) fresh.focus();
}

async function reload() {
  goals = await listGoals();
  render();
}

export function initGoals() {
  const board = document.getElementById("goalsBoard");

  board.addEventListener("click", async (e) => {
    const addBtn = e.target.closest("[data-addbtn]");
    if (addBtn) return onAdd(addBtn.dataset.addbtn);

    const row = e.target.closest(".goal-row");
    const act = e.target.closest("[data-act]");
    if (!row || !act) return;
    const id = row.dataset.id;
    const g = goals.find((x) => x.id === id);
    if (!g) return;

    if (act.dataset.act === "toggle") {
      g.done = !g.done;
      render();
      await updateGoal(id, { done: g.done });
    } else if (act.dataset.act === "del") {
      goals = goals.filter((x) => x.id !== id);
      render();
      await deleteGoal(id);
      toast("Objectif supprimé");
    }
  });

  board.addEventListener("input", (e) => {
    if (e.target.dataset.act === "edit") {
      const row = e.target.closest(".goal-row");
      scheduleTitleSave(row.dataset.id, e.target.value);
    }
  });

  board.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-add]")) onAdd(e.target.dataset.add);
  });

  reload();
}

export const refreshGoals = reload;
