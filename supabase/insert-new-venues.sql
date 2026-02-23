-- =============================================
-- PASTE THIS INTO SUPABASE SQL EDITOR
-- Adds 5 new Knoxville venues + updates existing 5
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

-- Step 3: Update existing 5 venues with correct GPS coordinates
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

-- Step 4: Insert 5 new venues (skip if slug already exists)
INSERT INTO venues (name, slug, city, category, lat, lng, address, vibe, hours, phone, website, description, rating, review_count, capacity, staff_code, is_active, sort_order, cam_coming_soon)
VALUES
  ('Taqueria Mares', 'taqueria-mares', 'knoxville', 'bar', 35.95461, -83.93718, '2008 Cumberland Ave, Knoxville, TN 37916', 'Authentic Mexican. Burritos, tacos, margaritas. THE late-night food spot.', 'M-T 11am-9:30pm, W-Th 11am-2am, F-Sat 11am-3am, Sun 12pm-9:30pm', '(865) 240-3547', 'https://taqueriamaresnew.toast.site', 'Authentic Mexican on the strip. Order at the counter, sit anywhere. Burritos, tacos, bowls, quesadillas, nachos. Famous Barbie Margarita, horchata, frozen Piña Colada marg. THE late-night food spot.', 4.3, 350, 150, 'MARE01', true, 6, true),
  ('Hanna''s', 'hannas', 'knoxville', 'bar', 35.95506, -83.93535, '1836 Cumberland Ave, Knoxville, TN 37916', 'Two floors, huge patio. 100+ beers, dancing, live music. THE 21st birthday spot.', 'Thu-Sat 9pm-3am', '(865) 522-9933', null, 'A Cumberland strip institution since 1994. Two floors plus huge patio and outdoor bar. 100+ beers, 200+ liquors. Dancing, pool, live music. THE spot for 21st birthdays and post-game celebrations.', 4.4, 620, 400, 'HANN01', true, 7, true),
  ('Yacht Club', 'yacht-club', 'knoxville', 'bar', 35.95671, -83.93268, '721 S 17th St, Knoxville, TN 37916', 'Barcade. Retro 25-cent games, Smash Bros, craft beer. PBR + shot deal.', 'M-Th 4pm-3am, F 8pm-3am, Sat 4pm-3am, Sun closed', '(865) 673-3500', null, 'Knoxville''s barcade gem. Retro 25-cent arcade games, N64 and GameCube consoles for Smash Bros. Nearly 100 beers, warm lighting, cozy booth seating. Shot plus PBR pregame deal is legendary.', 4.5, 280, 120, 'YACHT1', true, 8, true),
  ('LiterBoard', 'literboard', 'knoxville', 'bar', 35.95504, -83.93570, '1848 Cumberland Ave, Knoxville, TN 37916', 'Two-floor gaming bar. Retro consoles, balcony, trivia, karaoke.', 'W-Sat 8pm-3am', '(865) 247-4582', 'https://literboardknox.com', 'Two-floor gaming bar. Retro consoles downstairs, another bar and balcony upstairs overlooking Cumberland. Craft hot dogs, diverse beer selection, trivia nights, karaoke, live DJs on weekends.', 4.2, 195, 200, 'LITER1', true, 9, true),
  ('The Bookstore', 'the-bookstore', 'knoxville', 'bar', 35.95585, -83.93214, '821 Melrose Pl, Knoxville, TN 37916', 'Intimate newer spot. Cocktail-focused, curated atmosphere.', 'W-Sat 8pm-2am', null, null, 'Intimate newer spot just off the strip on Melrose Place. Low-key vibes, cocktail-focused, curated atmosphere.', 4.1, 85, 80, 'BOOK01', true, 10, true)
ON CONFLICT (slug) DO NOTHING;

-- Step 5: Ensure venue_recaps table exists
CREATE TABLE IF NOT EXISTS venue_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  username VARCHAR(24) NOT NULL,
  body TEXT CHECK (char_length(body) <= 200),
  stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  day_of DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE venue_recaps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone can read recaps" ON venue_recaps FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone can post recaps" ON venue_recaps FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 6: Verify — should show 10 Knoxville venues
SELECT name, slug, lat, lng, city FROM venues WHERE city = 'knoxville' ORDER BY sort_order;
