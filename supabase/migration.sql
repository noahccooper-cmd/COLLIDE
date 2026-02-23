-- venUe Database Migration
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
-- Knoxville venues — UPDATE existing 5, INSERT 5 new
-- Uses UPSERT (ON CONFLICT) to preserve foreign key refs
-- ============================================

-- Update existing venues with correct coordinates & data
UPDATE venues SET
  lat = 35.96389, lng = -83.92806,
  address = '1105 Forest Ave, Knoxville, TN 37916',
  phone = '(865) 540-1011',
  website = 'https://thehillknox.com',
  hours = '11am-3am daily',
  description = 'Live music joint, bar, restaurant & caterer in the Fort Sanders area near UT. Award-winning wings, Taco Tuesday, Wing Wednesday. Big screens for every game, trivia nights, cold beer, and an unbeatable patio. College favorite since 2007.',
  vibe = 'Award-winning wings, live music, sports. THE college bar.',
  rating = 4.0, review_count = 239, capacity = 350, staff_code = 'HILL01'
WHERE slug = 'the-hill';

UPDATE venues SET
  lat = 35.95470, lng = -83.93518,
  address = '1817 Lake Ave, Knoxville, TN 37916',
  phone = '(865) 522-6417',
  website = 'https://coolbeansbar.com',
  hours = '11am-3am daily',
  description = 'The hottest dive bar on UT campus. Pool, darts, beer pong, cornhole, foosball. Cheap pitchers, famous Bushwhacker drinks, and an outdoor patio that is the spot on game days.',
  vibe = 'Dive bar. Pool tables, cheap pitchers, Bushwhackers. THE patio.',
  rating = 4.2, review_count = 494, capacity = 200, staff_code = 'COOL01'
WHERE slug = 'cool-beans';

UPDATE venues SET
  lat = 35.95582, lng = -83.93492,
  address = '1829 Cumberland Ave, Knoxville, TN 37916',
  phone = '(865) 595-4848',
  website = 'https://hb.smithbars.com',
  hours = '4pm-3am daily',
  description = 'The strip''s bourbon headquarters. 35+ draft beers and one of the best bourbon/whiskey collections outside Kentucky. American food, chill atmosphere. The PB&J Mixtape drink is a must-try.',
  vibe = '35 taps, best bourbon outside Kentucky. Craft beer heaven.',
  rating = 4.0, review_count = 46, capacity = 180, staff_code = 'HALF01'
WHERE slug = 'half-barrel';

UPDATE venues SET
  lat = 35.95373, lng = -83.93928,
  address = '2200 Cumberland Ave, Knoxville, TN 37916',
  phone = '(865) 637-4663',
  website = 'https://sunspotrestaurant.com',
  hours = '11am-10pm daily, brunch Sat-Sun 10am',
  description = 'Where tie-dyes and neckties unite. Southwestern, Caribbean & Latin American fare with 40+ beers on tap. Famous shrimp and grits, rattlesnake pasta, and BGLT. Upstairs balcony bar.',
  vibe = 'Southwestern-Caribbean fusion. 40+ beers. Upstairs balcony.',
  rating = 4.5, review_count = 187, capacity = 220, staff_code = 'SUNSP1'
WHERE slug = 'sunspot';

UPDATE venues SET
  lat = 35.97023, lng = -83.91827,
  address = '106 S Central St, Knoxville, TN 37902',
  phone = '(865) 474-1039',
  website = 'https://oldcitysportsbar.com',
  hours = 'M-W 5pm-12:30am, Th 5pm-1am, F 5pm-1:30am, Sat 12pm-1:30am, Sun 12pm-1am',
  description = 'Knoxville''s premier sports bar in the historic Old City. 30+ HD TVs, two balconies, 160-inch video wall. FREE beer until first score on game days. Food from Southern Grit.',
  vibe = 'Sports, cold drinks, Old City energy. FREE beer til first score.',
  rating = 4.9, review_count = 540, capacity = 250, staff_code = 'OCSB01'
