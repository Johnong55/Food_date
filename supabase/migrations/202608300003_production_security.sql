-- STEP 15 production hardening: explicit least-privilege grants.
-- RLS remains the row boundary; grants below are the table/function boundary.

revoke all on table
  public.profiles,
  public.user_preferences,
  public.collections,
  public.saved_places,
  public.couple_sessions,
  public.session_members,
  public.session_candidates,
  public.swipes,
  public.session_member_credentials,
  public.place_notes,
  public.menus,
  public.menu_sections,
  public.menu_items
from public, anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.user_preferences,
  public.collections,
  public.saved_places,
  public.place_notes
to authenticated;

-- Verified menu rows are public through RLS. Authenticated contributors may
-- manage only their own unverified menu rows through the existing policies.
grant select on table
  public.menus,
  public.menu_sections,
  public.menu_items
to anon;
grant select, insert, update, delete on table
  public.menus,
  public.menu_sections,
  public.menu_items
to authenticated;

-- Couple data and hidden swipes are intentionally server-only. The service
-- role authorizes opaque member cookies before calling the transactional RPCs.
grant all on table
  public.profiles,
  public.user_preferences,
  public.collections,
  public.saved_places,
  public.couple_sessions,
  public.session_members,
  public.session_candidates,
  public.swipes,
  public.session_member_credentials,
  public.place_notes,
  public.menus,
  public.menu_sections,
  public.menu_items
to service_role;

revoke all on function public.set_updated_at()
  from public, anon, authenticated;
revoke all on function public.handle_new_user()
  from public, anon, authenticated;
revoke all on function public.create_couple_session(text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.join_couple_session(text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.set_couple_member_preferences(uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.initialize_couple_candidates(uuid, uuid, text[])
  from public, anon, authenticated;
revoke all on function public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)
  from public, anon, authenticated;

grant execute on function public.create_couple_session(text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.join_couple_session(text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.set_couple_member_preferences(uuid, uuid, jsonb)
  to service_role;
grant execute on function public.initialize_couple_candidates(uuid, uuid, text[])
  to service_role;
grant execute on function public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)
  to service_role;
