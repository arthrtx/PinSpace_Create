-- =====================================================================
-- PinSpace Create — base de dados completa
--
-- Supabase → SQL Editor → New query → colar TUDO → Run.
-- É seguro voltar a correr: cria o que falta, acrescenta colunas novas
-- e não apaga dados.
--
--  1  profiles          perfil público (nome, bio, avatar, contadores…)
--  2  profile_private   dados privados da conta (email, idioma, fuso,
--                       último acesso, nº de sessões…) — só o dono vê
--  3  boards            quadros (conteúdo, miniatura, imagem completa,
--                       tamanho, nº de elementos, tags, contadores…)
--  4  likes · retweets · follows
--  5  notifications     notificações guardadas (like, repost, seguidor)
--  6  triggers          perfil automático no registo, contadores,
--                       notificações, updated_at
--  7  funções           touch_session (último acesso), register_view
--  8  segurança (RLS) e permissões
--  9  Storage           pastas "quadros" (imagens dos quadros) e
--                       "avatars" (fotos de perfil)
-- 10  arrumação         perfis em falta, galeria antiga → contas,
--                       contadores recalculados
-- 11  limpeza           notificações apagadas ao fim de 60 dias;
--                       vista "ver_quadros" para consultar no painel
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Perfis públicos
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  bio         text default '' check (char_length(bio) <= 300),
  image       text,
  created_at  timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_-]{3,30}$')
);
alter table public.profiles add column if not exists display_name        text check (char_length(display_name) <= 60);
alter table public.profiles add column if not exists website             text check (char_length(website) <= 200);
alter table public.profiles add column if not exists location            text check (char_length(location) <= 80);
alter table public.profiles add column if not exists cover_image         text;
alter table public.profiles add column if not exists is_verified         boolean not null default false;
alter table public.profiles add column if not exists boards_count        integer not null default 0;
alter table public.profiles add column if not exists public_boards_count integer not null default 0;
alter table public.profiles add column if not exists followers_count     integer not null default 0;
alter table public.profiles add column if not exists following_count     integer not null default 0;
alter table public.profiles add column if not exists likes_received      integer not null default 0;
alter table public.profiles add column if not exists last_active_at      timestamptz;
alter table public.profiles add column if not exists updated_at          timestamptz not null default now();
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- 2. Dados privados da conta (só o próprio utilizador lê)
-- ---------------------------------------------------------------------
create table if not exists public.profile_private (
  id                 uuid primary key references public.profiles (id) on delete cascade,
  email              text,
  language           text,
  timezone           text,
  theme              text check (theme in ('light', 'dark')),
  last_user_agent    text,
  last_sign_in_at    timestamptz,
  sign_in_count      integer not null default 0,
  terms_accepted_at  timestamptz,
  marketing_opt_in   boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Quadros
-- ---------------------------------------------------------------------
create table if not exists public.boards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default 'Sem título' check (char_length(title) <= 120),
  description  text default '' check (char_length(description) <= 500),
  image_url    text,
  projeto      jsonb,
  author_id    uuid not null,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint boards_author_id_fkey foreign key (author_id) references public.profiles (id) on delete cascade
);
alter table public.boards add column if not exists image_full      text;          -- imagem grande (Storage "quadros")
alter table public.boards add column if not exists board_width     integer;
alter table public.boards add column if not exists board_height    integer;
alter table public.boards add column if not exists elements_count  integer not null default 0;
alter table public.boards add column if not exists tags            text[] not null default '{}';
alter table public.boards add column if not exists copied_from     uuid references public.boards (id) on delete set null;
alter table public.boards add column if not exists published_at    timestamptz;
alter table public.boards add column if not exists likes_count     integer not null default 0;
alter table public.boards add column if not exists retweets_count  integer not null default 0;
alter table public.boards add column if not exists views_count     integer not null default 0;
create index if not exists boards_author_idx on public.boards (author_id, created_at desc);
create index if not exists boards_public_idx on public.boards (is_public, updated_at desc);
create index if not exists boards_tags_idx   on public.boards using gin (tags);

-- ---------------------------------------------------------------------
-- 4. Likes, reposts, seguidores
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
-- 5. Notificações guardadas
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,   -- quem recebe
  actor_id    uuid not null references public.profiles (id) on delete cascade,   -- quem fez
  type        text not null check (type in ('like', 'repost', 'follow')),
  board_id    uuid references public.boards (id) on delete cascade,
  comment     text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Triggers
