// ============================================================
//  APP — navigation entre onglets + authentification
// ============================================================
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";
import { setUser } from "./store.js";
import { toast } from "./ui.js";

import { initFeed } from "./feed.js";
import { initTasks, refreshTasks } from "./tasks.js";
import { initStreak, refreshStreak } from "./streak.js";
import { initGym, refreshGym } from "./gym.js";

// ---------- Navigation onglets ----------
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("is-active", t.dataset.view === name)
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("tabbar").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) showView(tab.dataset.view);
});

// ---------- Init des modules ----------
initFeed();
initTasks();
initStreak();
initGym();

function refreshData() {
  refreshTasks();
  refreshStreak();
  refreshGym();
}

// ---------- Authentification ----------
const authBtn = document.getElementById("authBtn");
const modal = document.getElementById("authModal");
const authMsg = document.getElementById("authMsg");
const authHint = document.getElementById("authHint");

const openModal = () => (modal.hidden = false);
const closeModal = () => { modal.hidden = true; authMsg.textContent = ""; authMsg.className = "auth-msg"; };

document.getElementById("authClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function setLoggedOutUI() {
  authBtn.textContent = SUPABASE_ENABLED ? "Se connecter" : "Mode local";
}
function setLoggedInUI(email) {
  authBtn.textContent = email ? email.split("@")[0] : "Connecté";
}

authBtn.addEventListener("click", async () => {
  if (!SUPABASE_ENABLED) {
    toast("Mode local actif — tes données sont sauvegardées dans ce navigateur. Configure Supabase pour synchroniser.");
    return;
  }
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    if (confirm("Se déconnecter ?")) {
      await supabase.auth.signOut();
    }
  } else {
    openModal();
  }
});

document.getElementById("authSend").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  if (!email) { authMsg.textContent = "Entre ton email."; authMsg.className = "auth-msg err"; return; }
  authMsg.textContent = "Envoi…"; authMsg.className = "auth-msg";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) {
    authMsg.textContent = error.message; authMsg.className = "auth-msg err";
  } else {
    authMsg.textContent = "Lien envoyé ! Vérifie ta boîte mail."; authMsg.className = "auth-msg ok";
  }
});

// ---------- État de session ----------
if (SUPABASE_ENABLED) {
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user || null;
    setUser(user);
    user ? setLoggedInUI(user.email) : setLoggedOutUI();
    if (user) refreshData();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    setUser(user);
    if (user) { setLoggedInUI(user.email); closeModal(); toast("Connecté ✓"); }
    else setLoggedOutUI();
    refreshData();
  });
} else {
  // Pas de Supabase : tout fonctionne en local
  setLoggedOutUI();
  if (authHint) authHint.textContent =
    "Supabase n'est pas encore configuré. Tes données sont sauvegardées dans ce navigateur (mode local).";
}
