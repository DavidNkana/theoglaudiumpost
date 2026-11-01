-- =============================================================================
-- Laudium Post — initial schema (Supabase / PostgreSQL 17)
-- =============================================================================
-- Content model for the rebuilt Laudium Post system.
--
-- Design rules:
--  * Admins own all content entry. There is no AI generation, no automated
--    article creation, and no business self-service ad entry.
--  * Readers get read-only access to published content through RLS.
--  * Every write is gated on public.is_admin().
--
-- Apply with:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_initial_schema.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — admin and business accounts (linked to Supabase Auth users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique,
  full_name   text,
  role        text not null default 'business'
                check (role in ('admin', 'business')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Admin and business accounts. role = admin grants full write access via RLS.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- media — uploaded images (stored in the "public-media" storage bucket)
-- -----------------------------------------------------------------------------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  file         text not null,
  storage_path text,
  file_type    text,
  story_type   text,
  upload_type  text not null default 'manual',
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists media_story_type_idx on public.media (story_type);

-- -----------------------------------------------------------------------------
-- categories & tags
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- articles — entered by admins only
-- -----------------------------------------------------------------------------
create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  content          text,
  summary          text,
  cover_id         uuid references public.media (id) on delete set null,
  author_id        uuid references auth.users (id) on delete set null,
  category_id      uuid references public.categories (id) on delete set null,
  article_type     text not null default 'latest'
                     check (article_type in ('latest', 'top', 'featured', 'popular')),
  status           text not null default 'draft'
                     check (status in ('draft', 'published', 'scheduled')),
  scheduled_for    timestamptz,
  published_at     timestamptz,
  meta_title       text,
  meta_description text,
  sources          text[] not null default '{}',
  views            integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_type_idx on public.articles (article_type);
create index if not exists articles_category_idx on public.articles (category_id);
create index if not exists articles_slug_idx on public.articles (slug);

create table if not exists public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

-- -----------------------------------------------------------------------------
-- businesses — directory listings and ad customers
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text,
  category   text,
  email      text,
  phone      text,
  website    text,
  address    text,
  description text,
  logo_url   text,
  status     text not null default 'active'
               check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- campaigns — groups of ads sold together
-- -----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  business_id    uuid references public.businesses (id) on delete set null,
  status         text not null default 'active'
                   check (status in ('active', 'paused', 'ended')),
  payment_status text,
  start_date     timestamptz,
  end_date       timestamptz,
  budget         numeric(12, 2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ad_placements — where an ad can appear (home grid, sidebar, banners, ...)
-- -----------------------------------------------------------------------------
create table if not exists public.ad_placements (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  placement_info text,
  status         text not null default 'active'
                   check (status in ('active', 'inactive')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ads — entered and scheduled by admins
-- -----------------------------------------------------------------------------
create table if not exists public.ads (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  business_name    text,
  business_id      uuid references public.businesses (id) on delete set null,
  campaign_id      uuid references public.campaigns (id) on delete set null,
  image_url        text,
  images           text[] not null default '{}',
  video_url        text,
  click_url        text,
  placement_id     uuid references public.ad_placements (id) on delete set null,
  status           text not null default 'draft'
                     check (status in ('draft', 'active', 'paused', 'expired')),
  placement_date   timestamptz,
  expiry_date      timestamptz,
  amount           numeric(12, 2) not null default 0,
  payment_status   text,
  payment_reference text,
  payment_method   text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  notes            text,
  tags             text[] not null default '{}',
  impressions      integer not null default 0,
  clicks           integer not null default 0,
  total_cost       numeric(12, 2) not null default 0,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ads_placement_idx on public.ads (placement_id);
create index if not exists ads_status_dates_idx on public.ads (status, placement_date, expiry_date);

-- -----------------------------------------------------------------------------
-- announcements (community notices) & events
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  content     text,
  summary     text,
  priority    text not null default 'normal'
                check (priority in ('low', 'normal', 'high', 'urgent')),
  category    text,
  status      text not null default 'published'
                check (status in ('draft', 'published', 'archived')),
  is_funeral  boolean not null default false,
  image_url   text,
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  description text,
  location    text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  image_url   text,
  status      text not null default 'published'
                check (status in ('draft', 'published', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- payments — ad payments recorded by administrators
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  ad_id          uuid references public.ads (id) on delete set null,
  campaign_id    uuid references public.campaigns (id) on delete set null,
  business_id    uuid references public.businesses (id) on delete set null,
  business_name  text,
  amount         numeric(12, 2) not null default 0,
  currency       text not null default 'ZAR',
  status         text not null default 'pending'
                   check (status in ('pending', 'paid', 'failed', 'refunded')),
  reference      text,
  payment_method text,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists payments_business_idx on public.payments (business_id);

-- -----------------------------------------------------------------------------
-- ad event tracking — public-safe counters via a security definer function
-- -----------------------------------------------------------------------------
create or replace function public.track_ad_event(ad_id uuid, event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if event_type = 'click' then
    update public.ads set clicks = clicks + 1 where id = ad_id;
  else
    update public.ads set impressions = impressions + 1 where id = ad_id;
  end if;
end;
$$;

create or replace function public.increment_article_views(article_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.articles set views = views + 1 where id = article_id;
$$;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'media', 'categories', 'tags', 'articles',
    'businesses', 'campaigns', 'ad_placements', 'ads',
    'announcements', 'events', 'payments'
  ]
  loop
    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.media          enable row level security;
alter table public.categories     enable row level security;
alter table public.tags           enable row level security;
alter table public.articles       enable row level security;
alter table public.article_tags   enable row level security;
alter table public.businesses     enable row level security;
alter table public.campaigns      enable row level security;
alter table public.ad_placements  enable row level security;
alter table public.ads            enable row level security;
alter table public.announcements  enable row level security;
alter table public.events         enable row level security;
alter table public.payments      enable row level security;

-- profiles: a user sees their own row; admins see all.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- media: public read, admin write.
drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media
  for select to anon, authenticated using (true);

drop policy if exists media_admin_write on public.media;
create policy media_admin_write on public.media
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- categories / tags: public read, admin write.
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists tags_public_read on public.tags;
create policy tags_public_read on public.tags
  for select to anon, authenticated using (true);
drop policy if exists tags_admin_write on public.tags;
create policy tags_admin_write on public.tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- articles: published content is public; drafts are admin-only.
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon, authenticated
  using (
    status = 'published'
    or public.is_admin()
    or (
      status = 'scheduled'
      and scheduled_for is not null
      and scheduled_for <= now()
    )
  );

drop policy if exists articles_admin_write on public.articles;
create policy articles_admin_write on public.articles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- article_tags: readable with the article, writable by admins.
drop policy if exists article_tags_public_read on public.article_tags;
create policy article_tags_public_read on public.article_tags
  for select to anon, authenticated using (true);
drop policy if exists article_tags_admin_write on public.article_tags;
create policy article_tags_admin_write on public.article_tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- businesses: public read of active listings, admin write.
drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses
  for select to anon, authenticated
  using (status = 'active' or public.is_admin());
drop policy if exists businesses_admin_write on public.businesses;
create policy businesses_admin_write on public.businesses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- campaigns: admin only.
drop policy if exists campaigns_admin_read on public.campaigns;
create policy campaigns_admin_read on public.campaigns
  for select to authenticated using (public.is_admin());
drop policy if exists campaigns_admin_write on public.campaigns;
create policy campaigns_admin_write on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ad_placements: public read, admin write.
drop policy if exists ad_placements_public_read on public.ad_placements;
create policy ad_placements_public_read on public.ad_placements
  for select to anon, authenticated using (true);
drop policy if exists ad_placements_admin_write on public.ad_placements;
create policy ad_placements_admin_write on public.ad_placements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ads: active ads inside their run window are public; everything else is admin.
drop policy if exists ads_public_read on public.ads;
create policy ads_public_read on public.ads
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'active'
      and (placement_date is null or placement_date <= now())
      and (expiry_date is null or expiry_date >= now())
    )
  );

drop policy if exists ads_admin_write on public.ads;
create policy ads_admin_write on public.ads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- announcements / events: published content public, admin write.
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());
drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());
drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- payments: administrators record and manage them; businesses see their own.
drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments
  for select to authenticated
  using (public.is_admin() or business_id = auth.uid());

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Storage: public-media bucket for article covers and ad creatives
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public-media public read" on storage.objects;
create policy "public-media public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-media');

drop policy if exists "public-media admin write" on storage.objects;
create policy "public-media admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'public-media' and public.is_admin())
  with check (bucket_id = 'public-media' and public.is_admin());

-- =============================================================================
-- Seed data: ad placements used by the UI
-- =============================================================================
insert into public.ad_placements (name, placement_info, status)
values
  ('home_banner', 'Home Page Banner', 'active'),
  ('in_article_top', 'In Article Top', 'active'),
  ('in_article_mid', 'In Article Middle', 'active'),
  ('in_article_bottom', 'In Article Bottom', 'active'),
  ('sidebar_top', 'Sidebar Top', 'active'),
  ('sidebar_mid', 'Sidebar Middle', 'active'),
  ('sidebar_bottom', 'Sidebar Bottom', 'active'),
  ('pop_up', 'Pop Up', 'active'),
  ('news_articles', 'News Articles Grid', 'active'),
  ('home_grid', 'Home Grid Card', 'active')
on conflict (name) do nothing;
