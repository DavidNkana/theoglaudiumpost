-- =============================================================================
-- Notice categories
-- =============================================================================
-- Community notices are filed under a managed category. The admin dashboard
-- creates and retires these; readers filter the community page by them.
-- =============================================================================

create table if not exists public.notice_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.announcements
  add column if not exists category_id uuid
  references public.notice_categories (id) on delete set null;

create index if not exists announcements_category_id_idx
  on public.announcements (category_id);

alter table public.notice_categories enable row level security;

drop policy if exists notice_categories_public_read on public.notice_categories;
create policy notice_categories_public_read on public.notice_categories
  for select to anon, authenticated using (true);

drop policy if exists notice_categories_admin_write on public.notice_categories;
create policy notice_categories_admin_write on public.notice_categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_notice_categories_updated_at on public.notice_categories;
create trigger set_notice_categories_updated_at
  before update on public.notice_categories
  for each row execute function public.touch_updated_at();

-- Seed the categories a community notice page normally carries.
insert into public.notice_categories (name, slug)
values
  ('General', 'general'),
  ('Lost and Found', 'lost-and-found'),
  ('Funeral Notice', 'funeral-notice'),
  ('Community Notice', 'community-notice'),
  ('Sport', 'sport'),
  ('Schools', 'schools')
on conflict (slug) do nothing;
