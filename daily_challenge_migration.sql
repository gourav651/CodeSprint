-- ============================================================
-- Daily Challenge + Streak migration
-- Run once in your Supabase SQL Editor
-- ============================================================

-- One row per calendar day storing which problem is the daily challenge
create table if not exists daily_challenges (
  id             uuid primary key default extensions.uuid_generate_v4(),
  challenge_date date not null unique,
  problem_id     uuid references problems(id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index if not exists idx_daily_challenges_date on daily_challenges(challenge_date);
alter table daily_challenges enable row level security;

-- Per-user streak tracking
create table if not exists daily_streaks (
  id              uuid primary key default extensions.uuid_generate_v4(),
  user_id         text not null unique,
  current_streak  integer not null default 0,
  longest_streak  integer not null default 0,
  last_completed  date,           -- date of last daily challenge completed
  updated_at      timestamptz not null default now()
);

create index if not exists idx_daily_streaks_user on daily_streaks(user_id);
alter table daily_streaks enable row level security;
