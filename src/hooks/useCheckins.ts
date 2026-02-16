import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getNightOf } from '../lib/utils';
import type { CityKey } from '../lib/constants';
import type { VenueCount } from '../lib/types';
import confetti from 'canvas-confetti';

export function useCheckins(city: CityKey, userId?: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [userCheckinVenueId, setUserCheckinVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulsedVenueId, setPulsedVenueId] = useState<string | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nightOf = getNightOf();

  const fetchCounts = useCallback(async () => {
    if (!envReady) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.rpc('get_venue_counts', {
      target_city: city,
      target_night: nightOf,
    });

    if (data) {
      const map: Record<string, number> = {};
      let total = 0;
      (data as VenueCount[]).forEach((row) => {
        map[row.venue_id] = Number(row.count);
        total += Number(row.count);
      });
      setCounts(map);
      setTotalCount(total);
    }
    setLoading(false);
  }, [city, nightOf]);

  const fetchUserCheckin = useCallback(async () => {
    if (!envReady || !userId) {
      setUserCheckinVenueId(null);
      return;
    }

    const { data } = await supabase
      .from('checkins')
      .select('venue_id')
      .eq('user_id', userId)
      .eq('night_of', nightOf)
      .single();

    setUserCheckinVenueId(data?.venue_id ?? null);
  }, [userId, nightOf]);

  useEffect(() => {
    fetchCounts();
    fetchUserCheckin();
  }, [fetchCounts, fetchUserCheckin]);

  // Real-time subscription
  useEffect(() => {
    if (!envReady) return;

    const channel = supabase
      .channel(`checkins-rt-${city}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `city=eq.${city}`,
        },
        (payload) => {
          fetchCounts();
          fetchUserCheckin();

          if (payload.eventType === 'INSERT') {
            const venueId = (payload.new as { venue_id: string }).venue_id;
            setPulsedVenueId(venueId);
            if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
            pulseTimeoutRef.current = setTimeout(() => setPulsedVenueId(null), 600);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [city, fetchCounts, fetchUserCheckin]);

  const checkIn = useCallback(async (venueId: string) => {
    if (!envReady || !userId) return { error: new Error('Not authenticated') };

    // Optimistic update
    const prevCounts = { ...counts };
    const prevVenue = userCheckinVenueId;
    const prevTotal = totalCount;

    setCounts(prev => {
      const next = { ...prev };
      if (prevVenue && next[prevVenue]) {
        next[prevVenue] = Math.max(0, next[prevVenue] - 1);
      }
      next[venueId] = (next[venueId] ?? 0) + 1;
      return next;
    });
    setUserCheckinVenueId(venueId);
    setTotalCount(prev => prevVenue ? prev : prev + 1);

    // Delete existing check-in for tonight
    await supabase
      .from('checkins')
      .delete()
      .eq('user_id', userId)
      .eq('night_of', nightOf);

    // Insert new check-in
    const { error } = await supabase
      .from('checkins')
      .insert({
        user_id: userId,
        venue_id: venueId,
        night_of: nightOf,
        city,
      });

    if (error) {
      // Revert optimistic update
      setCounts(prevCounts);
      setUserCheckinVenueId(prevVenue);
      setTotalCount(prevTotal);
      return { error };
    }

    // Fire confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#FF5E1A', '#FFFFFF', '#00E676', '#FFAA00'],
      gravity: 1.2,
      ticks: 100,
    });

    return { error: null };
  }, [userId, city, nightOf, counts, userCheckinVenueId, totalCount]);

  return {
    counts,
    totalCount,
    userCheckinVenueId,
    loading,
    pulsedVenueId,
    checkIn,
    refetch: fetchCounts,
  };
}
