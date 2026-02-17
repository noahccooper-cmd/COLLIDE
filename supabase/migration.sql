-- venUe Database Migration
-- Run this in your Supabase SQL editor

-- ============================================
-- Update venues table
-- ============================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_clicker_live BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS staff_code VARCHAR(6) UNIQUE;

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
  last_updated_by UUID REFERENCES profiles(id),
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
-- clicker_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS clicker_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id),
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
  staff_user UUID
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
  staff_user UUID
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
  staff_user UUID,
  adjustment INTEGER
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
-- Seed staff codes for venues
-- ============================================

UPDATE venues SET staff_code = 'HILL01' WHERE slug = 'the-hill-knox';
UPDATE venues SET staff_code = 'COOL01' WHERE slug = 'cool-beans-knox';
UPDATE venues SET staff_code = 'TINRF1' WHERE slug = 'tin-roof-knox';
UPDATE venues SET staff_code = 'COTTN1' WHERE slug = 'cotton-eyed-joes-knox';
UPDATE venues SET staff_code = 'HALF01' WHERE slug = 'half-barrel-knox';
UPDATE venues SET staff_code = 'FIELD1' WHERE slug = 'fieldhouse-knox';
UPDATE venues SET staff_code = 'SUNSP1' WHERE slug = 'sunspot-knox';
UPDATE venues SET staff_code = 'URBAN1' WHERE slug = 'urban-bar-knox';
UPDATE venues SET staff_code = 'PRESV1' WHERE slug = 'preservation-pub-knox';
UPDATE venues SET staff_code = 'ELKMT1' WHERE slug = 'elkmont-knox';
UPDATE venues SET staff_code = 'HANNA1' WHERE slug = 'hannas-knox';
UPDATE venues SET staff_code = 'SAL161' WHERE slug = 'saloon-16-knox';
UPDATE venues SET staff_code = 'PUBHZ1' WHERE slug = 'public-house-knox';
UPDATE venues SET staff_code = 'SCRUF1' WHERE slug = 'scruffy-knox';
UPDATE venues SET staff_code = 'UPTOW1' WHERE slug = 'uptown-knox';

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
