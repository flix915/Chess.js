-- Migration 0002_multiplayer.sql
-- Expandir profiles e games, e criar online_games para partidas multiplayer em tempo real.

-- 1. Alterar tabela profiles
alter table public.profiles add column if not exists avatar text;

-- 2. Alterar tabela games (histórico unificado)
alter table public.games add column if not exists opponent_name text;
alter table public.games add column if not exists is_online boolean default false;
alter table public.games add column if not exists pgn text;

-- 3. Criar tabela online_games para sincronização em tempo real
create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid references auth.users(id) on delete set null,
  black_id uuid references auth.users(id) on delete set null,
  white_name text,
  black_name text,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves jsonb default '[]'::jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  winner_id uuid references auth.users(id) on delete set null,
  draw boolean default false,
  reason text, -- 'checkmate', 'resign', 'timeout', 'draw'
  time_limit integer not null default 300, -- tempo em segundos
  white_time integer not null default 300,
  black_time integer not null default 300,
  last_move_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.online_games enable row level security;

-- Políticas de acesso para online_games
create policy "Qualquer um pode ver partidas online"
  on public.online_games for select
  using (true);

create policy "Usuarios autenticados podem criar partidas online"
  on public.online_games for insert
  with check (auth.uid() is not null);

create policy "Jogadores ou novos entrantes podem atualizar a partida"
  on public.online_games for update
  using (
    auth.uid() = white_id or 
    auth.uid() = black_id or 
    white_id is null or 
    black_id is null
  );

-- Habilitar replicação em tempo real no Supabase para online_games
do $$
begin
  alter publication supabase_realtime add table public.online_games;
exception
  when others then
    raise notice 'Nao foi possivel adicionar a tabela a publicacao supabase_realtime: %', sqlerrm;
end;
$$;
