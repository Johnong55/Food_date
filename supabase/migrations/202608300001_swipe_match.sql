-- Atomic candidate initialization, private swipes, and mutual match detection.

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
  from public.couple_sessions cs
  where cs.id = p_session_id
    and cs.expires_at > now()
    and cs.status <> 'expired'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'session_not_found';
  end if;

  update public.session_members sm
  set preferences_json = p_preferences
  where sm.id = p_member_id and sm.session_id = p_session_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'membership_invalid';
  end if;

  -- Candidates and swipes belong to the previous intersection. Deleting the
  -- candidates cascades to swipes so a preference edit can never reuse stale choices.
  delete from public.session_candidates sc where sc.session_id = p_session_id;

  select
    count(*)::integer,
    count(*) filter (where sm.preferences_json <> '{}'::jsonb)::integer
  into v_member_count, v_ready_count
  from public.session_members sm
  where sm.session_id = p_session_id;

  v_status := case
    when v_member_count = 2 and v_ready_count = 2
      then 'swiping'::public.couple_session_status
    else 'collecting_preferences'::public.couple_session_status
  end;

  update public.couple_sessions cs
  set status = v_status
  where cs.id = p_session_id;

  return query select v_status, v_member_count, v_ready_count;
end;
$$;

create or replace function public.initialize_couple_candidates(
  p_session_id uuid,
  p_member_id uuid,
  p_google_place_ids text[]
)
returns table (google_place_ids text[], candidate_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.couple_session_status;
  v_member_count integer;
  v_ready_count integer;
  v_existing_count integer;
  v_place_ids text[];
begin
  if cardinality(p_google_place_ids) < 1 or cardinality(p_google_place_ids) > 10 then
    raise exception using errcode = '22023', message = 'invalid_candidate_set';
  end if;
  if exists (
    select 1
    from unnest(p_google_place_ids) as candidate(place_id)
    where char_length(candidate.place_id) < 1
       or char_length(candidate.place_id) > 512
  ) then
    raise exception using errcode = '22023', message = 'invalid_candidate_set';
  end if;
  if (
    select count(distinct candidate.place_id)
    from unnest(p_google_place_ids) as candidate(place_id)
  ) <> cardinality(p_google_place_ids) then
    raise exception using errcode = '22023', message = 'invalid_candidate_set';
  end if;

  select cs.status into v_status
  from public.couple_sessions cs
  where cs.id = p_session_id and cs.expires_at > now()
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'session_not_found';
  end if;
  if v_status in ('completed', 'expired') then
    raise exception using errcode = 'P0001', message = 'session_closed';
  end if;

  perform 1
  from public.session_members sm
  where sm.id = p_member_id and sm.session_id = p_session_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'membership_invalid';
  end if;

  select
    count(*)::integer,
    count(*) filter (where sm.preferences_json <> '{}'::jsonb)::integer
  into v_member_count, v_ready_count
  from public.session_members sm
  where sm.session_id = p_session_id;
  if v_member_count <> 2 or v_ready_count <> 2 then
    raise exception using errcode = 'P0001', message = 'session_not_ready';
  end if;

  select count(*)::integer into v_existing_count
  from public.session_candidates sc
  where sc.session_id = p_session_id;

  if v_existing_count = 0 then
    insert into public.session_candidates (
      session_id,
      google_place_id,
      google_result_position
    )
    select
      p_session_id,
      candidate.place_id,
      (candidate.ordinality - 1)::smallint
    from unnest(p_google_place_ids) with ordinality as candidate(place_id, ordinality)
    order by candidate.ordinality;
  end if;

  select array_agg(sc.google_place_id order by sc.google_result_position)
  into v_place_ids
  from public.session_candidates sc
  where sc.session_id = p_session_id;

  update public.couple_sessions cs
  set status = case
    when cs.status = 'matched' then 'matched'::public.couple_session_status
    else 'swiping'::public.couple_session_status
  end
  where cs.id = p_session_id;

  return query select v_place_ids, cardinality(v_place_ids);
end;
$$;

create or replace function public.record_couple_swipe(
  p_session_id uuid,
  p_member_id uuid,
  p_google_place_id text,
  p_decision public.swipe_decision
)
returns table (
  matched boolean,
  session_status public.couple_session_status,
  own_swipe_count integer,
  candidate_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.couple_session_status;
  v_is_match boolean;
  v_own_swipe_count integer;
  v_candidate_count integer;
begin
  select cs.status into v_status
  from public.couple_sessions cs
  where cs.id = p_session_id and cs.expires_at > now()
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'session_not_found';
  end if;
  if v_status not in ('swiping', 'matched') then
    raise exception using errcode = 'P0001', message = 'session_not_ready';
  end if;

  perform 1
  from public.session_members sm
  where sm.id = p_member_id and sm.session_id = p_session_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'membership_invalid';
  end if;

  perform 1
  from public.session_candidates sc
  where sc.session_id = p_session_id
    and sc.google_place_id = p_google_place_id;
  if not found then
    raise exception using errcode = '22023', message = 'invalid_candidate';
  end if;

  insert into public.swipes (
    session_id,
    member_id,
    google_place_id,
    decision
  ) values (
    p_session_id,
    p_member_id,
    p_google_place_id,
    p_decision
  )
  on conflict (session_id, member_id, google_place_id)
  do update set decision = excluded.decision;

  select count(distinct s.member_id) = 2 into v_is_match
  from public.swipes s
  where s.session_id = p_session_id
    and s.google_place_id = p_google_place_id
    and s.decision in ('right', 'super_like');

  if v_is_match then
    v_status := 'matched'::public.couple_session_status;
    update public.couple_sessions cs
    set status = v_status
    where cs.id = p_session_id;
  end if;

  select count(*)::integer into v_own_swipe_count
  from public.swipes s
  where s.session_id = p_session_id and s.member_id = p_member_id;

  select count(*)::integer into v_candidate_count
  from public.session_candidates sc
  where sc.session_id = p_session_id;

  return query
  select v_is_match, v_status, v_own_swipe_count, v_candidate_count;
end;
$$;

revoke all on function public.initialize_couple_candidates(uuid, uuid, text[])
  from public, anon, authenticated;
revoke all on function public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)
  from public, anon, authenticated;

grant execute on function public.initialize_couple_candidates(uuid, uuid, text[])
  to service_role;
grant execute on function public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)
  to service_role;
