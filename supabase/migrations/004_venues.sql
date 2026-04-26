-- ── Venues table ──────────────────────────────────────────────────────────────

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_text text,
  size_description text,
  fish_types text,
  notes text,
  created_at timestamptz default now()
);

-- Add venue_id FK to competitions and catches (nullable, SET NULL on venue delete)
alter table competitions add column venue_id uuid references venues(id) on delete set null;
alter table catches      add column venue_id uuid references venues(id) on delete set null;

-- RLS
alter table venues enable row level security;

create policy "venues: public read" on venues
  for select using (true);

create policy "venues: admin all" on venues
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Realtime
alter publication supabase_realtime add table venues;

-- ── Seed: 25 Nottinghamshire fisheries ────────────────────────────────────────

insert into venues (name, location_text, size_description, fish_types, notes) values
  ('A1 Pits - South Muskham Fishery', 'Church Lane, South Muskham, NG23 6EQ', '6 lakes + river', 'Carp, Pike, Chub, Roach, Bream', 'Mixed coarse fishery'),
  ('Cromwell Lake Fishery', 'Cromwell, Newark', '18 acres', 'Carp, Catfish, Tench', 'Specimen carp water'),
  ('Sapphire Lakes', 'Newark', '3 lakes (11-18 acres)', 'Carp, Tench, Bream, Roach', 'Established coarse fishery'),
  ('Hallcroft Fishery', 'Retford', '8+ lakes', 'Carp, F1s, Silvers', 'Match venue'),
  ('Lakeside Fishery', 'Retford', '5 lakes', 'Carp, Coarse', 'Day-ticket'),
  ('Hayton Lakes', 'Retford', '7 lakes', 'Carp, Coarse', 'Mixed ability'),
  ('Sherwood Forest Fishery', 'Edwinstowe / Mansfield', '5 lakes', 'Carp, Coarse', 'Woodland setting'),
  ('Little John Lakes', 'Ollerton / Newark', 'Multiple lakes', 'Carp, F1, Silvers', 'Match fishing'),
  ('Janson Fishery', 'Elton, NG13 9EU', '3 lakes', 'Carp, Coarse', 'Coaching venue'),
  ('Springvale Lakes', 'Bevercotes, Newark', 'Multiple lakes', 'Carp, Coarse', 'Quiet fishery'),
  ('Colwick Country Park', 'Nottingham', '24-65 acres', 'Carp, Coarse', 'Public park'),
  ('Holme Pierrepont Lakes', 'Nottingham', '2 lakes', 'Carp, Pike, Coarse', 'Accessible'),
  ('Beeston Canal', 'Nottingham / Beeston', 'Canal', 'Roach, Perch, Pike', 'Urban fishing'),
  ('River Trent', 'Nottingham area', 'Large river', 'Barbel, Chub, Carp, Bream', 'Top coarse river'),
  ('Smeatons Lakes', 'Newark, NG23 6ED', 'Multiple lakes', 'Carp, Coarse', 'River access'),
  ('Welbeck Lakes', 'Worksop', 'Up to 77 acres', 'Carp, Pike, Coarse', 'Estate lakes'),
  ('Clumber Park Lake', 'Worksop', '83 acres', 'Carp, Coarse', 'Natural lake'),
  ('Sandhill Lake', 'Worksop', '7.6 hectares', 'Coarse species', 'Public access'),
  ('Woodend Farm Fishery', 'Sutton-in-Ashfield', 'Multiple lakes', 'Carp, Coarse', 'Quiet venue'),
  ('Oak Tree Lakes', 'Brinsley', 'Multiple ponds', 'Carp, Coarse', 'Local fishery'),
  ('Covert Springs', 'Woodborough', 'Spring-fed lakes', 'Carp, Coarse', 'Clear water'),
  ('Office Lake', 'Thurgarton', 'Small lake', 'Carp, Coarse', 'Day ticket'),
  ('Sookholme Ponds', 'Mansfield', 'Multiple ponds', 'Carp, Coarse', 'Club water'),
  ('Portland Lakes', 'Newark', 'Multiple lakes', 'Carp, Coarse', 'Commercial fishery'),
  ('Wellow Dam', 'Wellow', 'Reservoir', 'Carp, Pike', 'Natural style');
