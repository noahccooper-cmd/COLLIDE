import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const envReady = !!(supabaseUrl && supabaseAnonKey);
export const mapboxReady = !!import.meta.env.VITE_MAPBOX_TOKEN;
export const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

export const supabase = envReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);
