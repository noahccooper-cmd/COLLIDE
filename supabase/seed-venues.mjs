#!/usr/bin/env node
/**
 * Seed all 10 Knoxville venues into Supabase.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node supabase/seed-venues.mjs
 *
 * Or, if you have a .env file in the project root:
 *   node supabase/seed-venues.mjs
 *
 * Requires: @supabase/supabase-js (already in package.json)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading .env manually (no dotenv dependency needed)
try {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env file, use env vars directly */ }

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  console.error('Set them in .env or pass as environment variables.');
  process.exit(1);
}

const supabase = createClient(url, key);

const venues = [
  {
    name: 'The Hill Bar & Grill', slug: 'the-hill', city: 'knoxville', category: 'bar',
    lat: 35.96389, lng: -83.92806,
    address: '1105 Forest Ave, Knoxville, TN 37916',
    phone: '(865) 540-1011', website: 'thehillknox.com',
    hours: '11 AM - 3 AM, 7 days',
    description: 'Live music joint, bar and grill in Fort Sanders near UT campus. Award-winning wings, cold beer, trivia nights, and big game energy since 2007.',
    staff_code: 'HILL01', is_active: true, sort_order: 1,
  },
  {
    name: 'Cool Beans', slug: 'cool-beans', city: 'knoxville', category: 'bar',
    lat: 35.95470, lng: -83.93518,
    address: '1817 Lake Ave, Knoxville, TN 37916',
    phone: '(865) 522-6417', website: 'coolbeansbar.com',
    hours: '11 AM - 3 AM, 7 days',
    description: 'Classic strip dive bar. Pool tables, cheap drinks, late nights. A Knoxville Strip staple and a no-frills good time.',
    staff_code: 'COOL01', is_active: true, sort_order: 2,
  },
  {
    name: 'Half Barrel', slug: 'half-barrel', city: 'knoxville', category: 'bar',
    lat: 35.95582, lng: -83.93492,
    address: '1829 Cumberland Ave, Knoxville, TN 37916',
    phone: '(865) 595-4848', website: 'hb.smithbars.com',
    hours: '3 PM - 3 AM daily',
    description: '35+ draft beers, massive bourbon selection, pub grub, trivia nights, and sports on TV. Craft beer heaven on the strip.',
    staff_code: 'HALF01', is_active: true, sort_order: 3,
  },
  {
    name: 'Sunspot', slug: 'sunspot', city: 'knoxville', category: 'bar',
    lat: 35.95373, lng: -83.93928,
    address: '2200 Cumberland Ave, Knoxville, TN 37916',
    phone: '(865) 637-4663', website: 'sunspotrestaurant.com',
    hours: '11 AM - 10 PM daily',
    description: 'Southwestern, Caribbean and Latin American fare with vegetarian options, draft brews, and a great patio scene.',
    staff_code: 'SUNSP1', is_active: true, sort_order: 4,
  },
  {
    name: 'Old City Sports Bar', slug: 'old-city-sports', city: 'knoxville', category: 'bar',
    lat: 35.97023, lng: -83.91827,
    address: '106 S Central St, Knoxville, TN 37902',
    phone: '(865) 474-1039', website: 'oldcitysportsbar.com',
    hours: '11 AM - 1:30 AM varies',
    description: 'Best-rated sports bar in Knoxville. 30+ HD TVs, two balconies, 160-inch video wall. FREE beer until first score on game days.',
    staff_code: 'OCSB01', is_active: true, sort_order: 5,
  },
  {
    name: 'Taqueria Mares', slug: 'taqueria-mares', city: 'knoxville', category: 'bar',
    lat: 35.95461, lng: -83.93718,
    address: '2008 Cumberland Ave, Knoxville, TN 37916',
    phone: '(865) 240-3547', website: 'taqueriamaresnew.toast.site',
    hours: '11 AM - 3 AM varies',
    description: 'Authentic Mexican on the strip. Burritos, tacos, bowls. Famous Barbie Margarita and horchata. THE late-night food spot.',
    staff_code: 'MARE01', is_active: true, sort_order: 6,
  },
  {
    name: 'Hannas', slug: 'hannas', city: 'knoxville', category: 'bar',
    lat: 35.95506, lng: -83.93535,
    address: '1836 Cumberland Ave, Knoxville, TN 37916',
    phone: '(865) 522-9933',
    hours: 'Thu-Sat 9pm-3am',
    description: 'Strip institution since 1994. Two floors plus huge patio. 100+ beers, 200+ liquors. Dancing, pool, live music. THE 21st birthday spot.',
    staff_code: 'HANN01', is_active: true, sort_order: 7,
  },
  {
    name: 'Yacht Club', slug: 'yacht-club', city: 'knoxville', category: 'bar',
    lat: 35.95671, lng: -83.93268,
    address: '721 S 17th St, Knoxville, TN 37916',
    phone: '(865) 673-3500',
    hours: 'M-Th 4pm-3am, F 8pm-3am, Sat 4pm-3am',
    description: 'Barcade gem. Retro arcade games, N64, GameCube. Nearly 100 beers. Shot plus PBR pregame deal.',
    staff_code: 'YACHT1', is_active: true, sort_order: 8,
  },
  {
    name: 'LiterBoard', slug: 'literboard', city: 'knoxville', category: 'bar',
    lat: 35.95504, lng: -83.93570,
    address: '1848 Cumberland Ave, Knoxville, TN 37916',
    phone: '(865) 247-4582', website: 'literboardknox.com',
    hours: 'W-Sat 8pm-3am',
    description: 'Two-floor gaming bar. Retro consoles downstairs, bar and balcony upstairs. Craft hot dogs, trivia, karaoke, live DJs.',
    staff_code: 'LITER1', is_active: true, sort_order: 9,
  },
  {
    name: 'The Bookstore', slug: 'the-bookstore', city: 'knoxville', category: 'bar',
    lat: 35.95585, lng: -83.93214,
    address: '821 Melrose Pl, Knoxville, TN 37916',
    hours: 'W-Sat 8pm-2am',
    description: 'Intimate newer spot off the strip on Melrose Place. Low-key vibes, cocktail-focused.',
    staff_code: 'BOOK01', is_active: true, sort_order: 10,
  },
];

async function seed() {
  console.log('Seeding 10 Knoxville venues...\n');

  let success = 0;
  let failed = 0;

  for (const venue of venues) {
    const { data, error } = await supabase
      .from('venues')
      .upsert(venue, { onConflict: 'slug' })
      .select('name, slug, lat, lng');

    if (error) {
      console.error(`FAIL  ${venue.name}: ${error.message}`);
      failed++;
    } else {
      console.log(`OK    ${venue.name} (${venue.lat}, ${venue.lng})`);
      success++;
    }
  }

  console.log(`\n--- Results: ${success} OK, ${failed} failed ---\n`);

  // Verify
  const { data: all, error: verifyErr } = await supabase
    .from('venues')
    .select('name, slug, lat, lng, is_active')
    .eq('city', 'knoxville')
    .order('sort_order');

  if (verifyErr) {
    console.error('Verify error:', verifyErr.message);
  } else {
    console.log(`Knoxville venues in DB: ${all.length}`);
    for (const v of all) {
      console.log(`  ${v.name.padEnd(22)} slug=${v.slug.padEnd(18)} lat=${v.lat} lng=${v.lng} active=${v.is_active}`);
    }
  }
}

seed().catch(console.error);
