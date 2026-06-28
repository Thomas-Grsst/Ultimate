// ============================================================
//  STORE — couche d'accès aux données
//  Utilise Supabase si configuré ET connecté, sinon localStorage.
//  Toute l'app passe par ces fonctions : elle marche tout de suite,
//  et se synchronise dès que Supabase est branché.
// ============================================================
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";

let currentUser = null;
export const setUser = (u) => { currentUser = u; };
export const getUser = () => currentUser;
const useCloud = () => SUPABASE_ENABLED && !!currentUser;

// ---- helpers localStorage ----
const lsGet = (k, def) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; }
  catch { return def; }
};
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));

// ============================================================
//  TÂCHES
// ============================================================
export async function listTasks() {
  if (useCloud()) {
    const { data, error } = await supabase
      .from("tasks").select("*")
      .order("day_of_week", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw error;
    return data;
  }
  return lsGet("ult_tasks", []).sort(
    (a, b) => a.day_of_week - b.day_of_week || a.position - b.position
  );
}

export async function addTask({ day_of_week, title, position }) {
  if (useCloud()) {
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: currentUser.id, day_of_week, title, position })
      .select().single();
    if (error) throw error;
    return data;
  }
  const tasks = lsGet("ult_tasks", []);
  const t = { id: uid(), day_of_week, title, done: false, position };
  tasks.push(t); lsSet("ult_tasks", tasks);
  return t;
}

export async function updateTask(id, patch) {
  if (useCloud()) {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) throw error;
    return;
  }
  const tasks = lsGet("ult_tasks", []);
  const i = tasks.findIndex((t) => t.id === id);
  if (i > -1) { tasks[i] = { ...tasks[i], ...patch }; lsSet("ult_tasks", tasks); }
}

export async function deleteTask(id) {
  if (useCloud()) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  lsSet("ult_tasks", lsGet("ult_tasks", []).filter((t) => t.id !== id));
}

// ============================================================
//  STREAK
// ============================================================
export async function getStreak() {
  if (useCloud()) {
    const { data, error } = await supabase
      .from("streaks").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    return data; // peut être null
  }
  return lsGet("ult_streak", null);
}

export async function saveStreak({ started_at, best_seconds }) {
  if (useCloud()) {
    const { error } = await supabase.from("streaks").upsert({
      user_id: currentUser.id,
      started_at,
      best_seconds,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }
  lsSet("ult_streak", { started_at, best_seconds });
}

// ============================================================
//  MUSCU
// ============================================================
export async function listWorkouts() {
  if (useCloud()) {
    const { data, error } = await supabase
      .from("workouts").select("*")
      .order("day_of_week", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw error;
    return data;
  }
  return lsGet("ult_workouts", []).sort(
    (a, b) => a.day_of_week - b.day_of_week || a.position - b.position
  );
}

export async function addWorkout({ day_of_week, name, sets, reps, weight, position }) {
  if (useCloud()) {
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: currentUser.id, day_of_week, name, sets, reps, weight, position })
      .select().single();
    if (error) throw error;
    return data;
  }
  const ws = lsGet("ult_workouts", []);
  const w = { id: uid(), day_of_week, name, sets, reps, weight, position };
  ws.push(w); lsSet("ult_workouts", ws);
  return w;
}

export async function updateWorkout(id, patch) {
  if (useCloud()) {
    const { error } = await supabase.from("workouts").update(patch).eq("id", id);
    if (error) throw error;
    return;
  }
  const ws = lsGet("ult_workouts", []);
  const i = ws.findIndex((w) => w.id === id);
  if (i > -1) { ws[i] = { ...ws[i], ...patch }; lsSet("ult_workouts", ws); }
}

export async function deleteWorkout(id) {
  if (useCloud()) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  lsSet("ult_workouts", lsGet("ult_workouts", []).filter((w) => w.id !== id));
}
