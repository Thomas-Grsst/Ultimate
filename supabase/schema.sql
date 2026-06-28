-- ============================================================
--  Ultimate — Schéma Supabase
--  À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- TÂCHES (récurrentes par jour de semaine) ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Lundi ... 6 = Dimanche
  title       text not null,
  done        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- STREAK (un enregistrement par utilisateur) ----------
create table if not exists public.streaks (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  best_seconds bigint not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---------- MUSCU (exercices récurrents par jour de semaine) ----------
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
--  ROW LEVEL SECURITY : chaque utilisateur ne voit que ses données
-- ============================================================
alter table public.tasks    enable row level security;
alter table public.streaks  enable row level security;
alter table public.workouts enable row level security;

-- TASKS
create policy "tasks_select" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete" on public.tasks for delete using (auth.uid() = user_id);

-- STREAKS
create policy "streaks_select" on public.streaks for select using (auth.uid() = user_id);
create policy "streaks_insert" on public.streaks for insert with check (auth.uid() = user_id);
create policy "streaks_update" on public.streaks for update using (auth.uid() = user_id);

-- WORKOUTS
create policy "workouts_select" on public.workouts for select using (auth.uid() = user_id);
create policy "workouts_insert" on public.workouts for insert with check (auth.uid() = user_id);
create policy "workouts_update" on public.workouts for update using (auth.uid() = user_id);
create policy "workouts_delete" on public.workouts for delete using (auth.uid() = user_id);
