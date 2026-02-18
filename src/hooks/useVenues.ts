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
        setVenues((data as Venue[]) ?? []);
        setLoading(false);
      });
  }, [city]);

  // Real-time subscription for venue updates (tonight_special, is_clicker_live)
  useEffect(() => {
    if (!envReady) return;

    const channel = supabase
      .channel(`venues-rt-${city}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'venues',
        },
        (payload) => {
          console.log('📍 VENUE UPDATE:', payload.new);
          const updated = payload.new as Venue;
          if (updated.city !== city) return;
          setVenues(prev =>
            prev.map(v => v.id === updated.id ? { ...v, ...updated } : v)
          );
        }
      )
      .subscribe((status) => {
        console.log('📍 VENUES CHANNEL STATUS:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [city]);

  return { venues, loading };
}
