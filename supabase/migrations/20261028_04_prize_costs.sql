create table prize_costs (
  prize_id          text not null,
  event_id          uuid not null,
  unit_cost         numeric(10,2) check (unit_cost >= 0),
  vendor_sponsored  boolean not null default false,
  updated_at        timestamptz default now(),
  primary key (prize_id, event_id),
  foreign key (prize_id, event_id) references prizes(id, event_id) on delete cascade
);

alter table prize_costs enable row level security;

create policy "auth full prize_costs"
  on prize_costs for all
  to authenticated
  using (true)
  with check (true);

revoke all on prize_costs from anon;
