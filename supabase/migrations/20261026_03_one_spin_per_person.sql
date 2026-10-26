-- ============================================================
--  20261026_03_one_spin_per_person.sql
--  One spin per person per event, and required fields checked in the DB.
--
--  Before: draw_prize() drew for any payload. The publishable key is public,
--  so anyone could call /rest/v1/rpc/draw_prize in a loop (even with an
--  empty payload) and drain every prize; a visitor could also just reload
--  the page and register again.
--
--  After:
--  - A person = same phone (digits only) OR same email (trimmed, lower-case)
--    within the event. A repeat returns the result of their first spin with
--    already_played = true; nothing is drawn or stored.
--  - Base fields that the event's form marks enabled + required must be
--    non-empty, otherwise the call is rejected ('missing required field: …').
--  - Draws for one event are serialised with an advisory lock, so two
--    simultaneous requests for the same person can't both win.
--
--  The return type gains a column, so the function is dropped and recreated.
--  Run in Supabase SQL Editor BEFORE deploying the matching frontend
--  (the current frontend ignores the extra column, so it keeps working).
-- ============================================================

create index if not exists registrations_event_phone_digits_idx
  on registrations (event_id, (regexp_replace(coalesce(phone, ''), '\D', '', 'g')));
create index if not exists registrations_event_email_norm_idx
  on registrations (event_id, (lower(btrim(coalesce(email, '')))));

drop function if exists draw_prize(uuid, jsonb);

create function draw_prize(p_event_id uuid, p_registration jsonb)
returns table (prize_id text, prize_label text, remaining int, already_played boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_config jsonb;
  v_fields jsonb;
  v_phone  text := regexp_replace(coalesce(p_registration->>'phone', ''), '\D', '', 'g');
  v_email  text := lower(btrim(coalesce(p_registration->>'email', '')));
  v_prev   record;
  v_total  int;
  v_pick   int;
  f        jsonb;
  v_col    text;
  r        record;
begin
  select config into v_config from events where id = p_event_id;
  if not found then
    raise exception 'event not found';
  end if;

  -- Required base fields, as configured in admin (no formFields = default form: all six required)
  v_fields := coalesce(v_config->'formFields', '[
    {"key":"firstName","required":true},{"key":"lastName","required":true},
    {"key":"email","required":true},{"key":"phone","required":true},
    {"key":"position","required":true},{"key":"company","required":true}]'::jsonb);
  for f in select * from jsonb_array_elements(v_fields) loop
    v_col := case f->>'key'
      when 'firstName' then 'first_name' when 'lastName' then 'last_name'
      when 'email' then 'email' when 'phone' then 'phone'
      when 'position' then 'position' when 'company' then 'company' end;
    if v_col is not null
       and coalesce(f->'enabled', 'true'::jsonb) <> 'false'::jsonb   -- jsonb compare: odd values never raise
       and f->'required' = 'true'::jsonb
       and btrim(coalesce(p_registration->>v_col, '')) = '' then
      raise exception 'missing required field: %', v_col;
    end if;
  end loop;

  -- Serialise draws per event (also covers the sold-out case, where no prize rows get locked)
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));

  -- Already played? Same phone digits or same normalised email in this event
  if v_phone <> '' or v_email <> '' then
    select g.prize_id, g.prize_label into v_prev
      from registrations g
     where g.event_id = p_event_id
       and ((v_phone <> '' and regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') = v_phone)
         or (v_email <> '' and lower(btrim(coalesce(g.email, ''))) = v_email))
     order by g.created_at
     limit 1;
    if found then
      prize_id       := nullif(v_prev.prize_id, '');
      prize_label    := coalesce(v_prev.prize_label, '');
      remaining      := coalesce((select p.quantity - p.used from prizes p
                                   where p.event_id = p_event_id and p.id = v_prev.prize_id), 0);
      already_played := true;
      return next;
      return;
    end if;
  end if;

  already_played := false;

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
