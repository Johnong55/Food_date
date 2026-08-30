begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'profiles', 'user_preferences', 'collections', 'saved_places',
        'couple_sessions', 'session_members', 'session_candidates', 'swipes',
        'session_member_credentials', 'place_notes', 'menus',
        'menu_sections', 'menu_items'
      ])
  ),
  'RLS is enabled on every exposed application table'
);

select hasnt_table_privilege('anon', 'public.profiles', 'SELECT');
select hasnt_table_privilege('anon', 'public.couple_sessions', 'SELECT');
select hasnt_table_privilege('anon', 'public.session_members', 'SELECT');
select hasnt_table_privilege('anon', 'public.session_candidates', 'SELECT');
select hasnt_table_privilege('anon', 'public.swipes', 'SELECT');
select hasnt_table_privilege('anon', 'public.session_member_credentials', 'SELECT');

select hasnt_table_privilege('authenticated', 'public.couple_sessions', 'SELECT');
select hasnt_table_privilege('authenticated', 'public.session_members', 'SELECT');
select hasnt_table_privilege('authenticated', 'public.session_candidates', 'SELECT');
select hasnt_table_privilege('authenticated', 'public.swipes', 'SELECT');
select hasnt_table_privilege('authenticated', 'public.session_member_credentials', 'SELECT');

select has_table_privilege('anon', 'public.menus', 'SELECT');
select has_table_privilege('anon', 'public.menu_sections', 'SELECT');
select has_table_privilege('anon', 'public.menu_items', 'SELECT');
select has_table_privilege('authenticated', 'public.profiles', 'SELECT');
select has_table_privilege('authenticated', 'public.profiles', 'UPDATE');
select has_table_privilege('authenticated', 'public.user_preferences', 'SELECT');
select has_table_privilege('authenticated', 'public.collections', 'SELECT');
select has_table_privilege('authenticated', 'public.saved_places', 'SELECT');
select has_table_privilege('authenticated', 'public.place_notes', 'SELECT');

select hasnt_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE');
select hasnt_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE');
select hasnt_function_privilege(
  'authenticated',
  'public.create_couple_session(text, uuid, uuid, text, text)',
  'EXECUTE'
);
select hasnt_function_privilege(
  'authenticated',
  'public.join_couple_session(text, uuid, uuid, text, text)',
  'EXECUTE'
);
select hasnt_function_privilege(
  'authenticated',
  'public.set_couple_member_preferences(uuid, uuid, jsonb)',
  'EXECUTE'
);
select hasnt_function_privilege(
  'authenticated',
  'public.initialize_couple_candidates(uuid, uuid, text[])',
  'EXECUTE'
);
select hasnt_function_privilege(
  'authenticated',
  'public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)',
  'EXECUTE'
);

select * from finish();
rollback;
