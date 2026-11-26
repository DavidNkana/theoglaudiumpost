-- Community image posts, kept separate from notices/announcements.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  body text, image_url text, status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists community_posts_published_idx on public.community_posts (status, published_at desc, created_at desc);
drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at before update on public.community_posts for each row execute function public.touch_updated_at();
alter table public.community_posts enable row level security;
drop policy if exists community_posts_public_read on public.community_posts;
create policy community_posts_public_read on public.community_posts for select to anon, authenticated using (status = 'published' or public.is_admin());
drop policy if exists community_posts_admin_write on public.community_posts;
create policy community_posts_admin_write on public.community_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