-- ---------------------------------------------------------------------

-- Registo → perfil público + dados privados (email, aceitação dos termos).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  final_name text;
begin
  base_name := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  base_name := regexp_replace(base_name, '[^A-Za-z0-9_-]', '', 'g');
  if char_length(base_name) < 3 then base_name := base_name || 'user'; end if;
  base_name := left(base_name, 24);
  final_name := base_name;
  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
    final_name := base_name || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  -- Login com Google: aproveita o nome e a foto da conta Google.
  insert into public.profiles (id, username, display_name, image)
  values (
    new.id,
    final_name,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''),
                  nullif(new.raw_user_meta_data ->> 'full_name', ''),
                  nullif(new.raw_user_meta_data ->> 'name', '')), 60),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
             nullif(new.raw_user_meta_data ->> 'picture', ''))
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, email, language, terms_accepted_at)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'language', ''), now())
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email alterado na conta → atualiza os dados privados.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profile_private set email = new.email, updated_at = now() where id = new.id;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email after update of email on auth.users
  for each row execute function public.handle_user_email_change();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
-- Quadros: updated_at só muda quando o conteúdo muda (likes/visualizações
-- não mexem na ordem de "mais recentes").
create or replace function public.boards_touch_updated_at()
returns trigger language plpgsql as $$
begin
  if (new.title, new.description, new.image_url, new.image_full, new.projeto, new.is_public, new.tags)
     is distinct from (old.title, old.description, old.image_url, old.image_full, old.projeto, old.is_public, old.tags) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists boards_touch_updated_at on public.boards;
create trigger boards_touch_updated_at before update on public.boards
  for each row execute function public.boards_touch_updated_at();

create or replace function public.profiles_touch_updated_at()
returns trigger language plpgsql as $$
begin
  if (new.username, new.display_name, new.bio, new.image, new.cover_image, new.website, new.location)
     is distinct from (old.username, old.display_name, old.bio, old.image, old.cover_image, old.website, old.location) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();
drop trigger if exists profile_private_touch_updated_at on public.profile_private;
create trigger profile_private_touch_updated_at before update on public.profile_private
  for each row execute function public.touch_updated_at();

-- Primeira vez que um quadro fica público → published_at.
create or replace function public.boards_set_published()
returns trigger language plpgsql as $$
begin
  if new.is_public and new.published_at is null then new.published_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists boards_set_published on public.boards;
create trigger boards_set_published before insert or update of is_public on public.boards
  for each row execute function public.boards_set_published();

-- Contadores do perfil (quadros, seguidores, likes recebidos).
create or replace function public.refresh_profile_counts(p uuid)
returns void language sql security definer set search_path = public as $$
  update public.profiles set
    boards_count        = (select count(*) from public.boards b where b.author_id = p),
    public_boards_count = (select count(*) from public.boards b where b.author_id = p and b.is_public),
    followers_count     = (select count(*) from public.follows f where f.following_id = p),
    following_count     = (select count(*) from public.follows f where f.follower_id = p),
    likes_received      = (select count(*) from public.likes l join public.boards b on b.id = l.board_id where b.author_id = p)
  where id = p;
$$;

create or replace function public.refresh_board_counts(b uuid)
returns void language sql security definer set search_path = public as $$
  update public.boards set
    likes_count    = (select count(*) from public.likes l where l.board_id = b),
    retweets_count = (select count(*) from public.retweets r where r.board_id = b)
  where id = b;
$$;

create or replace function public.on_board_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_profile_counts(coalesce(new.author_id, old.author_id));
  return null;
end;
$$;
drop trigger if exists boards_counts on public.boards;
create trigger boards_counts after insert or delete or update of is_public, author_id on public.boards
  for each row execute function public.on_board_change();

create or replace function public.on_like_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
  owner uuid;
begin
  select author_id into owner from public.boards where id = r.board_id;
  perform public.refresh_board_counts(r.board_id);
  if owner is not null then perform public.refresh_profile_counts(owner); end if;
  if tg_op = 'INSERT' and owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, board_id) values (owner, new.user_id, 'like', new.board_id);
  elsif tg_op = 'DELETE' then
    delete from public.notifications where type = 'like' and actor_id = old.user_id and board_id = old.board_id;
  end if;
  return null;
