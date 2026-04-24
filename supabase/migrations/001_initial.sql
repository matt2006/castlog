-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  avatar_emoji text default '🎣',
  avatar_color text default '#00E5C8',
  role text default 'angler' check (role in ('angler', 'admin')),
  force_password_change boolean default true,
  created_at timestamptz default now()
);

-- Fish catches
create table catches (
  id uuid primary key default gen_random_uuid(),
  angler_id uuid references profiles(id) on delete cascade,
  species text not null,
  weight_kg numeric(6,3) not null,
  method text,
  location_name text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  photo_url text,
  weather_snapshot jsonb,
  competition_id uuid,
  timestamp timestamptz default now()
);

-- Competitions
create table competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id),
  join_code text unique default substr(md5(random()::text), 1, 6),
  start_time timestamptz not null,
  end_time timestamptz,
  status text default 'upcoming' check (status in ('upcoming', 'live', 'ended')),
  created_at timestamptz default now()
);

-- Competition membership
create table competition_members (
  competition_id uuid references competitions(id) on delete cascade,
  angler_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (competition_id, angler_id)
);

-- Achievements earned
create table achievements_earned (
  id uuid primary key default gen_random_uuid(),
  angler_id uuid references profiles(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz default now(),
  unique(angler_id, achievement_id)
);

-- RLS
alter table profiles enable row level security;
alter table catches enable row level security;
alter table competitions enable row level security;
alter table competition_members enable row level security;
alter table achievements_earned enable row level security;

-- Profiles policies
create policy "profiles: public read" on profiles for select using (true);
create policy "profiles: own write" on profiles for update using (auth.uid() = id);
create policy "profiles: admin all" on profiles for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Catches policies
create policy "catches: public read" on catches for select using (true);
create policy "catches: own insert" on catches for insert with check (auth.uid() = angler_id);
create policy "catches: own delete" on catches for delete using (auth.uid() = angler_id);
create policy "catches: admin all" on catches for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Competitions policies
create policy "competitions: public read" on competitions for select using (true);
create policy "competitions: admin all" on competitions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Competition members policies
create policy "members: public read" on competition_members for select using (true);
create policy "members: own join" on competition_members for insert with check (auth.uid() = angler_id);
create policy "members: admin all" on competition_members for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Achievements policies
create policy "achievements: public read" on achievements_earned for select using (true);
create policy "achievements: own insert" on achievements_earned for insert with check (auth.uid() = angler_id);
create policy "achievements: admin all" on achievements_earned for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Realtime publications
alter publication supabase_realtime add table catches;
alter publication supabase_realtime add table competitions;
alter publication supabase_realtime add table profiles;
