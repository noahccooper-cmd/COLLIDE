export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  auth_id: string | null;
  email: string;
  username: string;
  display_name: string | null;
  class_year: number | null;
  city: string;
  avatar_url: string | null;
  total_checkins: number;
  is_active: boolean;
}

export interface Venue {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  city: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  image_url: string | null;
  cover_price: string | null;
  deals: string | null;
  hours: string | null;
  instagram: string | null;
  vibe: string | null;
  has_live_cam: boolean;
  live_cam_url: string | null;
  cam_coming_soon: boolean;
  is_active: boolean;
  sort_order: number;
  capacity: number | null;
  is_clicker_live: boolean;
  staff_code: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  rating: number | null;
  review_count: number | null;
}

export interface Checkin {
  id: string;
  created_at: string;
  user_id: string;
  venue_id: string;
  night_of: string;
  city: string;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  city: string;
  body: string;
  night_of: string;
}

export interface VenueCount {
  venue_id: string;
  count: number;
}

export interface CheckinHistory extends Checkin {
  venues: { name: string } | null;
}

export interface Headcount {
  id: string;
  created_at: string;
  updated_at: string;
  venue_id: string;
  city: string;
  night_of: string;
  current_count: number;
  peak_count: number;
  last_updated_by: string | null;
  is_live: boolean;
}

export interface VenueStaff {
  id: string;
  created_at: string;
  venue_id: string;
  user_id: string;
  role: string;
  pin_code: string | null;
  is_active: boolean;
}

export interface VenueComment {
  id: string;
  created_at: string;
  venue_id: string;
  user_id: string | null;
  username: string;
  body: string;
  day_of: string;
}

export interface ClickerLog {
  id: string;
  created_at: string;
  venue_id: string;
  staff_id: string | null;
  action: 'enter' | 'exit';
  night_of: string;
  count_after: number;
}
