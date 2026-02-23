-- =============================================
-- SEED ALL 10 KNOXVILLE VENUES
-- Run this in Supabase SQL Editor
-- Uses UPSERT: inserts new venues, updates existing ones
-- =============================================

-- Step 1: Ensure required columns exist
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS staff_code VARCHAR(6);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS review_count INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS vibe TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS cover_price TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS cam_coming_soon BOOLEAN DEFAULT FALSE;

-- Step 2: Ensure slug unique index exists (needed for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);

-- Step 3: Remove old venues no longer in the lineup
DELETE FROM venue_recaps WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venue_comments WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM headcounts WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM clicker_logs WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire');

-- =============================================
-- Step 4: UPSERT all 10 venues ONE AT A TIME
-- Each uses ON CONFLICT (slug) DO UPDATE so it
-- works whether the venue exists or not
-- =============================================

-- 1. The Hill Bar & Grill
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'The Hill Bar & Grill', 'the-hill', 'knoxville', 'bar',
  35.96389, -83.92806,
  '1105 Forest Ave, Knoxville, TN 37916',
  '(865) 540-1011', 'thehillknox.com',
  '11 AM - 3 AM, 7 days',
  'Live music joint, bar and grill in Fort Sanders near UT campus. Award-winning wings, cold beer, trivia nights, and big game energy since 2007.',
  'HILL01', true, 1, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 2. Cool Beans
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Cool Beans', 'cool-beans', 'knoxville', 'bar',
  35.95470, -83.93518,
  '1817 Lake Ave, Knoxville, TN 37916',
  '(865) 522-6417', 'coolbeansbar.com',
  '11 AM - 3 AM, 7 days',
  'Classic strip dive bar. Pool tables, cheap drinks, late nights. A Knoxville Strip staple and a no-frills good time.',
  'COOL01', true, 2, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 3. Half Barrel
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Half Barrel', 'half-barrel', 'knoxville', 'bar',
  35.95582, -83.93492,
  '1829 Cumberland Ave, Knoxville, TN 37916',
  '(865) 595-4848', 'hb.smithbars.com',
  '3 PM - 3 AM daily',
  '35+ draft beers, massive bourbon selection, pub grub, trivia nights, and sports on TV. Craft beer heaven on the strip.',
  'HALF01', true, 3, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 4. Sunspot
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Sunspot', 'sunspot', 'knoxville', 'bar',
  35.95373, -83.93928,
  '2200 Cumberland Ave, Knoxville, TN 37916',
  '(865) 637-4663', 'sunspotrestaurant.com',
  '11 AM - 10 PM daily',
  'Southwestern, Caribbean and Latin American fare with vegetarian options, draft brews, and a great patio scene.',
  'SUNSP1', true, 4, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 5. Old City Sports Bar
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Old City Sports Bar', 'old-city-sports', 'knoxville', 'bar',
  35.97023, -83.91827,
  '106 S Central St, Knoxville, TN 37902',
  '(865) 474-1039', 'oldcitysportsbar.com',
  '11 AM - 1:30 AM varies',
  'Best-rated sports bar in Knoxville. 30+ HD TVs, two balconies, 160-inch video wall. FREE beer until first score on game days.',
  'OCSB01', true, 5, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 6. Taqueria Mares
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Taqueria Mares', 'taqueria-mares', 'knoxville', 'bar',
  35.95461, -83.93718,
  '2008 Cumberland Ave, Knoxville, TN 37916',
  '(865) 240-3547', 'taqueriamaresnew.toast.site',
  '11 AM - 3 AM varies',
  'Authentic Mexican on the strip. Burritos, tacos, bowls. Famous Barbie Margarita and horchata. THE late-night food spot.',
  'MARE01', true, 6, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 7. Hannas
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Hannas', 'hannas', 'knoxville', 'bar',
  35.95506, -83.93535,
  '1836 Cumberland Ave, Knoxville, TN 37916',
  '(865) 522-9933',
  'Thu-Sat 9pm-3am',
  'Strip institution since 1994. Two floors plus huge patio. 100+ beers, 200+ liquors. Dancing, pool, live music. THE 21st birthday spot.',
  'HANN01', true, 7, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  hours = EXCLUDED.hours, description = EXCLUDED.description,
  staff_code = EXCLUDED.staff_code, is_active = true;

-- 8. Yacht Club
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'Yacht Club', 'yacht-club', 'knoxville', 'bar',
  35.95671, -83.93268,
  '721 S 17th St, Knoxville, TN 37916',
  '(865) 673-3500',
  'M-Th 4pm-3am, F 8pm-3am, Sat 4pm-3am',
  'Barcade gem. Retro arcade games, N64, GameCube. Nearly 100 beers. Shot plus PBR pregame deal.',
  'YACHT1', true, 8, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  hours = EXCLUDED.hours, description = EXCLUDED.description,
  staff_code = EXCLUDED.staff_code, is_active = true;

-- 9. LiterBoard
INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'LiterBoard', 'literboard', 'knoxville', 'bar',
  35.95504, -83.93570,
  '1848 Cumberland Ave, Knoxville, TN 37916',
  '(865) 247-4582', 'literboardknox.com',
  'W-Sat 8pm-3am',
  'Two-floor gaming bar. Retro consoles downstairs, bar and balcony upstairs. Craft hot dogs, trivia, karaoke, live DJs.',
  'LITER1', true, 9, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, phone = EXCLUDED.phone,
  website = EXCLUDED.website, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- 10. The Bookstore
INSERT INTO venues (name, slug, city, category, lat, lng, address, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES (
  'The Bookstore', 'the-bookstore', 'knoxville', 'bar',
  35.95585, -83.93214,
  '821 Melrose Pl, Knoxville, TN 37916',
  'W-Sat 8pm-2am',
  'Intimate newer spot off the strip on Melrose Place. Low-key vibes, cocktail-focused.',
  'BOOK01', true, 10, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address, hours = EXCLUDED.hours,
  description = EXCLUDED.description, staff_code = EXCLUDED.staff_code,
  is_active = true;

-- =============================================
-- Step 5: Verify — should show exactly 10 rows
-- =============================================
SELECT name, slug, lat, lng, is_active
FROM venues
WHERE city = 'knoxville'
ORDER BY sort_order;
