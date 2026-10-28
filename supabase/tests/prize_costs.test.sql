-- ============================================================
--  supabase/tests/prize_costs.test.sql (migration 04)
--  Runs after earlier SQL tests in the same throwaway DB.
-- ============================================================
\set ON_ERROR_STOP on

insert into events (id, name, slug, config) values
  ('00000000-0000-0000-0000-000000000005', 'Prize Costs', 'prize-costs', '{}');
insert into prizes (id, event_id, label, quantity, used) values
  ('cascade', '00000000-0000-0000-0000-000000000005', 'Cascade', 10, 0),
  ('negative', '00000000-0000-0000-0000-000000000005', 'Negative', 10, 0);

-- 16. RLS is enabled and no policy grants anon access
do $$
declare v_rls_enabled boolean;
begin
  select relrowsecurity into v_rls_enabled
  from pg_class
  where oid = 'prize_costs'::regclass;

  if not v_rls_enabled then
    raise exception 'FAIL prize_costs RLS is disabled';
  end if;
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prize_costs'
      and 'anon' = any (roles)
  ) then
    raise exception 'FAIL prize_costs has an anon policy';
  end if;
  raise notice 'PASS prize_costs RLS excludes anon';
end $$;

-- 17. Deleting a prize cascades to its private cost row
do $$
begin
  insert into prize_costs (prize_id, event_id, unit_cost)
  values ('cascade', '00000000-0000-0000-0000-000000000005', 125.50);

  delete from prizes
  where id = 'cascade'
    and event_id = '00000000-0000-0000-0000-000000000005';

  if exists (
    select 1 from prize_costs
    where prize_id = 'cascade'
      and event_id = '00000000-0000-0000-0000-000000000005'
  ) then
    raise exception 'FAIL prize_costs row survived prize deletion';
  end if;
  raise notice 'PASS prize_costs cascades on prize deletion';
end $$;

-- 18. Negative unit cost is rejected
do $$
begin
  begin
    insert into prize_costs (prize_id, event_id, unit_cost)
    values ('negative', '00000000-0000-0000-0000-000000000005', -0.01);
    raise exception 'FAIL negative prize cost accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS negative prize cost rejected';
end $$;
