-- ============================================================
--  MIGRATION v2 — à exécuter UNE fois sur ta base existante
--  (Supabase Dashboard > SQL Editor > New query)
--  Transforme les tâches en matrice + ajoute les objectifs.
-- ============================================================

-- 1) Nouvelle structure des TÂCHES (matrice avec 7 cases)
--    On repart d'une table propre (les anciennes tâches récurrentes
--    par jour n'ont plus le même format).
drop table if exists public.tasks cascade;

create table public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  position   int not null default 0,
  checks     jsonb not null default '[false,false,false,false,false,false,false]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "tasks_all" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Table des OBJECTIFS (court / moyen / long terme)
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  horizon    text not null check (horizon in ('short','mid','long')),
  title      text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "goals_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
