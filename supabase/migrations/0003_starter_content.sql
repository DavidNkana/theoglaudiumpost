-- =============================================================================
-- Starter content
-- =============================================================================
-- The article editor requires a category, so the taxonomy has to exist before
-- the first article can be published. These are the standard sections of a
-- local community paper and can be renamed from the admin dashboard.
-- =============================================================================

insert into public.categories (name, slug, description)
values
  ('Laudium News', 'laudium-news', 'News from around Laudium'),
  ('Local Government', 'local-government', 'Municipal and provincial notices'),
  ('Business', 'business', 'Local business and trade'),
  ('Sport', 'sport', 'Clubs, fixtures and results'),
  ('Schools', 'schools', 'Schools, learners and parents'),
  ('Community', 'community', 'Community life and notices'),
  ('Crime and Safety', 'crime-and-safety', 'Crime, policing and safety'),
  ('Obituaries', 'obituaries', 'Notices and memorials'),
  ('Events', 'events', 'What is on'),
  ('Opinion', 'opinion', 'Letters and opinion')
on conflict (slug) do nothing;

insert into public.tags (name, slug)
values
  ('Laudium', 'laudium'),
  ('Vereeniging', 'vereeniging'),
  ('Church Street', 'church-street'),
  ('Main Street', 'main-street'),
  ('Klipheuwel', 'klipheuwel'),
  ('Roodepoort', 'roodepoort'),
  ('Weekend', 'weekend'),
  ('Breaking', 'breaking')
on conflict (slug) do nothing;
