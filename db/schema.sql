-- giftbook schema. Safe to re-run. Base tables only: db/migrations/ runs after
-- this and reshapes them. Run with: npm run db:setup
-- Data is private per user: every query filters on the Clerk user id, and
-- gifts can only point at a person owned by the same user.

create table if not exists users (
  clerk_id text primary key,
  country text, -- ISO 3166-1 alpha-2, set during onboarding
  currency text, -- ISO 4217, set during onboarding
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users (clerk_id) on delete cascade,
  name text not null,
  photo_url text,
  budget_amount numeric,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  user_id text not null references users (clerk_id) on delete cascade,
  kind text not null check (kind in ('link', 'idea')),
  title text not null,
  url text,
  image_url text,
  price_amount numeric,
  price_currency text, -- ISO 4217
  shipping_text text,
  shipping_days_min int,
  shipping_days_max int,
  stock_status text check (stock_status in ('in_stock', 'low', 'out', 'unavailable')),
  stock_count int,
  status text not null default 'saved' check (status in ('saved', 'gifted', 'declined')),
  declined_reason text,
  occasion text,
  gifted_on date,
  rating smallint check (rating between 1 and 3),
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  -- The person must belong to the same user as the gift.
  foreign key (person_id, user_id) references people (id, user_id) on delete cascade
);

-- Shared lookup of a shop's delivery times per country. Holds no user data.
create table if not exists shipping_cache (
  shop_domain text not null,
  country text not null, -- ISO 3166-1 alpha-2
  days_min int,
  days_max int,
  text text,
  fetched_at timestamptz not null default now(),
  primary key (shop_domain, country)
);

-- Owned through people.user_id.
create table if not exists person_insights (
  person_id uuid primary key references people (id) on delete cascade,
  themes jsonb,
  suggestions jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists people_user_id_idx on people (user_id);
create index if not exists gifts_user_id_idx on gifts (user_id);
create index if not exists gifts_person_id_idx on gifts (person_id);

-- Claude calls per user per day, for the daily cap (lib/claude.ts).
create table if not exists claude_usage (
  user_id text not null references users (clerk_id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

-- What person_insights was generated from (lib/insights.ts), to know when to redo it.
alter table person_insights add column if not exists source_hash text;

-- Short notes about a person ("Likes sudoku"), separate from gifts. Like
-- gifts, a note can only point at a person owned by the same user.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  user_id text not null references users (clerk_id) on delete cascade,
  text text not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (person_id, user_id) references people (id, user_id) on delete cascade
);

create index if not exists notes_person_id_idx on notes (person_id);

-- Set when someone picks a gift's stock by hand; the daily re-check then
-- leaves stock alone (lib/stock.ts).
alter table gifts add column if not exists stock_manual boolean not null default false;
