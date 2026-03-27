-- Execute this script in Supabase SQL editor.
-- It adds user ownership to every business table.

alter table if exists ventes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists achats add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists depenses add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists dettes add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists ventes_user_id_idx on ventes(user_id);
create index if not exists achats_user_id_idx on achats(user_id);
create index if not exists depenses_user_id_idx on depenses(user_id);
create index if not exists dettes_user_id_idx on dettes(user_id);

-- Optional: enforce row-level security by connected user.
alter table if exists ventes enable row level security;
alter table if exists achats enable row level security;
alter table if exists depenses enable row level security;
alter table if exists dettes enable row level security;

drop policy if exists "ventes_select_own" on ventes;
drop policy if exists "ventes_insert_own" on ventes;
create policy "ventes_select_own" on ventes for select using (auth.uid() = user_id);
create policy "ventes_insert_own" on ventes for insert with check (auth.uid() = user_id);

drop policy if exists "achats_select_own" on achats;
drop policy if exists "achats_insert_own" on achats;
create policy "achats_select_own" on achats for select using (auth.uid() = user_id);
create policy "achats_insert_own" on achats for insert with check (auth.uid() = user_id);

drop policy if exists "depenses_select_own" on depenses;
drop policy if exists "depenses_insert_own" on depenses;
create policy "depenses_select_own" on depenses for select using (auth.uid() = user_id);
create policy "depenses_insert_own" on depenses for insert with check (auth.uid() = user_id);

drop policy if exists "dettes_select_own" on dettes;
drop policy if exists "dettes_insert_own" on dettes;
create policy "dettes_select_own" on dettes for select using (auth.uid() = user_id);
create policy "dettes_insert_own" on dettes for insert with check (auth.uid() = user_id);
