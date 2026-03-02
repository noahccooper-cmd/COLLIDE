-- =============================================
-- FIX BATON ROUGE TIGERLAND ADDRESSES + ADD REGGIE'S
-- Run this in Supabase SQL Editor
--
-- Problem: Tigerland bars have WRONG addresses.
-- DB has addresses in the 4300-4400 range on Bob Pettit Blvd.
-- Real Tigerland addresses are in the 1000-1200 range.
-- Coordinates are also wrong (they match the bad addresses).
-- =============================================

-- 1. Fred's Bar — was "5765 Corporate Blvd" (completely wrong)
UPDATE venues
SET address = '1184 Bob Pettit Blvd, Baton Rouge, LA 70820',
    lat = 30.4078,
    lng = -91.1738
WHERE name = 'Fred''s Bar'
  AND city = (SELECT city FROM venues WHERE name = 'Fred''s Bar' LIMIT 1);

-- 2. Bogie's — was "4385 Bob Pettit Blvd" (wrong number)
UPDATE venues
SET address = '1050 Bob Pettit Blvd, Baton Rouge, LA 70820',
    lat = 30.4083,
    lng = -91.1743
WHERE name = 'Bogie''s'
  AND city = (SELECT city FROM venues WHERE name = 'Bogie''s' LIMIT 1);

-- 3. JL's — was "4410 Bob Pettit Blvd" (wrong number)
UPDATE venues
SET address = '1100 Bob Pettit Blvd, Baton Rouge, LA 70820',
    lat = 30.4081,
    lng = -91.1741
WHERE name = 'JL''s'
  AND city = (SELECT city FROM venues WHERE name = 'JL''s' LIMIT 1);

-- 4. Mike's Bar — was "4436 Bob Pettit Blvd" (wrong number)
UPDATE venues
SET address = '1125 Bob Pettit Blvd, Baton Rouge, LA 70820',
    lat = 30.4080,
    lng = -91.1740
WHERE name = 'Mike''s Bar'
  AND city = (SELECT city FROM venues WHERE name = 'Mike''s Bar' LIMIT 1);

-- 5. The House — was "4462 Bob Pettit Blvd" (wrong number)
UPDATE venues
SET address = '1003 Bob Pettit Blvd, Baton Rouge, LA 70820',
    lat = 30.4086,
    lng = -91.1746
WHERE name = 'The House'
  AND city = (SELECT city FROM venues WHERE name = 'The House' LIMIT 1);

-- =============================================
-- 6. ADD REGGIE'S (missing Tigerland bar)
-- Uses same city value as Fred's Bar so it lands in
-- the correct city grouping regardless of naming convention
-- =============================================

INSERT INTO venues (name, slug, city, category, lat, lng, address, is_active, sort_order, cam_coming_soon)
VALUES (
  'Reggie''s',
  'reggies-baton-rouge',
  (SELECT city FROM venues WHERE name = 'Fred''s Bar' LIMIT 1),
  'bar',
  30.4079, -91.1737,
  '1176 Bob Pettit Blvd, Baton Rouge, LA 70820',
  true,
  99,
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  address = EXCLUDED.address,
  is_active = true;

-- =============================================
-- Verify — show all Tigerland-area venues
-- =============================================
SELECT name, address, lat, lng, is_active
FROM venues
WHERE address ILIKE '%Bob Pettit%'
ORDER BY name;
