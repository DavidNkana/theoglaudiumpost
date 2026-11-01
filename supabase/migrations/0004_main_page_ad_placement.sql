-- =============================================================================
-- The Main Page Ad placement
-- =============================================================================
-- Administrators enter every advertisement under a single ad product: the
-- "Main Page Ad". The home article grid reads the ads filed under this
-- placement, so the grid and the admin dashboard always agree on where an ad
-- belongs.
-- =============================================================================

insert into public.ad_placements (name, placement_info, status)
values ('main_page_ad', 'Main Page Ad (9:16)', 'active')
on conflict (name) do nothing;
