-- ============================================================
--  supabase/schema.sql — run once in Supabase SQL Editor
-- ============================================================

create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  config        jsonb not null,
  is_active     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on events (slug);

create table prizes (
  id            text not null,
  event_id      uuid not null references events(id) on delete cascade,
  label         text not null,
  quantity      int not null,
  used          int not null default 0,
  remaining     int generated always as (quantity - used) stored,
  updated_at    timestamptz default now(),
  primary key (id, event_id)
);

create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  company       text,
  position      text,
  prize_label   text,
  prize_id      text,
  brands        text,
  pdpa_consent  text,
  custom_fields jsonb,
  created_at    timestamptz default now()
);
create index on registrations (event_id);

create or replace function decrement_prize(p_event_id uuid, p_prize_id text)
returns int language plpgsql security definer as $$
declare v_remaining int;
begin
  update prizes set used = used + 1, updated_at = now()
  where id = p_prize_id and event_id = p_event_id and used < quantity
  returning quantity - used into v_remaining;
  return v_remaining;
end; $$;

alter table events        enable row level security;
alter table prizes        enable row level security;
alter table registrations enable row level security;

create policy "anon read events" on events for select to anon using (true);
create policy "auth full events" on events for all    to authenticated using (true) with check (true);

create policy "anon read prizes" on prizes for select to anon using (true);
create policy "auth full prizes" on prizes for all    to authenticated using (true) with check (true);

create policy "anon insert registrations" on registrations for insert to anon with check (true);
create policy "auth full registrations"   on registrations for all    to authenticated using (true) with check (true);

-- ============================================================
--  Storage: prize images
--  Run once. Public bucket so the unauthenticated game page can
--  display prize photos; write access restricted to admins.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('prize-images', 'prize-images', true)
on conflict (id) do nothing;

create policy "public read prize images"
  on storage.objects for select
  to anon
  using (bucket_id = 'prize-images');

create policy "auth write prize images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'prize-images');

create policy "auth update prize images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'prize-images');

create policy "auth delete prize images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'prize-images');
