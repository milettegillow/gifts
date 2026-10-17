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
