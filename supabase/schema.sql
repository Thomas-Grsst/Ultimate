-- ============================================================
--  Ultimate — Schéma Supabase (installation fraîche)
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- TÂCHES (matrice : 1 ligne par tâche, 7 cases L→D) ----------
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  position   int not null default 0,
  -- map { "YYYY-MM-DD" (lundi) : [7 booléens] } -> remise à zéro chaque semaine
  checks     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- OBJECTIFS (court / moyen / long terme) ----------
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  horizon    text not null check (horizon in ('short','mid','long')),
  title      text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- STREAKS (deux compteurs par utilisateur : porn / insta) ----------
create table if not exists public.streaks (
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('porn','insta')),
  started_at   timestamptz not null default now(),
  best_seconds bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, kind)
);

-- ---------- MUSCU ----------
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  name        text not null,
  sets        int not null default 3,
  reps        int not null default 10,
  weight      numeric not null default 0,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.tasks    enable row level security;
alter table public.goals    enable row level security;
alter table public.streaks  enable row level security;
alter table public.workouts enable row level security;

create policy "tasks_all"    on public.tasks    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_all"    on public.goals    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workouts_all" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "streaks_sel"  on public.streaks  for select using (auth.uid() = user_id);
create policy "streaks_ins"  on public.streaks  for insert with check (auth.uid() = user_id);
create policy "streaks_upd"  on public.streaks  for update using (auth.uid() = user_id);