WHERE slug = 'old-city-sports';

-- Ensure slug has a unique index (required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);

-- Remove old venues that are no longer in the lineup
DELETE FROM venue_recaps WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venue_comments WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM headcounts WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM clicker_logs WHERE venue_id IN (SELECT id FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire'));
DELETE FROM venues WHERE slug IN ('hannas-lil-dive', 'fieldhouse-social', 'cotton-eyed-joes', 'preservation-pub', 'sapphire');

-- Insert 5 new venues
INSERT INTO venues (name, slug, city, category, lat, lng, address, vibe, hours, phone, website, description, rating, review_count, capacity, staff_code, is_active, sort_order, cam_coming_soon)
VALUES
  ('Taqueria Mares', 'taqueria-mares', 'knoxville', 'bar', 35.95461, -83.93718, '2008 Cumberland Ave, Knoxville, TN 37916', 'Authentic Mexican. Burritos, tacos, margaritas. THE late-night food spot.', 'M-T 11am-9:30pm, W-Th 11am-2am, F-Sat 11am-3am, Sun 12pm-9:30pm', '(865) 240-3547', 'https://taqueriamaresnew.toast.site', 'Authentic Mexican on the strip. Order at the counter, sit anywhere. Burritos, tacos, bowls, quesadillas, nachos. Famous Barbie Margarita, horchata, frozen Piña Colada marg. THE late-night food spot.', 4.3, 350, 150, 'MARE01', true, 6, true),
  ('Hanna''s', 'hannas', 'knoxville', 'bar', 35.95506, -83.93535, '1836 Cumberland Ave, Knoxville, TN 37916', 'Two floors, huge patio. 100+ beers, dancing, live music. THE 21st birthday spot.', 'Thu-Sat 9pm-3am', '(865) 522-9933', null, 'A Cumberland strip institution since 1994. Two floors plus huge patio and outdoor bar. 100+ beers, 200+ liquors. Dancing, pool, live music. THE spot for 21st birthdays and post-game celebrations.', 4.4, 620, 400, 'HANN01', true, 7, true),
  ('Yacht Club', 'yacht-club', 'knoxville', 'bar', 35.95671, -83.93268, '721 S 17th St, Knoxville, TN 37916', 'Barcade. Retro 25-cent games, Smash Bros, craft beer. PBR + shot deal.', 'M-Th 4pm-3am, F 8pm-3am, Sat 4pm-3am, Sun closed', '(865) 673-3500', null, 'Knoxville''s barcade gem. Retro 25-cent arcade games, N64 and GameCube consoles for Smash Bros. Nearly 100 beers, warm lighting, cozy booth seating. Shot plus PBR pregame deal is legendary.', 4.5, 280, 120, 'YACHT1', true, 8, true),
  ('LiterBoard', 'literboard', 'knoxville', 'bar', 35.95504, -83.93570, '1848 Cumberland Ave, Knoxville, TN 37916', 'Two-floor gaming bar. Retro consoles, balcony, trivia, karaoke.', 'W-Sat 8pm-3am', '(865) 247-4582', 'https://literboardknox.com', 'Two-floor gaming bar. Retro consoles downstairs, another bar and balcony upstairs overlooking Cumberland. Craft hot dogs, diverse beer selection, trivia nights, karaoke, live DJs on weekends.', 4.2, 195, 200, 'LITER1', true, 9, true),
  ('The Bookstore', 'the-bookstore', 'knoxville', 'bar', 35.95585, -83.93214, '821 Melrose Pl, Knoxville, TN 37916', 'Intimate newer spot. Cocktail-focused, curated atmosphere.', 'W-Sat 8pm-2am', null, null, 'Intimate newer spot just off the strip on Melrose Place. Low-key vibes, cocktail-focused, curated atmosphere.', 4.1, 85, 80, 'BOOK01', true, 10, true)
ON CONFLICT (slug) DO NOTHING;

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
