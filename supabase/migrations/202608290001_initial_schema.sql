-- Đi Đâu Ăn Gì? — initial application-owned schema
-- Google Places content is intentionally not mirrored here. Only place IDs are stored.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.couple_session_status as enum (
  'collecting_preferences',
  'swiping',
  'matched',
  'completed',
  'expired'
);

create type public.swipe_decision as enum ('left', 'right', 'super_like');

create type public.menu_source_type as enum (
  'application_database',
  'official_website',
  'merchant',
  'user_upload'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text check (name is null or char_length(name) between 1 and 100),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_cuisines text[] not null default '{}',
  disliked_cuisines text[] not null default '{}',
  budget_min integer check (budget_min is null or budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  preferred_radius_meters integer check (
    preferred_radius_meters is null or preferred_radius_meters between 100 and 50000
  ),
  preferred_ambience text[] not null default '{}',
  preference_weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_preference_budget check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  ),
  constraint preference_weights_is_object check (
    jsonb_typeof(preference_weights) = 'object'
  )
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  google_place_id text not null check (char_length(google_place_id) between 1 and 512),
  collection_id uuid references public.collections(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index saved_places_without_collection_unique
  on public.saved_places (user_id, google_place_id)
  where collection_id is null;

create unique index saved_places_in_collection_unique
  on public.saved_places (user_id, google_place_id, collection_id)
  where collection_id is not null;

create index saved_places_user_created_idx
  on public.saved_places (user_id, created_at desc);

create table public.couple_sessions (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique check (code ~ '^[A-Z0-9]{6,10}$'),
  creator_user_id uuid references public.profiles(id) on delete set null,
  creator_guest_id uuid,
  status public.couple_session_status not null default 'collecting_preferences',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint session_has_one_creator check (
    (creator_user_id is not null)::integer +
    (creator_guest_id is not null)::integer = 1
  ),
  constraint session_expiry_after_creation check (expires_at > created_at)
);

create index couple_sessions_expiry_idx
  on public.couple_sessions (expires_at)
  where status not in ('completed', 'expired');

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.couple_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_id uuid,
  display_name text check (
    display_name is null or char_length(display_name) between 1 and 60
  ),
  preferences_json jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_member_has_one_identity check (
    (user_id is not null)::integer + (guest_id is not null)::integer = 1
  ),
  constraint session_member_preferences_is_object check (
    jsonb_typeof(preferences_json) = 'object'
  )
);

create unique index session_members_user_unique
  on public.session_members (session_id, user_id)
  where user_id is not null;

create unique index session_members_guest_unique
  on public.session_members (session_id, guest_id)
  where guest_id is not null;

create table public.session_candidates (
  session_id uuid not null references public.couple_sessions(id) on delete cascade,
  google_place_id text not null check (char_length(google_place_id) between 1 and 512),
  google_result_position smallint not null check (google_result_position >= 0),
  created_at timestamptz not null default now(),
  primary key (session_id, google_place_id)
);

create index session_candidates_order_idx
  on public.session_candidates (session_id, google_result_position);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.couple_sessions(id) on delete cascade,
  member_id uuid not null references public.session_members(id) on delete cascade,
  google_place_id text not null check (char_length(google_place_id) between 1 and 512),
  decision public.swipe_decision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, member_id, google_place_id),
  foreign key (session_id, google_place_id)
    references public.session_candidates(session_id, google_place_id)
    on delete cascade
);

create index swipes_match_lookup_idx
  on public.swipes (session_id, google_place_id, decision);

create table public.place_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  google_place_id text not null check (char_length(google_place_id) between 1 and 512),
  personal_rating numeric(2,1) check (
    personal_rating is null or personal_rating between 1 and 5
  ),
  note text check (note is null or char_length(note) <= 2000),
  visited_at timestamptz not null,
  approximate_cost integer check (approximate_cost is null or approximate_cost >= 0),
  currency char(3) not null default 'VND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index place_notes_timeline_idx
  on public.place_notes (user_id, visited_at desc);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null check (char_length(google_place_id) between 1 and 512),
  source_type public.menu_source_type not null,
  source_url text,
  verified boolean not null default false,
  contributed_by uuid references public.profiles(id) on delete set null,
  content_fingerprint text,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_source_url_protocol check (
    source_url is null or source_url ~* '^https?://'
  )
);

create index menus_place_priority_idx
  on public.menus (google_place_id, verified desc, last_updated desc);

create unique index menus_source_fingerprint_unique
  on public.menus (google_place_id, source_type, content_fingerprint)
  where content_fingerprint is not null;

