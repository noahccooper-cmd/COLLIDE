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
-- Replace Knoxville venue data with 5 real bars
-- ============================================

DELETE FROM venues WHERE city = 'knoxville';

INSERT INTO venues (name, slug, city, category, lat, lng, address, vibe, hours, phone, website, instagram, description, rating, review_count, staff_code, is_active, sort_order, cam_coming_soon)
VALUES
  ('The Hill Bar & Grill', 'the-hill', 'knoxville', 'bar', 35.95746, -83.92467, '1105 Forest Ave, Knoxville, TN 37916', 'Award-winning wings, live music, sports. THE college bar.', '11 AM – 3 AM, 7 days', '(865) 540-1011', 'thehillknox.com', '@thehillknox', 'Live music joint, bar & grill in Fort Sanders near UT campus. Award-winning wings, cold beer, trivia nights, and big game energy since 2007.', 4.0, 239, 'HILL01', true, 1, true),
  ('Cool Beans', 'cool-beans', 'knoxville', 'bar', 35.95610, -83.93005, '1817 Lake Ave, Knoxville, TN 37916', 'Classic strip bar. Pool tables, cheap drinks, late nights.', '5 PM – 3 AM', '(865) 673-0608', null, null, 'A Knoxville Strip staple. Rustic stone building with pool tables, cheap drinks, and a no-frills good time.', 4.2, 494, 'COOL01', true, 2, true),
  ('Half Barrel', 'half-barrel', 'knoxville', 'bar', 35.95590, -83.93495, '1829 Cumberland Ave, Knoxville, TN 37916', '35 taps, best bourbon outside Kentucky. Craft beer heaven.', '3 PM – 3 AM daily', '(865) 595-4848', 'hb.smithbars.com', '@halfbarrelut', 'Wood-paneled haunt on The Strip with 35+ draft beers, massive bourbon selection, pub grub, trivia nights, and sports on TV.', 4.0, 46, 'HALF01', true, 3, true),
  ('Old City Sports Bar', 'old-city-sports', 'knoxville', 'bar', 35.96725, -83.91690, '106 S Central St, Knoxville, TN 37902', 'Sports, cold drinks, Old City energy. 4.9 stars.', '11 AM – 3 AM', null, null, null, 'Best-rated bar in Knoxville. Sports bar in the heart of Old City with great drinks, hot dogs, and tons of TVs.', 4.9, 540, 'OCSB01', true, 4, true),
  ('Sunspot', 'sunspot', 'knoxville', 'bar', 35.95530, -83.93655, '2200 Cumberland Ave, Knoxville, TN 37916', 'Southwestern-Caribbean fusion. Craft brews. Patio scene.', '11 AM – 12 AM', '(865) 637-4663', 'sunspotrestaurant.com', null, 'Rustic-chic spot for Southwestern, Caribbean & Latin American fare with vegetarian options, draft brews, and a killer patio.', 4.5, 187, 'SUNSP1', true, 5, true);

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
