# Ultimate — site de développement personnel

Quatre onglets : **Scroll** (feed RSS utile à la place d'Instagram), **Tâches** (calendrier hebdo L→D), **Streak** (sphère + temps tenu + record), **Muscu** (séance par jour, exos récurrents éditables).

Stack : HTML / CSS / JS pur (modules ES), hébergé sur **Netlify**, données sur **Supabase**.
Le site **fonctionne immédiatement en mode local** (localStorage) ; Supabase ajoute la synchro multi-appareils.

---

## 1. Tester en local

Le feed et l'auth ont besoin des fonctions Netlify. Le plus simple :

```bash
npm install -g netlify-cli
cd Ultimate
netlify dev
```

Sinon, pour un aperçu rapide sans fonctions, sers le dossier (le feed bascule sur un proxy public) :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## 2. Configurer Supabase

1. Crée un projet sur https://supabase.com.
2. Dans **SQL Editor**, colle et exécute le contenu de `supabase/schema.sql` (crée les tables + sécurité RLS).
3. Dans **Project Settings → API**, copie :
   - *Project URL*
   - *anon public* (clé publique, sans danger dans le code)
4. Colle-les dans `js/config.js` (remplace les deux valeurs).
5. Dans **Authentication → URL Configuration**, ajoute l'URL de ton site Netlify dans *Redirect URLs* (et `http://localhost:8888` pour le dev).

> Connexion par **lien magique** (email) : pas de mot de passe à gérer. RLS garantit que chaque utilisateur ne voit que ses propres données.

## 3. Déployer sur Netlify

Option Git (recommandé) :
1. Pousse ce dossier sur un dépôt GitHub.
2. Sur Netlify : **Add new site → Import from Git**, sélectionne le dépôt.
3. Build command : *(vide)* — Publish directory : `.` — Functions : `netlify/functions` (déjà dans `netlify.toml`).

Option manuelle :
```bash
netlify deploy --prod
```

---

## Structure

```
index.html              coquille + 4 onglets
css/styles.css          thème sombre
js/
  config.js             ← À REMPLIR (clés Supabase)
  supabaseClient.js     init du client
  store.js              accès données (Supabase ou localStorage)
  ui.js                 utilitaires (jours, toast)
  feed.js               onglet Scroll
  tasks.js              onglet Tâches
  streak.js             onglet Streak
  gym.js                onglet Muscu
  app.js                navigation + auth
netlify/functions/rss.js   agrégateur RSS (anti-CORS)
supabase/schema.sql        tables + RLS
```

## Personnaliser le feed

Édite les requêtes/URLs dans `netlify/functions/rss.js` (objet `FEEDS`) pour ajouter tes propres flux ou sujets.
