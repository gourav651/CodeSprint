-- ============================================================
-- Live Contests migration
-- Run once in your Supabase SQL Editor
-- ============================================================

-- The contest itself
create table if not exists contests (
  id            uuid primary key default extensions.uuid_generate_v4(),
  title         text not null,
  description   text,
  host_user_id  text not null,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  status        text default 'upcoming', -- upcoming | live | ended
  max_participants integer default 20,
  created_at    timestamptz default now()
);

-- Problems assigned to a contest
create table if not exists contest_problems (
  id          uuid primary key default extensions.uuid_generate_v4(),
  contest_id  uuid references contests(id) on delete cascade,
  problem_id  uuid references problems(id) on delete cascade,
  position    integer not null,
  unique(contest_id, problem_id)
);

-- Who joined a contest
create table if not exists contest_participants (
  id          uuid primary key default extensions.uuid_generate_v4(),
  contest_id  uuid references contests(id) on delete cascade,
  user_id     text not null,
  joined_at   timestamptz default now(),
  unique(contest_id, user_id)
);

-- Submissions made during a contest
create table if not exists contest_submissions (
  id             uuid primary key default extensions.uuid_generate_v4(),
  contest_id     uuid references contests(id) on delete cascade,
  submission_id  uuid references submissions(id) on delete cascade,
  user_id        text not null,
  problem_id     uuid references problems(id) on delete cascade,
  score          integer default 0,
  submitted_at   timestamptz default now()
);

alter table contests enable row level security;
alter table contest_problems enable row level security;
alter table contest_participants enable row level security;
alter table contest_submissions enable row level security;
  