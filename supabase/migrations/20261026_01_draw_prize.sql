-- ============================================================
--  20261026_01_draw_prize.sql
--  Move the prize draw from the browser into the database.
--
--  Before: script.js picked a prize with config `weight` (always 10,
--  so every prize had the same chance regardless of stock) and then
--  called decrement_prize — any visitor could call that RPC directly
--  and choose their own prize.
--
--  After: draw_prize() locks the event's prize rows, picks one with
--  probability proportional to its remaining stock, decrements it and
--  stores the registration in the same transaction.
--
--  Run in Supabase SQL Editor BEFORE deploying the matching frontend.
-- ============================================================

-- Admin can no longer set quantity below what was already given out.
-- NOT VALID: existing rows that already violate it (e.g. used 8 / quantity 7)
-- are kept as-is, but every new write is checked.
alter table prizes
  add constraint prizes_used_within_quantity check (used <= quantity) not valid;

create or replace function draw_prize(p_event_id uuid, p_registration jsonb)
returns table (prize_id text, prize_label text, remaining int)
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_pick  int;
  r       record;
begin
  if not exists (select 1 from events where id = p_event_id) then
    raise exception 'event not found';
  end if;

  -- Serialize concurrent draws for this event so stock can't be oversold
  perform 1 from prizes
   where event_id = p_event_id and used < quantity
   order by id
   for update;

  select coalesce(sum(p.quantity - p.used), 0) into v_total
    from prizes p
   where p.event_id = p_event_id and p.used < p.quantity;

  if v_total > 0 then
    -- Weighted by remaining stock: every physical item left is equally likely
    v_pick := floor(random() * v_total)::int;
    for r in
      select p.id, p.label, p.quantity - p.used as rem
        from prizes p
       where p.event_id = p_event_id and p.used < p.quantity
       order by p.id
    loop
      if v_pick < r.rem then
        update prizes set used = used + 1, updated_at = now()
         where id = r.id and event_id = p_event_id;
        prize_id    := r.id;
        prize_label := r.label;
        remaining   := r.rem - 1;
        exit;
      end if;
      v_pick := v_pick - r.rem;
    end loop;
  end if;

  insert into registrations (
    event_id, first_name, last_name, email, phone, company, position,
    prize_label, prize_id, brands, pdpa_consent, custom_fields
  ) values (
    p_event_id,
    coalesce(p_registration->>'first_name', ''),
    coalesce(p_registration->>'last_name', ''),
    coalesce(p_registration->>'email', ''),
    coalesce(p_registration->>'phone', ''),
    coalesce(p_registration->>'company', ''),
    coalesce(p_registration->>'position', ''),
    coalesce(prize_label, ''),
    coalesce(prize_id, ''),
    coalesce(p_registration->>'brands', ''),
    coalesce(p_registration->>'pdpa_consent', 'N/A'),
    case when jsonb_typeof(p_registration->'custom_fields') = 'object'
         then p_registration->'custom_fields' end
  );

  return next;
end; $$;

revoke all on function draw_prize(uuid, jsonb) from public;
grant execute on function draw_prize(uuid, jsonb) to anon, authenticated;
