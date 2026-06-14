-- ============================================================
-- user_badges migration
-- Run this once in your Supabase SQL Editor
-- ============================================================

create table if not exists user_badges (
  id           uuid primary key default extensions.uuid_generate_v4(),
  user_id      text not null,
  badge_id     text not null,
  unlocked_at  timestamptz not null default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_user_badges_user on user_badges(user_id);

alter table user_badges enable row level security;

-- Allow users to read their own badges (via service role key in API routes this is bypassed)
create policy "Users can read their own badges"
  on user_badges for select
  using (auth.uid()::text = user_id);
