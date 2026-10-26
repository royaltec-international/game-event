-- ============================================================
--  supabase/tests/one_spin_per_person.test.sql (migration 03)
--  Runs after draw_prize.test.sql in the same throwaway DB.
-- ============================================================
\set ON_ERROR_STOP on

-- Event 3: default form (no formFields → all six base fields required), plenty of stock
-- Event 4: phone disabled but still flagged required → must not be enforced
insert into events (id, name, slug, config) values
  ('00000000-0000-0000-0000-000000000003', 'Dedupe', 'dedupe', '{}'),
  ('00000000-0000-0000-0000-000000000004', 'NoPhone', 'nophone',
   '{"formFields":[{"key":"firstName","enabled":true,"required":true},{"key":"phone","enabled":false,"required":true}]}');
insert into prizes (id, event_id, label, quantity, used) values
  ('a', '00000000-0000-0000-0000-000000000003', 'A', 50, 0),
  ('b', '00000000-0000-0000-0000-000000000003', 'B', 50, 0),
  ('a', '00000000-0000-0000-0000-000000000004', 'A', 10, 0);

-- 9. Missing required field is rejected, nothing drawn or stored
do $$
declare v_used int;
begin
  begin
    perform * from draw_prize('00000000-0000-0000-0000-000000000003',
      '{"first_name":"x","last_name":"y","email":"x@y.com","phone":"","position":"p","company":"c"}');
    raise exception 'FAIL missing phone accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm not like 'missing required field: phone%' then raise exception 'FAIL wrong error: %', sqlerrm; end if;
  end;
  select sum(used) into v_used from prizes where event_id = '00000000-0000-0000-0000-000000000003';
  if v_used <> 0 or exists (select 1 from registrations where event_id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL rejected call drew or stored';
  end if;
  raise notice 'PASS required field enforced';
end $$;

-- 10. Disabled field is not enforced even if flagged required
do $$
begin
  perform * from draw_prize('00000000-0000-0000-0000-000000000004', '{"first_name":"n"}');
  raise notice 'PASS disabled field not enforced';
end $$;

-- 11. Same phone (different formatting, different email) → first result, already_played, no new draw
do $$
declare r1 record; r2 record; v_used int; v_regs int;
begin
  select * into r1 from draw_prize('00000000-0000-0000-0000-000000000003',
    '{"first_name":"Som","last_name":"S","email":"som@x.com","phone":"081-234-5678","position":"p","company":"c"}');
  if r1.already_played or r1.prize_id is null then raise exception 'FAIL first spin: %', r1; end if;
  select * into r2 from draw_prize('00000000-0000-0000-0000-000000000003',
    '{"first_name":"Som2","last_name":"S","email":"other@x.com","phone":"0812345678","position":"p","company":"c"}');
  if not r2.already_played or r2.prize_id is distinct from r1.prize_id or r2.prize_label <> r1.prize_label then
    raise exception 'FAIL repeat by phone: first % second %', r1, r2;
  end if;
  select sum(used) into v_used from prizes where event_id = '00000000-0000-0000-0000-000000000003';
  select count(*) into v_regs from registrations where event_id = '00000000-0000-0000-0000-000000000003';
  if v_used <> 1 or v_regs <> 1 then raise exception 'FAIL repeat drew/stored: used % regs %', v_used, v_regs; end if;
  raise notice 'PASS repeat by phone';
end $$;

-- 12. Same email (case/space differences, different phone) → already_played
do $$
declare r record;
begin
  select * into r from draw_prize('00000000-0000-0000-0000-000000000003',
    '{"first_name":"X","last_name":"S","email":"  SOM@X.com ","phone":"0899999999","position":"p","company":"c"}');
  if not r.already_played then raise exception 'FAIL repeat by email not caught'; end if;
  raise notice 'PASS repeat by email';
end $$;

-- 13. Same phone in a different event is a new person there
do $$
declare r record;
begin
  select * into r from draw_prize('00000000-0000-0000-0000-000000000004', '{"first_name":"Som","phone":"0812345678"}');
  if r.already_played then raise exception 'FAIL dedupe leaked across events'; end if;
  raise notice 'PASS dedupe scoped to event';
end $$;

-- 14. Sold-out first visit, then repeat → already_played with no prize
do $$
declare r record;
begin
  perform * from draw_prize('00000000-0000-0000-0000-000000000002', '{"first_name":"late2","phone":"0800000001"}');
  select * into r from draw_prize('00000000-0000-0000-0000-000000000002', '{"first_name":"late2","phone":"0800000001"}');
  if not r.already_played or r.prize_id is not null then raise exception 'FAIL sold-out repeat: %', r; end if;
  raise notice 'PASS sold-out repeat';
end $$;

-- 15. anon can still execute the recreated function
do $$
begin
  if not has_function_privilege('anon', 'draw_prize(uuid, jsonb)', 'execute') then
    raise exception 'FAIL anon lost execute after recreate';
  end if;
  raise notice 'PASS anon execute kept';
end $$;
