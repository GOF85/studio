create table if not exists comercial_briefings (
  id uuid default gen_random_uuid() primary key,
  os_id uuid references eventos(id) on delete cascade not null,
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comercial_briefings_os_id on comercial_briefings(os_id);

alter table comercial_briefings enable row level security;

create policy "Enable read access for all users"
on comercial_briefings for select
using (true);

create policy "Enable insert for authenticated users only"
on comercial_briefings for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on comercial_briefings for update
using (auth.role() = 'authenticated');