create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_sections_order_idx
  on public.menu_sections (menu_id, sort_order, id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.menu_sections(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  price numeric(14,2) check (price is null or price >= 0),
  currency char(3) not null default 'VND',
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_image_url_protocol check (
    image_url is null or image_url ~* '^https?://'
  )
);

create index menu_items_order_idx
  on public.menu_items (section_id, sort_order, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute procedure public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
  for each row execute procedure public.set_updated_at();
create trigger couple_sessions_set_updated_at before update on public.couple_sessions
  for each row execute procedure public.set_updated_at();
create trigger session_members_set_updated_at before update on public.session_members
  for each row execute procedure public.set_updated_at();
create trigger swipes_set_updated_at before update on public.swipes
  for each row execute procedure public.set_updated_at();
create trigger place_notes_set_updated_at before update on public.place_notes
  for each row execute procedure public.set_updated_at();
create trigger menus_set_updated_at before update on public.menus
  for each row execute procedure public.set_updated_at();
create trigger menu_sections_set_updated_at before update on public.menu_sections
  for each row execute procedure public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.collections enable row level security;
alter table public.saved_places enable row level security;
alter table public.couple_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.session_candidates enable row level security;
alter table public.swipes enable row level security;
alter table public.place_notes enable row level security;
alter table public.menus enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_items enable row level security;

create policy "users read own profile"
  on public.profiles for select using (id = (select auth.uid()));
create policy "users update own profile"
  on public.profiles for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "users manage own preferences"
  on public.user_preferences for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users manage own collections"
  on public.collections for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users read own saved places"
  on public.saved_places for select using (user_id = (select auth.uid()));
create policy "users insert own saved places"
  on public.saved_places for insert with check (
    user_id = (select auth.uid())
    and (
      collection_id is null
      or exists (
        select 1 from public.collections c
        where c.id = collection_id and c.user_id = (select auth.uid())
      )
    )
  );
create policy "users update own saved places"
  on public.saved_places for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      collection_id is null
      or exists (
        select 1 from public.collections c
        where c.id = collection_id and c.user_id = (select auth.uid())
      )
    )
  );
create policy "users delete own saved places"
  on public.saved_places for delete using (user_id = (select auth.uid()));

create policy "creators read own couple sessions"
  on public.couple_sessions for select
  using (creator_user_id = (select auth.uid()));
create policy "users create couple sessions"
  on public.couple_sessions for insert
  with check (creator_user_id = (select auth.uid()) and creator_guest_id is null);

-- Session membership, candidates, and swipes are intentionally accessed through
-- server APIs using the service role. This prevents one member from querying the
-- other member's hidden swipe decisions. Guest access is authorized by an opaque,
-- hashed token at the API layer rather than by exposing database credentials.

create policy "users manage own place history"
  on public.place_notes for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "anyone reads verified menus"
  on public.menus for select using (verified = true);
create policy "contributors read own menus"
  on public.menus for select using (contributed_by = (select auth.uid()));
create policy "contributors create unverified menus"
  on public.menus for insert with check (
    contributed_by = (select auth.uid()) and verified = false
  );
create policy "contributors update own unverified menus"
  on public.menus for update
  using (contributed_by = (select auth.uid()) and verified = false)
  with check (contributed_by = (select auth.uid()) and verified = false);
create policy "contributors delete own unverified menus"
  on public.menus for delete
  using (contributed_by = (select auth.uid()) and verified = false);

create policy "anyone reads sections of visible menus"
  on public.menu_sections for select using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and (m.verified = true or m.contributed_by = (select auth.uid()))
    )
  );
create policy "contributors manage own menu sections"
  on public.menu_sections for all
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.contributed_by = (select auth.uid())
        and m.verified = false
    )
  )
  with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.contributed_by = (select auth.uid())
        and m.verified = false
    )
  );

create policy "anyone reads items of visible menus"
  on public.menu_items for select using (
    exists (
      select 1
      from public.menu_sections s
      join public.menus m on m.id = s.menu_id
      where s.id = section_id
        and (m.verified = true or m.contributed_by = (select auth.uid()))
    )
  );
create policy "contributors manage own menu items"
  on public.menu_items for all
  using (
    exists (
      select 1
      from public.menu_sections s
      join public.menus m on m.id = s.menu_id
      where s.id = section_id
        and m.contributed_by = (select auth.uid())
        and m.verified = false
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sections s
      join public.menus m on m.id = s.menu_id
      where s.id = section_id
        and m.contributed_by = (select auth.uid())
        and m.verified = false
    )
  );
