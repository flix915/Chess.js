-- Schema inicial: profiles + games com RLS
-- Aplicar via Supabase SQL Editor ou `supabase db push`.

-- =========================================================
-- profiles: 1:1 com auth.users
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  rating integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Cria profile automaticamente quando um usuário é criado em auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- games: histórico de partidas
-- =========================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result text not null check (result in ('win', 'loss', 'draw')),
  ai_rating integer,
  player_score integer not null default 0,
  ai_score integer not null default 0,
  match_points integer not null default 0,
  moves jsonb,
  final_fen text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists games_user_id_created_at_idx
  on public.games (user_id, created_at desc);

alter table public.games enable row level security;

create policy "games_select_own"
  on public.games for select
  using (auth.uid() = user_id);

create policy "games_insert_own"
  on public.games for insert
  with check (auth.uid() = user_id);

create policy "games_update_own"
  on public.games for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "games_delete_own"
  on public.games for delete
  using (auth.uid() = user_id);