end;
$$;
drop trigger if exists likes_counts on public.likes;
create trigger likes_counts after insert or delete on public.likes
  for each row execute function public.on_like_change();

create or replace function public.on_retweet_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
  owner uuid;
begin
  select author_id into owner from public.boards where id = r.board_id;
  perform public.refresh_board_counts(r.board_id);
  if tg_op = 'INSERT' and owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, board_id, comment) values (owner, new.user_id, 'repost', new.board_id, new.comment);
  elsif tg_op = 'DELETE' then
    delete from public.notifications where type = 'repost' and actor_id = old.user_id and board_id = old.board_id;
  end if;
  return null;
end;
$$;
drop trigger if exists retweets_counts on public.retweets;
create trigger retweets_counts after insert or delete on public.retweets
  for each row execute function public.on_retweet_change();

create or replace function public.on_follow_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
begin
  perform public.refresh_profile_counts(r.follower_id);
  perform public.refresh_profile_counts(r.following_id);
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  else
    delete from public.notifications where type = 'follow' and actor_id = old.follower_id and user_id = old.following_id;
  end if;
  return null;
end;
$$;
drop trigger if exists follows_counts on public.follows;
create trigger follows_counts after insert or delete on public.follows
  for each row execute function public.on_follow_change();

-- ---------------------------------------------------------------------
-- 7. Funções chamadas pelo site
-- ---------------------------------------------------------------------

