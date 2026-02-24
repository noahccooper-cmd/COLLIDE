import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getNightOf } from '../lib/utils';
import type { CityKey } from '../lib/constants';
import type { Headcount } from '../lib/types';

export function useHeadcounts(city: CityKey) {
  const [headcounts, setHeadcounts] = useState<Record<string, Headcount>>({});
  const [loading, setLoading] = useState(true);
  const [pulsedVenueId, setPulsedVenueId] = useState<string | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nightOf = getNightOf();

  const fetchHeadcounts = useCallback(async () => {
    if (!envReady) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('headcounts')
      .select('*')
      .eq('city', city)
      .eq('night_of', nightOf);

    if (data) {
      const map: Record<string, Headcount> = {};
      (data as Headcount[]).forEach((row) => {
        map[row.venue_id] = row;
      });
      setHeadcounts(map);
    }
    setLoading(false);
  }, [city, nightOf]);

  useEffect(() => {
    fetchHeadcounts();
  }, [fetchHeadcounts]);

  // Real-time subscription — unique channel name for clean reconnect
  useEffect(() => {
    if (!envReady) return;

    const channelName = `headcounts-rt-${city}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'headcounts',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const row = payload.new as Headcount;
            // Only process rows for our city
            if (row.city !== city) return;
            setHeadcounts(prev => ({ ...prev, [row.venue_id]: row }));

            // Trigger dot pulse
            setPulsedVenueId(row.venue_id);
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
  }, [city]);

  // Listen for direct headcount updates from Portal (same pattern as cover charge sync)
  useEffect(() => {
    const handler = (e: Event) => {
      const { venueId, currentCount, isLive } = (e as CustomEvent).detail;
      setHeadcounts(prev => {
        const existing = prev[venueId];
        if (!existing) return prev;
        return {
          ...prev,
          [venueId]: {
            ...existing,
            current_count: currentCount,
            is_live: isLive,
            updated_at: new Date().toISOString(),
            peak_count: Math.max(existing.peak_count, currentCount),
          },
        };
      });

      // Trigger dot pulse
      setPulsedVenueId(venueId);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setPulsedVenueId(null), 600);
    };
    window.addEventListener('headcount-update', handler);
    return () => window.removeEventListener('headcount-update', handler);
  }, []);

  const getVenueHeadcount = useCallback((venueId: string) => {
    return headcounts[venueId] ?? null;
  }, [headcounts]);

  const getLiveTotalCount = useCallback(() => {
    return Object.values(headcounts).reduce((sum, h) => sum + h.current_count, 0);
  }, [headcounts]);

  return {
    headcounts,
    loading,
    pulsedVenueId,
    getVenueHeadcount,
    getLiveTotalCount,
    refetch: fetchHeadcounts,
  };
}
