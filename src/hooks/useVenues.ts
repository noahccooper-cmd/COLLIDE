import { useState, useEffect, useCallback } from 'react';
import { supabase, envReady } from '../lib/supabase';
import type { Venue } from '../lib/types';
import type { CityKey } from '../lib/constants';

export function useVenues(city: CityKey) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchVenues = useCallback(async () => {
    if (!envReady) return;
    setError(false);
    const { data, error: err } = await supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .or('is_active.eq.true,is_active.is.null')
      .order('sort_order');

    if (err) {
      console.error('[venuu] useVenues fetch error:', err);
      setError(true);
      setLoading(false);
      return;
    }
    const rows = (data as Venue[]) ?? [];
    console.log('VENUES LOADED:', rows.map(v => v.name));
    setVenues(rows);
    setLoading(false);
  }, [city]);

  // Initial fetch
  useEffect(() => {
    if (!envReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchVenues();
  }, [fetchVenues]);

  // Real-time subscription for venue updates (cover_charge, tonight_special, is_clicker_live)
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
          const updated = payload.new as Venue;
          if (updated.city !== city) return;
          setVenues(prev =>
            prev.map(v => v.id === updated.id ? { ...v, ...updated } : v)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [city]);

  // Direct cover update from Portal — applies immediately into venues state
  useEffect(() => {
    const handler = (e: Event) => {
      const { venueId, cover_charge } = (e as CustomEvent).detail;
      setVenues(prev =>
        prev.map(v => v.id === venueId ? { ...v, cover_charge } : v)
      );
    };
    window.addEventListener('venues-cover-update', handler);
    return () => window.removeEventListener('venues-cover-update', handler);
  }, []);

  return { venues, loading, error, refetch: fetchVenues };
}