-- Chamada uma vez por visita com sessão iniciada: guarda o último acesso,
-- idioma, fuso horário, tema e navegador. Conta uma sessão nova se a
-- anterior foi há mais de 30 minutos.
create or replace function public.touch_session(p_language text default null, p_timezone text default null,
                                                p_theme text default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  insert into public.profile_private (id, email)
  select uid, u.email from auth.users u where u.id = uid
  on conflict (id) do nothing;

  update public.profile_private set
    sign_in_count   = sign_in_count + case when last_sign_in_at is null or last_sign_in_at < now() - interval '30 minutes' then 1 else 0 end,
    last_sign_in_at = now(),
    language        = coalesce(left(p_language, 20), language),
    timezone        = coalesce(left(p_timezone, 60), timezone),
    theme           = case when p_theme in ('light', 'dark') then p_theme else theme end,
    last_user_agent = coalesce(left(p_user_agent, 300), last_user_agent),
    email           = coalesce((select email from auth.users where id = uid), email)
  where id = uid;

  update public.profiles set last_active_at = now() where id = uid;
end;
$$;

-- +1 visualização de um quadro público (não conta o próprio autor).
create or replace function public.register_view(p_board uuid)
returns void language sql security definer set search_path = public as $$
  update public.boards set views_count = views_count + 1
  where id = p_board and is_public and author_id is distinct from auth.uid();
$$;

-- O utilizador atual pode ver este quadro?
create or replace function public.board_visible(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.boards where id = b and (is_public or author_id = auth.uid()));
$$;

-- ---------------------------------------------------------------------
-- 8. Segurança (Row Level Security) e permissões
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.boards          enable row level security;
alter table public.likes           enable row level security;
alter table public.retweets        enable row level security;
alter table public.follows         enable row level security;
alter table public.notifications   enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "private_select_own" on public.profile_private;
create policy "private_select_own" on public.profile_private for select using (id = auth.uid());
drop policy if exists "private_update_own" on public.profile_private;
create policy "private_update_own" on public.profile_private for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "boards_select" on public.boards;
create policy "boards_select" on public.boards for select using (is_public or author_id = auth.uid());
drop policy if exists "boards_insert_own" on public.boards;
create policy "boards_insert_own" on public.boards for insert with check (author_id = auth.uid());
drop policy if exists "boards_update_own" on public.boards;
create policy "boards_update_own" on public.boards for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "boards_delete_own" on public.boards;
create policy "boards_delete_own" on public.boards for delete using (author_id = auth.uid());

drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes for select using (true);
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert with check (user_id = auth.uid() and public.board_visible(board_id));
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes for delete using (user_id = auth.uid());

drop policy if exists "retweets_select" on public.retweets;
create policy "retweets_select" on public.retweets for select using (true);
drop policy if exists "retweets_insert_own" on public.retweets;
create policy "retweets_insert_own" on public.retweets for insert with check (user_id = auth.uid() and public.board_visible(board_id));
drop policy if exists "retweets_delete_own" on public.retweets;
create policy "retweets_delete_own" on public.retweets for delete using (user_id = auth.uid());

drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (follower_id = auth.uid());
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (follower_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete using (user_id = auth.uid());

-- Os contadores só mudam pelos triggers (o site não os pode falsificar).
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.boards, public.likes, public.retweets, public.follows to anon, authenticated;
grant select, update on public.notifications, public.profile_private to authenticated;
grant delete on public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant insert on public.profiles to authenticated;
grant update (username, display_name, bio, image, cover_image, website, location) on public.profiles to authenticated;
revoke update on public.profile_private from authenticated;
grant update (language, timezone, theme, marketing_opt_in) on public.profile_private to authenticated;
grant insert, delete on public.boards to authenticated;
revoke update on public.boards from authenticated;
grant update (id, author_id, title, description, image_url, image_full, projeto, is_public, board_width, board_height,
              elements_count, tags, copied_from) on public.boards to authenticated;
grant insert, delete on public.likes, public.retweets, public.follows to authenticated;
grant execute on function public.board_visible(uuid) to anon, authenticated;
grant execute on function public.touch_session(text, text, text, text) to authenticated;
grant execute on function public.register_view(uuid) to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.likes, public.retweets, public.follows;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 9. Storage: imagens dos quadros e fotos de perfil
--    Cada utilizador só escreve na sua pasta: <id do utilizador>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quadros', 'quadros', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
       ('avatars', 'avatars', true, 2097152,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quadros_img_read" on storage.objects;
drop policy if exists "quadros_img_insert_own" on storage.objects;
drop policy if exists "quadros_img_update_own" on storage.objects;
drop policy if exists "quadros_img_delete_own" on storage.objects;
drop policy if exists "pinspace_img_read" on storage.objects;
create policy "pinspace_img_read" on storage.objects
  for select using (bucket_id in ('quadros', 'avatars'));
drop policy if exists "pinspace_img_insert_own" on storage.objects;
create policy "pinspace_img_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('quadros', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pinspace_img_update_own" on storage.objects;
create policy "pinspace_img_update_own" on storage.objects
  for update to authenticated
  using (bucket_id in ('quadros', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('quadros', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pinspace_img_delete_own" on storage.objects;
create policy "pinspace_img_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id in ('quadros', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 10. Arrumação dos dados que já existem
-- ---------------------------------------------------------------------

-- 10a. Perfis em falta (contas criadas antes deste script)
do $$
declare
  r record;
  base_name text;
  final_name text;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data, u.created_at
    from auth.users u left join public.profiles p on p.id = u.id
    where p.id is null order by u.created_at
  loop
    base_name := coalesce(nullif(r.raw_user_meta_data ->> 'username', ''), split_part(r.email, '@', 1));
    base_name := regexp_replace(base_name, '[^A-Za-z0-9_-]', '', 'g');
    if char_length(base_name) < 3 then base_name := base_name || 'user'; end if;
    base_name := left(base_name, 24);
    final_name := base_name;
    while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
      final_name := base_name || '_' || substr(md5(random()::text), 1, 4);
    end loop;
    insert into public.profiles (id, username, created_at) values (r.id, final_name, coalesce(r.created_at, now()));
  end loop;
end $$;

-- 10b. Dados privados de todas as contas (email da conta)
insert into public.profile_private (id, email, terms_accepted_at, created_at)
select p.id, u.email, p.created_at, p.created_at
from public.profiles p join auth.users u on u.id = p.id
on conflict (id) do update set email = excluded.email;

-- 10c. Galeria antiga ("quadros") → quadros públicos da conta do autor
do $$
declare
  q record;
  owner uuid;
  only_user uuid;
  n_moved int := 0;
begin
  if to_regclass('public.quadros') is null then return; end if;
  if (select count(*) from public.profiles) = 1 then
    select id into only_user from public.profiles limit 1;
  end if;
  for q in execute 'select id, titulo, autor, thumb, projeto, publicado, atualizado from public.quadros' loop
    owner := null;
    select p.id into owner from public.profiles p where lower(p.username) = lower(trim(coalesce(q.autor, ''))) limit 1;
    owner := coalesce(owner, only_user);
    continue when owner is null;
    insert into public.boards (title, description, image_url, projeto, author_id, is_public, created_at, updated_at,
                               published_at, board_width, board_height, elements_count)
    values (
      left(coalesce(nullif(trim(q.titulo), ''), 'Sem título'), 120), '', q.thumb, q.projeto, owner, true,
      coalesce(q.publicado, now()), coalesce(q.atualizado, q.publicado, now()), coalesce(q.publicado, now()),
      nullif(q.projeto ->> 'boardWidth', '')::int, nullif(q.projeto ->> 'boardHeight', '')::int,
      coalesce(jsonb_array_length(case when jsonb_typeof(q.projeto -> 'elementos') = 'array' then q.projeto -> 'elementos' end), 0)
    );
    execute 'delete from public.quadros where id = $1' using q.id;
    n_moved := n_moved + 1;
  end loop;
  raise notice 'Quadros da galeria antiga passados para as contas: %', n_moved;
end $$;

-- 10d. Preenche os dados novos dos quadros que já existiam
update public.boards set
  board_width    = coalesce(board_width,  nullif(projeto ->> 'boardWidth', '')::int),
  board_height   = coalesce(board_height, nullif(projeto ->> 'boardHeight', '')::int),
  elements_count = coalesce(jsonb_array_length(case when jsonb_typeof(projeto -> 'elementos') = 'array' then projeto -> 'elementos' end), elements_count),
  published_at   = case when is_public then coalesce(published_at, created_at) else published_at end
where projeto is not null;

-- 10e. Contadores certos
do $$
declare r record;
begin
  for r in select id from public.boards loop perform public.refresh_board_counts(r.id); end loop;
  for r in select id from public.profiles loop perform public.refresh_profile_counts(r.id); end loop;
end $$;

notify pgrst, 'reload schema';

-- =====================================================================
-- 11. Limpeza automática das notificações (60 dias)
--     + tabela de consulta "ver_quadros" (só para ti, no painel)
--     Pode ser colado sozinho no SQL Editor. É seguro voltar a correr.
-- =====================================================================

-- 11a. Apaga já as notificações com mais de 60 dias
delete from public.notifications where created_at < now() - interval '60 days';

-- 11b. Sempre que entra uma notificação nova, as com mais de 60 dias saem
--      (funciona sem extensões; a tabela nunca cresce para além disso)
create index if not exists notifications_created_idx on public.notifications (created_at);

create or replace function public.prune_old_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications where created_at < now() - interval '60 days';
  return null;
end $$;

drop trigger if exists notifications_prune on public.notifications;
create trigger notifications_prune after insert on public.notifications
  for each statement execute function public.prune_old_notifications();

-- 11c. Extra: limpeza diária às 04:00, se a extensão pg_cron estiver ativa
--      (Database → Extensions → pg_cron). Se não estiver, isto é ignorado.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pinspace_notificacoes_60_dias';
    perform cron.schedule('pinspace_notificacoes_60_dias', '0 4 * * *',
      $job$delete from public.notifications where created_at < now() - interval '60 days'$job$);
  end if;
exception when others then
  raise notice 'pg_cron indisponível — fica só a limpeza automática por trigger.';
end $$;

-- 11d. "ver_quadros": uma linha por quadro, fácil de ler no Table Editor.
--      Só tu vês (no painel do Supabase); o site e os visitantes não têm acesso.
create or replace view public.ver_quadros
with (security_invoker = true) as
select
  p.username                                            as utilizador,
  b.title                                               as titulo,
  case when b.is_public then 'público' else 'privado' end as visibilidade,
  b.created_at                                          as criado_em,
  b.updated_at                                          as atualizado_em,
  b.likes_count                                         as likes,
  b.retweets_count                                      as reposts,
  b.views_count                                         as visualizacoes,
  case when b.image_full like 'http%' then b.image_full end      as imagem,
  case when b.image_url  like 'http%' then b.image_url
       when b.image_url is not null then '(miniatura guardada dentro da base de dados)'
  end                                                   as miniatura,
  pg_size_pretty(coalesce(pg_column_size(b.projeto), 0)::bigint) as tamanho_conteudo,
  b.id                                                  as id_quadro
from public.boards b
join public.profiles p on p.id = b.author_id
order by b.updated_at desc;

revoke all on public.ver_quadros from anon, authenticated;

notify pgrst, 'reload schema';
