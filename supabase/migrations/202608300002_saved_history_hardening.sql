-- STEP 14 hardening for account-owned saved places, collections, and history.

create unique index collections_user_name_ci_unique
  on public.collections (user_id, lower(name));

create index saved_places_place_lookup_idx
  on public.saved_places (user_id, google_place_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    nullif(
      left(
        btrim(coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )),
        100
      ),
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Covers projects that enabled Auth before the profile trigger migration.
insert into public.profiles (id, name, avatar_url, created_at, updated_at)
select
  au.id,
  nullif(
    left(
      btrim(coalesce(
        au.raw_user_meta_data ->> 'full_name',
        au.raw_user_meta_data ->> 'name',
        ''
      )),
      100
    ),
    ''
  ),
  au.raw_user_meta_data ->> 'avatar_url',
  au.created_at,
  now()
from auth.users au
on conflict (id) do nothing;
