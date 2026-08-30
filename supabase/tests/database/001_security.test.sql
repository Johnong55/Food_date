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

select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot read profiles');
select ok(not has_table_privilege('anon', 'public.couple_sessions', 'SELECT'), 'anon cannot read couple sessions');
select ok(not has_table_privilege('anon', 'public.session_members', 'SELECT'), 'anon cannot read session members');
select ok(not has_table_privilege('anon', 'public.session_candidates', 'SELECT'), 'anon cannot read candidates');
select ok(not has_table_privilege('anon', 'public.swipes', 'SELECT'), 'anon cannot read hidden swipes');
select ok(not has_table_privilege('anon', 'public.session_member_credentials', 'SELECT'), 'anon cannot read member credentials');

select ok(not has_table_privilege('authenticated', 'public.couple_sessions', 'SELECT'), 'users cannot query couple sessions directly');
select ok(not has_table_privilege('authenticated', 'public.session_members', 'SELECT'), 'users cannot query session members directly');
select ok(not has_table_privilege('authenticated', 'public.session_candidates', 'SELECT'), 'users cannot query candidates directly');
select ok(not has_table_privilege('authenticated', 'public.swipes', 'SELECT'), 'users cannot query hidden swipes directly');
select ok(not has_table_privilege('authenticated', 'public.session_member_credentials', 'SELECT'), 'users cannot query member credentials');

select ok(has_table_privilege('anon', 'public.menus', 'SELECT'), 'anon can select visible menus through RLS');
select ok(has_table_privilege('anon', 'public.menu_sections', 'SELECT'), 'anon can select visible menu sections through RLS');
select ok(has_table_privilege('anon', 'public.menu_items', 'SELECT'), 'anon can select visible menu items through RLS');
select ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'users can select own profile through RLS');
select ok(has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'users can update own profile through RLS');
select ok(has_table_privilege('authenticated', 'public.user_preferences', 'SELECT'), 'users can select own preferences through RLS');
select ok(has_table_privilege('authenticated', 'public.collections', 'SELECT'), 'users can select own collections through RLS');
select ok(has_table_privilege('authenticated', 'public.saved_places', 'SELECT'), 'users can select own saved places through RLS');
select ok(has_table_privilege('authenticated', 'public.place_notes', 'SELECT'), 'users can select own history through RLS');

select ok(not has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE'), 'anon cannot execute update trigger function');
select ok(not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'), 'anon cannot execute auth trigger function');
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_couple_session(text, uuid, uuid, text, text)',
    'EXECUTE'
  ),
  'users cannot call create-session RPC directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.join_couple_session(text, uuid, uuid, text, text)',
    'EXECUTE'
  ),
  'users cannot call join-session RPC directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_couple_member_preferences(uuid, uuid, jsonb)',
    'EXECUTE'
  ),
  'users cannot call preference RPC directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.initialize_couple_candidates(uuid, uuid, text[])',
    'EXECUTE'
  ),
  'users cannot initialize candidates directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_couple_swipe(uuid, uuid, text, public.swipe_decision)',
    'EXECUTE'
  ),
  'users cannot record swipes directly'
);

select * from finish();
rollback;
