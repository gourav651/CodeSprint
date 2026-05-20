-- Fixed schema for Clerk compatibility
-- Drop existing tables first if they exist
drop table if exists user_progress cascade;
drop table if exists submissions cascade;
drop table if exists bookmarks cascade;
drop table if exists test_cases cascade;
drop table if exists problems cascade;

-- Create tables with text user_id for Clerk compatibility
create table problems (
  id uuid primary key default extensions.uuid_generate_v4(),
  title varchar(255) not null,
  difficulty varchar(10) null 
    check (difficulty in ('Easy', 'Medium', 'Hard')),
  category varchar(50) null,
  description text not null,
  constraints text null,
  starter_code_js text null,
  starter_code_java text null,
  starter_code_cpp text null,
  starter_code_py text null,
  time_limit integer null default 1000,
  memory_limit integer null default 128,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),
  sample_input text null,
  sample_output text null
);

create table bookmarks (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id text not null,
  problem_id uuid references problems(id) on delete cascade,
  created_at timestamptz null default now(),
  unique(user_id, problem_id)
);

create table submissions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id text not null,
  problem_id uuid references problems(id) on delete cascade,
  code text not null,
  language varchar(20) not null,
  status varchar(20) null default 'Pending',
  runtime integer null,
  memory_usage integer null,
  error_message text null,
  judge0_token varchar(255) null,
  submitted_at timestamptz null default now(),
  auto_submitted boolean null default false
);

create table test_cases (
  id uuid primary key default extensions.uuid_generate_v4(),
  problem_id uuid references problems(id) on delete cascade,
  input text not null,
  expected_output text not null,
  is_hidden boolean null default false,
  time_limit integer null default 1000,
  memory_limit integer null default 128,
  created_at timestamptz null default now()
);

create table user_progress (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id text not null,
  problem_id uuid references problems(id) on delete cascade,
  status varchar(20) null default 'Attempted',
  attempts integer null default 0,
  last_attempt_at timestamptz null default now(),
  unique(user_id, problem_id)
);

-- Recommended Indexes
create index idx_problems_difficulty on problems(difficulty);
create index idx_problems_category on problems(category);
create index idx_bookmarks_user_problem on bookmarks(user_id, problem_id);
create index idx_submissions_user_problem on submissions(user_id, problem_id);
create index idx_user_progress_user_problem on user_progress(user_id, problem_id);

-- Enable Row Level Security
alter table problems enable row level security;
alter table bookmarks enable row level security;
alter table submissions enable row level security;
alter table test_cases enable row level security;
alter table user_progress enable row level security;
