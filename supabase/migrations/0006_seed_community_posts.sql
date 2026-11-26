-- Starter content so the Community Posts grid has visible examples after setup.
insert into public.community_posts (title, slug, body, image_url, status, published_at)
values
  ('Community clean-up morning', 'community-clean-up-morning', 'Residents are invited to help keep shared spaces clean. Add the confirmed time and meeting point before publishing your own post.', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80', 'published', now()),
  ('Local market makers', 'local-market-makers', 'A visual post for local makers, stalls and community markets.', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80', 'published', now()),
  ('Youth sports afternoon', 'youth-sports-afternoon', 'Share a community sports activity, practice session or youth programme here.', 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80', 'published', now()),
  ('Library reading circle', 'library-reading-circle', 'A simple community post for reading groups, library events and family activities.', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80', 'published', now()),
  ('Neighbourhood garden project', 'neighbourhood-garden-project', 'Highlight a shared garden, planting project or local environmental effort.', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80', 'published', now()),
  ('Community noticeboard', 'community-noticeboard', 'A flexible image-led post for helpful local information and community announcements.', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80', 'published', now())
on conflict (slug) do nothing;
