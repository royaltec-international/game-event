-- ============================================================
--  supabase/tests/draw_prize.test.sql
--  Run via supabase/tests/run.sh (throwaway Postgres in Docker).
--  Any failed assertion raises and aborts with a non-zero exit.
-- ============================================================
\set ON_ERROR_STOP on

-- Fixture: one event with a common and a rare prize, one empty event
insert into events (id, name, slug, config) values
  ('00000000-0000-0000-0000-000000000001', 'Test', 'test', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'Empty', 'empty', '{}');
insert into prizes (id, event_id, label, quantity, used) values
  ('common', '00000000-0000-0000-0000-000000000001', 'Common', 900, 0),
  ('rare',   '00000000-0000-0000-0000-000000000001', 'Rare',   100, 0),
  ('gone',   '00000000-0000-0000-0000-000000000001', 'Gone',     5, 5);

-- 1. Draws are proportional to remaining stock: 500 draws from 900/100
--    should give ~50 rare (old uniform weights gave ~100+).
do $$
declare i int; v_rare int;
begin
  for i in 1..500 loop
    perform * from draw_prize('00000000-0000-0000-0000-000000000001', jsonb_build_object('first_name', 'p' || i));
  end loop;
  select used into v_rare from prizes where id = 'rare';
  if v_rare not between 25 and 80 then
    raise exception 'FAIL proportional: rare drawn % times out of 500 (expected ~50)', v_rare;
  end if;
  raise notice 'PASS proportional: rare=%', v_rare;
end $$;

-- 2. Sold-out prize is never drawn
do $$
begin
  if (select used from prizes where id = 'gone') <> 5 then
    raise exception 'FAIL sold-out prize was drawn';
  end if;
  raise notice 'PASS sold-out prize never drawn';
end $$;

-- 3. Every draw stored exactly one registration with the won prize
do $$
declare v_regs int; v_used int;
begin
  select count(*) into v_regs from registrations
    where event_id = '00000000-0000-0000-0000-000000000001' and prize_id in ('common', 'rare');
  select sum(used) into v_used from prizes
    where event_id = '00000000-0000-0000-0000-000000000001' and id in ('common', 'rare');
  if v_regs <> 500 or v_used <> 500 then
    raise exception 'FAIL registrations=% used=% (expected 500/500)', v_regs, v_used;
  end if;
  if exists (select 1 from registrations where prize_id = 'rare' and prize_label <> 'Rare') then
    raise exception 'FAIL prize_label not stored';
  end if;
  raise notice 'PASS one registration per draw';
end $$;

-- 4. Stock never goes past quantity, and draws stop at sold out
do $$
declare i int; v_got int := 0; v_id text;
begin
  for i in 1..600 loop
    select prize_id into v_id from draw_prize('00000000-0000-0000-0000-000000000001', '{}'::jsonb);
    if v_id is not null then v_got := v_got + 1; end if;
  end loop;
  if v_got <> 500 then
    raise exception 'FAIL expected exactly 500 more prizes, got %', v_got;
  end if;
  if exists (select 1 from prizes where used > quantity) then
    raise exception 'FAIL used exceeded quantity';
  end if;
  raise notice 'PASS stops at sold out';
end $$;

-- 5. Sold-out event still records the registration, with no prize
do $$
declare v_id text;
begin
  select prize_id into v_id from draw_prize('00000000-0000-0000-0000-000000000002', '{"first_name":"late","pdpa_consent":"YES"}'::jsonb);
  if v_id is not null then raise exception 'FAIL got prize from empty event'; end if;
  if not exists (select 1 from registrations
                 where event_id = '00000000-0000-0000-0000-000000000002'
                   and first_name = 'late' and prize_id = '' and pdpa_consent = 'YES') then
    raise exception 'FAIL sold-out registration not stored';
  end if;
  raise notice 'PASS sold-out registration stored';
end $$;

-- 6. Unknown event is rejected
do $$
begin
  begin
    perform * from draw_prize('00000000-0000-0000-0000-0000000000ff', '{}'::jsonb);
    raise exception 'FAIL unknown event accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS unknown event rejected';
end $$;

-- 7. Quantity can no longer be set below what was already given out
do $$
begin
  begin
    update prizes set quantity = 50 where id = 'rare' and used > 50;
    if found then raise exception 'FAIL quantity below used accepted'; end if;
  exception when check_violation then null;
  end;
  raise notice 'PASS quantity >= used enforced';
end $$;

-- 8. Permissions: anon may draw but may not call the old client-side decrement
do $$
begin
  if not has_function_privilege('anon', 'draw_prize(uuid, jsonb)', 'execute') then
    raise exception 'FAIL anon cannot execute draw_prize';
  end if;
  if exists (select 1 from pg_proc where proname = 'decrement_prize') then
    raise exception 'FAIL decrement_prize still exists';
  end if;
  raise notice 'PASS permissions';
end $$;
