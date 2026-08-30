-- Secure guest membership and transactional Couple Session workflows.
-- Raw member tokens only exist in HttpOnly cookies; PostgreSQL stores SHA-256 hashes.

create table public.session_member_credentials (
  member_id uuid primary key references public.session_members(id) on delete cascade,
  token_hash char(64) not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_credential_expiry_valid check (expires_at > created_at)
);

create index session_member_credentials_expiry_idx
  on public.session_member_credentials (expires_at)
  where revoked_at is null;

alter table public.session_member_credentials enable row level security;

-- No client RLS policies by design. Only service_role RPC calls may access these rows.

create or replace function public.create_couple_session(
  p_code text,
  p_creator_user_id uuid,
  p_creator_guest_id uuid,
  p_display_name text,
  p_token_hash text
)
returns table (session_id uuid, member_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_member_id uuid;
  v_expires_at timestamptz := now() + interval '24 hours';
begin
  if ((p_creator_user_id is not null)::integer +
      (p_creator_guest_id is not null)::integer) <> 1 then
    raise exception using errcode = '22023', message = 'invalid_creator_identity';
  end if;
  if p_creator_guest_id is not null and p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_member_token';
  end if;

  insert into public.couple_sessions (
    code,
    creator_user_id,
    creator_guest_id,
    expires_at
  ) values (
    upper(p_code),
    p_creator_user_id,
    p_creator_guest_id,
    v_expires_at
  )
  returning id into v_session_id;

  insert into public.session_members (
    session_id,
    user_id,
    guest_id,
    display_name
  ) values (
    v_session_id,
    p_creator_user_id,
    p_creator_guest_id,
    p_display_name
  )
  returning id into v_member_id;

  if p_creator_guest_id is not null then
    insert into public.session_member_credentials (member_id, token_hash, expires_at)
    values (v_member_id, p_token_hash, v_expires_at);
  end if;

  return query select v_session_id, v_member_id, v_expires_at;
end;
$$;

create or replace function public.join_couple_session(
  p_code text,
  p_user_id uuid,
  p_guest_id uuid,
  p_display_name text,
  p_token_hash text
)
returns table (
  session_id uuid,
  member_id uuid,
  expires_at timestamptz,
  already_member boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.couple_sessions%rowtype;
  v_member_id uuid;
begin
  if ((p_user_id is not null)::integer + (p_guest_id is not null)::integer) <> 1 then
    raise exception using errcode = '22023', message = 'invalid_member_identity';
  end if;
  if p_guest_id is not null and p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_member_token';
  end if;

  select * into v_session
  from public.couple_sessions
  where code = upper(p_code)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'session_not_found';
  end if;
  if v_session.expires_at <= now() or v_session.status = 'expired' then
    raise exception using errcode = 'P0001', message = 'session_expired';
  end if;
  if v_session.status <> 'collecting_preferences' then
    raise exception using errcode = 'P0001', message = 'session_closed';
  end if;

  if p_user_id is not null then
    select sm.id into v_member_id
    from public.session_members sm
    where sm.session_id = v_session.id and sm.user_id = p_user_id;
    if found then
      return query select v_session.id, v_member_id, v_session.expires_at, true;
      return;
    end if;
  end if;

  if (
    select count(*)
    from public.session_members sm
    where sm.session_id = v_session.id
  ) >= 2 then
    raise exception using errcode = 'P0001', message = 'session_full';
  end if;

  insert into public.session_members (
    session_id,
    user_id,
    guest_id,
    display_name
  ) values (
    v_session.id,
    p_user_id,
    p_guest_id,
    p_display_name
  )
  returning id into v_member_id;

  if p_guest_id is not null then
    insert into public.session_member_credentials (member_id, token_hash, expires_at)
    values (v_member_id, p_token_hash, v_session.expires_at);
  end if;

  return query select v_session.id, v_member_id, v_session.expires_at, false;
end;
$$;

create or replace function public.set_couple_member_preferences(
  p_session_id uuid,
  p_member_id uuid,
  p_preferences jsonb
)
returns table (
  session_status public.couple_session_status,
  member_count integer,
  ready_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.couple_session_status;
  v_member_count integer;
  v_ready_count integer;
begin
  if jsonb_typeof(p_preferences) <> 'object' or p_preferences = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'invalid_preferences';
  end if;

  perform 1
  from public.couple_sessions
  where id = p_session_id and expires_at > now() and status <> 'expired'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'session_not_found';
  end if;

  update public.session_members
  set preferences_json = p_preferences
  where id = p_member_id and session_id = p_session_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'membership_invalid';
  end if;

  select
    count(*)::integer,
    count(*) filter (where preferences_json <> '{}'::jsonb)::integer
  into v_member_count, v_ready_count
  from public.session_members
  where session_id = p_session_id;

  v_status := case
    when v_member_count = 2 and v_ready_count = 2 then 'swiping'::public.couple_session_status
    else 'collecting_preferences'::public.couple_session_status
  end;

  update public.couple_sessions set status = v_status where id = p_session_id;
  return query select v_status, v_member_count, v_ready_count;
end;
$$;

revoke all on table public.session_member_credentials from public, anon, authenticated;
grant all on table public.session_member_credentials to service_role;

revoke all on function public.create_couple_session(text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.join_couple_session(text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.set_couple_member_preferences(uuid, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_couple_session(text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.join_couple_session(text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.set_couple_member_preferences(uuid, uuid, jsonb)
  to service_role;
