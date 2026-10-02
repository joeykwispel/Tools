-- Favourite tools of signed-in users on tools.joeyoosenbrug.nl (optional sync across devices).
-- One row per user and tool. A removed favourite stays as starred = false, so the removal reaches the user's other devices.
-- Row Level Security is the only protection: a user can read and write only their own rows.
-- Nothing else about the user is stored; name and email stay in auth.users (from Google OAuth).

create table if not exists public.tool_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null check (length(slug) <= 64 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  starred boolean not null default true,
  -- when the user made the change, on their device; per slug the last change wins
  changed_at timestamptz not null default now(),
  primary key (user_id, slug)
);

alter table public.tool_favorites enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row (Supabase performance advice).
drop policy if exists "read own favorites" on public.tool_favorites;
create policy "read own favorites"
  on public.tool_favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own favorites" on public.tool_favorites;
create policy "insert own favorites"
  on public.tool_favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own favorites" on public.tool_favorites;
create policy "update own favorites"
  on public.tool_favorites
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- A user may wipe their own favourites; the rows also go away with the auth user (on delete cascade).
drop policy if exists "delete own favorites" on public.tool_favorites;
create policy "delete own favorites"
  on public.tool_favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Anonymous visitors get no access at all, even if a permissive policy were added by mistake.
revoke all on public.tool_favorites from anon;
revoke truncate, references, trigger on public.tool_favorites from authenticated;
grant select, insert, update, delete on public.tool_favorites to authenticated;

-- Runs as the calling user, so the count below only ever sees their own rows.
create or replace function public.guard_tool_favorites()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A device with a fast clock must not win from every later change.
  if new.changed_at > now() then
    new.changed_at := now();
  end if;

  if tg_op = 'UPDATE' then
    -- The last change wins. An older one, from a device that was offline, leaves the row as it is.
    -- On the same instant a star beats a removal, the same rule the client uses.
    if new.changed_at < old.changed_at or (new.changed_at = old.changed_at and not new.starred) then
      return old;
    end if;
    return new;
  end if;

  -- Keeps the table small: far more than there are tools. An upsert of an existing row is not a new one.
  if not exists (select 1 from public.tool_favorites f where f.user_id = new.user_id and f.slug = new.slug)
    and (select count(*) from public.tool_favorites f where f.user_id = new.user_id) >= 200 then
    raise exception 'too many favorites' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists tool_favorites_guard on public.tool_favorites;
create trigger tool_favorites_guard
  before insert or update on public.tool_favorites
  for each row execute function public.guard_tool_favorites();
