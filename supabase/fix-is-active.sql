-- =============================================
-- FIX: Set is_active = true on all Knoxville venues
-- Run this in Supabase SQL Editor FIRST
-- =============================================

UPDATE venues SET is_active = true WHERE city = 'knoxville' AND (is_active IS NULL OR is_active = false);

-- Verify all 10 are active
SELECT name, slug, lat, lng, is_active FROM venues WHERE city = 'knoxville' ORDER BY sort_order;
