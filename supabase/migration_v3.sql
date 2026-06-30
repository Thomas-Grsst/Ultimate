-- ============================================================
--  MIGRATION v3 — à exécuter UNE fois sur ta base existante
--  (Supabase Dashboard > SQL Editor > New query)
--  1) Tâches : croix mémorisées PAR SEMAINE (remise à zéro hebdo)
--  2) Streaks : deux compteurs par utilisateur (No Porn / No Insta)
-- ============================================================

-- 1) checks devient une map { "YYYY-MM-DD" (lundi) : [7 booléens] }
update public.tasks set checks = '{}'::jsonb
  where checks is null or jsonb_typeof(checks) <> 'object';
alter table public.tasks alter column checks set default '{}'::jsonb;

-- 2) Deux streaks par utilisateur via une clé composite (user_id, kind)
drop table if exists public.streaks cascade;

create table public.streaks (
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('porn','insta')),
  started_at   timestamptz not null default now(),
  best_seconds bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.streaks enable row level security;
create policy "streaks_all" on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
