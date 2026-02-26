-- venuu Database Migration
-- Run this in your Supabase SQL editor

-- ============================================
-- Update venues table — add new columns
-- ============================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_clicker_live BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS staff_code VARCHAR(6) UNIQUE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS review_count INTEGER;

-- ============================================
-- venue_staff table
-- ============================================

CREATE TABLE IF NOT EXISTS venue_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'door',
  pin_code VARCHAR(6),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(venue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_venue ON venue_staff(venue_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON venue_staff(user_id);

ALTER TABLE venue_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_staff" ON venue_staff FOR SELECT USING (true);
CREATE POLICY "auth_insert_staff" ON venue_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_update_staff" ON venue_staff FOR UPDATE USING (true);

-- ============================================
-- headcounts table
-- ============================================

CREATE TABLE IF NOT EXISTS headcounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  city VARCHAR(20) NOT NULL,
  night_of DATE NOT NULL,
  current_count INTEGER DEFAULT 0 CHECK (current_count >= 0),
  peak_count INTEGER DEFAULT 0,
  last_updated_by UUID,
  is_live BOOLEAN DEFAULT TRUE,
  UNIQUE(venue_id, night_of)
);

CREATE INDEX IF NOT EXISTS idx_headcounts_city_night ON headcounts(city, night_of);
CREATE INDEX IF NOT EXISTS idx_headcounts_venue_night ON headcounts(venue_id, night_of);

ALTER TABLE headcounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_headcounts" ON headcounts FOR SELECT USING (true);
CREATE POLICY "auth_insert_headcounts" ON headcounts FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_update_headcounts" ON headcounts FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE headcounts;

-- ============================================
-- clicker_logs table (staff_id nullable for portal use)
-- ============================================

CREATE TABLE IF NOT EXISTS clicker_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  staff_id UUID,
  action VARCHAR(10) NOT NULL,
  night_of DATE NOT NULL,
  count_after INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clicker_venue_night ON clicker_logs(venue_id, night_of, created_at DESC);

ALTER TABLE clicker_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_logs" ON clicker_logs FOR SELECT USING (true);
CREATE POLICY "auth_insert_logs" ON clicker_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- SQL Functions for atomic count updates
-- ============================================

CREATE OR REPLACE FUNCTION increment_headcount(
  target_venue UUID,
  target_city VARCHAR,
  target_night DATE,
  staff_user UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  new_count INTEGER;
  new_peak INTEGER;
BEGIN
  INSERT INTO headcounts (venue_id, city, night_of, current_count, peak_count, last_updated_by, is_live)
  VALUES (target_venue, target_city, target_night, 1, 1, staff_user, true)
  ON CONFLICT (venue_id, night_of)
  DO UPDATE SET
    current_count = headcounts.current_count + 1,
    peak_count = GREATEST(headcounts.peak_count, headcounts.current_count + 1),
    updated_at = NOW(),
    last_updated_by = staff_user,
    is_live = true
  RETURNING current_count, peak_count INTO new_count, new_peak;

  UPDATE venues SET is_clicker_live = true WHERE id = target_venue;

  RETURN json_build_object('new_count', new_count, 'peak', new_peak);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_headcount(
  target_venue UUID,
  target_city VARCHAR,
  target_night DATE,
  staff_user UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE headcounts
  SET
    current_count = GREATEST(current_count - 1, 0),
    updated_at = NOW(),
    last_updated_by = staff_user
  WHERE venue_id = target_venue AND night_of = target_night
  RETURNING current_count INTO new_count;

  IF new_count IS NULL THEN
    new_count := 0;
  END IF;

  RETURN json_build_object('new_count', new_count);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION adjust_headcount(
  target_venue UUID,
  target_city VARCHAR,
  target_night DATE,
  adjustment INTEGER,
  staff_user UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  new_count INTEGER;
  new_peak INTEGER;
BEGIN
  INSERT INTO headcounts (venue_id, city, night_of, current_count, peak_count, last_updated_by, is_live)
  VALUES (target_venue, target_city, target_night, GREATEST(adjustment, 0), GREATEST(adjustment, 0), staff_user, true)
  ON CONFLICT (venue_id, night_of)
  DO UPDATE SET
    current_count = GREATEST(headcounts.current_count + adjustment, 0),
    peak_count = GREATEST(headcounts.peak_count, GREATEST(headcounts.current_count + adjustment, 0)),
    updated_at = NOW(),
    last_updated_by = staff_user,
    is_live = true
  RETURNING current_count, peak_count INTO new_count, new_peak;

  RETURN json_build_object('new_count', new_count, 'peak', new_peak);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- venue_comments table (per-venue, noon-to-noon cycle)
-- ============================================

CREATE TABLE IF NOT EXISTS venue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID,
  username VARCHAR(30) NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 200),
  day_of DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vc_venue_day ON venue_comments(venue_id, day_of, created_at DESC);

ALTER TABLE venue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_vc" ON venue_comments FOR SELECT USING (true);
CREATE POLICY "auth_insert_vc" ON venue_comments FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE venue_comments;

-- ============================================
-- venue_recaps table (star ratings + reviews, noon-to-noon)
-- ============================================

CREATE TABLE IF NOT EXISTS venue_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  username VARCHAR(24) NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 200),
  stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  day_of DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recaps_venue_day
  ON venue_recaps(venue_id, day_of, created_at DESC);

ALTER TABLE venue_recaps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "read_recaps" ON venue_recaps FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "insert_recaps" ON venue_recaps FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE venue_recaps; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- Specials columns on venues
-- ============================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS tonight_special TEXT DEFAULT NULL;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS special_updated_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- Ensure all tables in realtime publication
-- ============================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE venues; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- Knoxville venues — UPSERT all 10 with verified coordinates
-- Uses ON CONFLICT (slug) DO UPDATE to handle both new and existing
-- ============================================

-- Ensure slug has a unique index (required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);

-- Remove old venues that are no longer in the lineup
DELETE FROM venue_recaps WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venue_comments WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM headcounts WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM clicker_logs WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire');

-- Upsert all 10 Knoxville venues (one at a time for safety)

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('The Hill Bar & Grill', 'the-hill', 'knoxville', 'bar', 35.96389, -83.92806, '1105 Forest Ave, Knoxville, TN 37916', '(865) 540-1011', 'thehillknox.com', '11 AM - 3 AM, 7 days', 'Live music joint, bar and grill in Fort Sanders near UT campus. Award-winning wings, cold beer, trivia nights, and big game energy since 2007.', 'HILL01', true, 1, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Cool Beans', 'cool-beans', 'knoxville', 'bar', 35.95470, -83.93518, '1817 Lake Ave, Knoxville, TN 37916', '(865) 522-6417', 'coolbeansbar.com', '11 AM - 3 AM, 7 days', 'Classic strip dive bar. Pool tables, cheap drinks, late nights. A Knoxville Strip staple and a no-frills good time.', 'COOL01', true, 2, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Half Barrel', 'half-barrel', 'knoxville', 'bar', 35.95582, -83.93492, '1829 Cumberland Ave, Knoxville, TN 37916', '(865) 595-4848', 'hb.smithbars.com', '3 PM - 3 AM daily', '35+ draft beers, massive bourbon selection, pub grub, trivia nights, and sports on TV. Craft beer heaven on the strip.', 'HALF01', true, 3, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Sunspot', 'sunspot', 'knoxville', 'bar', 35.95373, -83.93928, '2200 Cumberland Ave, Knoxville, TN 37916', '(865) 637-4663', 'sunspotrestaurant.com', '11 AM - 10 PM daily', 'Southwestern, Caribbean and Latin American fare with vegetarian options, draft brews, and a great patio scene.', 'SUNSP1', true, 4, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Old City Sports Bar', 'old-city-sports', 'knoxville', 'bar', 35.97023, -83.91827, '106 S Central St, Knoxville, TN 37902', '(865) 474-1039', 'oldcitysportsbar.com', '11 AM - 1:30 AM varies', 'Best-rated sports bar in Knoxville. 30+ HD TVs, two balconies, 160-inch video wall. FREE beer until first score on game days.', 'OCSB01', true, 5, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Taqueria Mares', 'taqueria-mares', 'knoxville', 'bar', 35.95461, -83.93718, '2008 Cumberland Ave, Knoxville, TN 37916', '(865) 240-3547', 'taqueriamaresnew.toast.site', '11 AM - 3 AM varies', 'Authentic Mexican on the strip. Burritos, tacos, bowls. Famous Barbie Margarita and horchata. THE late-night food spot.', 'MARE01', true, 6, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Hannas', 'hannas', 'knoxville', 'bar', 35.95506, -83.93535, '1836 Cumberland Ave, Knoxville, TN 37916', '(865) 522-9933', 'Thu-Sat 9pm-3am', 'Strip institution since 1994. Two floors plus huge patio. 100+ beers, 200+ liquors. Dancing, pool, live music. THE 21st birthday spot.', 'HANN01', true, 7, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('Yacht Club', 'yacht-club', 'knoxville', 'bar', 35.95671, -83.93268, '721 S 17th St, Knoxville, TN 37916', '(865) 673-3500', 'M-Th 4pm-3am, F 8pm-3am, Sat 4pm-3am', 'Barcade gem. Retro arcade games, N64, GameCube. Nearly 100 beers. Shot plus PBR pregame deal.', 'YACHT1', true, 8, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, phone, website, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('LiterBoard', 'literboard', 'knoxville', 'bar', 35.95504, -83.93570, '1848 Cumberland Ave, Knoxville, TN 37916', '(865) 247-4582', 'literboardknox.com', 'W-Sat 8pm-3am', 'Two-floor gaming bar. Retro consoles downstairs, bar and balcony upstairs. Craft hot dogs, trivia, karaoke, live DJs.', 'LITER1', true, 9, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, phone=EXCLUDED.phone, website=EXCLUDED.website, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

INSERT INTO venues (name, slug, city, category, lat, lng, address, hours, description, staff_code, is_active, sort_order, cam_coming_soon)
VALUES ('The Bookstore', 'the-bookstore', 'knoxville', 'bar', 35.95585, -83.93214, '821 Melrose Pl, Knoxville, TN 37916', 'W-Sat 8pm-2am', 'Intimate newer spot off the strip on Melrose Place. Low-key vibes, cocktail-focused.', 'BOOK01', true, 10, true)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, hours=EXCLUDED.hours, description=EXCLUDED.description, staff_code=EXCLUDED.staff_code, is_active=true;

-- ============================================
-- Seed staff codes for Tampa venues
-- ============================================

UPDATE venues SET staff_code = 'MACD01' WHERE slug = 'macdintons-tampa';
UPDATE venues SET staff_code = 'DIRTY1' WHERE slug = 'dirty-shame-tampa';
UPDATE venues SET staff_code = 'PARKB1' WHERE slug = 'park-bar-tampa';
UPDATE venues SET staff_code = 'SOHO01' WHERE slug = 'soho-saloon-tampa';
UPDATE venues SET staff_code = 'LODGE1' WHERE slug = 'the-lodge-tampa';
UPDATE venues SET staff_code = 'YBOR01' WHERE slug = 'ybor-brewing-tampa';
UPDATE venues SET staff_code = 'THEHB1' WHERE slug = 'the-hub-tampa';
UPDATE venues SET staff_code = 'CZAR01' WHERE slug = 'czar-bar-tampa';
UPDATE venues SET staff_code = 'BADMK1' WHERE slug = 'bad-monkey-tampa';
UPDATE venues SET staff_code = 'GASP01' WHERE slug = 'gaspars-tampa';
UPDATE venues SET staff_code = 'ROCKB1' WHERE slug = 'rock-brothers-tampa';
UPDATE venues SET staff_code = 'AMSCL1' WHERE slug = 'american-social-tampa';

-- ============================================
-- venue_updates table (bouncer broadcasts, auto-expire)
-- ============================================

CREATE TABLE IF NOT EXISTS venue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 140),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours')
);

CREATE INDEX IF NOT EXISTS idx_venue_updates_expires ON venue_updates(expires_at DESC);

ALTER TABLE venue_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "read_venue_updates" ON venue_updates FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "insert_venue_updates" ON venue_updates FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE venue_updates; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
