-- =====================================================================
-- PinSpace Create — contas e rede social
-- Correr UMA vez no Supabase: Dashboard → SQL Editor → New query → Run.
-- É seguro voltar a correr (usa IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
--
-- Não mexe na tabela antiga "quadros" (galeria pública anónima), que continua
-- a funcionar como antes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Perfis (1 por utilizador de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  bio         text default '' check (char_length(bio) <= 300),
  image       text,                                   -- URL ou data:image (avatar pequeno)
  created_at  timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_-]{3,30}$')
);
-- Único sem distinguir maiúsculas: "Arthur" e "arthur" são o mesmo utilizador.
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- 2. Quadros com dono
-- ---------------------------------------------------------------------
create table if not exists public.boards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default 'Sem título' check (char_length(title) <= 120),
  description  text default '' check (char_length(description) <= 500),
  image_url    text,                                  -- miniatura (data:image/jpeg ~20-40 KB)
  projeto      jsonb,                                 -- conteúdo completo, para abrir/copiar
  author_id    uuid not null,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint boards_author_id_fkey foreign key (author_id) references public.profiles (id) on delete cascade
);
create index if not exists boards_author_idx on public.boards (author_id, created_at desc);
create index if not exists boards_public_idx on public.boards (is_public, updated_at desc);

-- ---------------------------------------------------------------------
-- 3. Likes
-- ---------------------------------------------------------------------
create table if not exists public.likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  board_id    uuid not null,
  created_at  timestamptz not null default now(),
  constraint likes_user_id_fkey  foreign key (user_id)  references public.profiles (id) on delete cascade,
  constraint likes_board_id_fkey foreign key (board_id) references public.boards (id)   on delete cascade,
  constraint likes_unique unique (user_id, board_id)
);
create index if not exists likes_board_idx on public.likes (board_id);

-- ---------------------------------------------------------------------
-- 4. Reposts ("retweets")
-- ---------------------------------------------------------------------
create table if not exists public.retweets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  board_id    uuid not null,
  comment     text check (char_length(comment) <= 280),
  created_at  timestamptz not null default now(),
  constraint retweets_user_id_fkey  foreign key (user_id)  references public.profiles (id) on delete cascade,
  constraint retweets_board_id_fkey foreign key (board_id) references public.boards (id)   on delete cascade,
  constraint retweets_unique unique (user_id, board_id)
);
create index if not exists retweets_board_idx on public.retweets (board_id);
create index if not exists retweets_user_idx  on public.retweets (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. Follows
-- ---------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null,
  following_id  uuid not null,
  created_at    timestamptz not null default now(),
  constraint follows_pkey primary key (follower_id, following_id),
  constraint follows_follower_id_fkey  foreign key (follower_id)  references public.profiles (id) on delete cascade,
  constraint follows_following_id_fkey foreign key (following_id) references public.profiles (id) on delete cascade,
  constraint follows_not_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------
-- 6. Triggers
-- ---------------------------------------------------------------------

-- Cria o perfil automaticamente quando alguém se regista.
-- O username vem de options.data.username no signUp(). Se já estiver
-- ocupado (corrida entre dois registos), acrescenta um sufixo em vez de
-- falhar o registo inteiro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  final_name text;
begin
  base_name := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  base_name := regexp_replace(base_name, '[^A-Za-z0-9_-]', '', 'g');
  if char_length(base_name) < 3 then
    base_name := base_name || 'user';
  end if;
  base_name := left(base_name, 24);
  final_name := base_name;

  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
    final_name := base_name || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username) values (new.id, final_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at certo sem depender do cliente.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists boards_touch_updated_at on public.boards;
create trigger boards_touch_updated_at
  before update on public.boards
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 7. Row Level Security
--    Sem isto, qualquer pessoa com a anon key podia apagar/alterar tudo.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.boards   enable row level security;
alter table public.likes    enable row level security;
alter table public.retweets enable row level security;
alter table public.follows  enable row level security;

-- profiles: todos leem; cada um só altera o seu.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- boards: públicos para todos; privados só para o dono.
drop policy if exists "boards_select" on public.boards;
create policy "boards_select" on public.boards for select using (is_public or author_id = auth.uid());
drop policy if exists "boards_insert_own" on public.boards;
create policy "boards_insert_own" on public.boards for insert with check (author_id = auth.uid());
drop policy if exists "boards_update_own" on public.boards;
create policy "boards_update_own" on public.boards for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "boards_delete_own" on public.boards;
create policy "boards_delete_own" on public.boards for delete using (author_id = auth.uid());

-- Função auxiliar: o utilizador atual pode ver este quadro?
create or replace function public.board_visible(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.boards where id = b and (is_public or author_id = auth.uid()));
$$;

-- likes
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes for select using (true);
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert with check (user_id = auth.uid() and public.board_visible(board_id));
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes for delete using (user_id = auth.uid());

-- retweets
drop policy if exists "retweets_select" on public.retweets;
create policy "retweets_select" on public.retweets for select using (true);
drop policy if exists "retweets_insert_own" on public.retweets;
create policy "retweets_insert_own" on public.retweets for insert with check (user_id = auth.uid() and public.board_visible(board_id));
drop policy if exists "retweets_delete_own" on public.retweets;
create policy "retweets_delete_own" on public.retweets for delete using (user_id = auth.uid());

-- follows
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (follower_id = auth.uid());
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (follower_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. Permissões (o projeto já teve problemas com GRANT em falta)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.boards, public.likes, public.retweets, public.follows to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.boards to authenticated;
grant insert, delete on public.likes, public.retweets, public.follows to authenticated;
grant execute on function public.board_visible(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. Realtime (opcional — para contadores/notificações ao vivo no futuro)
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.likes, public.retweets, public.follows;
  exception when duplicate_object then null;
  end;
end $$;

-- Recarrega o cache do PostgREST para os embeds (likes(count), author:profiles(...)) funcionarem já.
notify pgrst, 'reload schema';
