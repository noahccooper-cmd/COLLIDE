import { useState, useEffect } from 'react';
import { supabase, envReady } from '../lib/supabase';
import type { Venue } from '../lib/types';
import type { CityKey } from '../lib/constants';

export function useVenues(city: CityKey) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!envReady) {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setVenues(data ?? []);
        setLoading(false);
      });
  }, [city]);

  return { venues, loading };
}
