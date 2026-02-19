import { useState, useEffect, useCallback } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getCommentDay } from '../lib/utils';
import type { VenueRecap } from '../lib/types';

export function useVenueRecaps(venueId: string | null) {
  const [recaps, setRecaps] = useState<VenueRecap[]>([]);
  const dayOf = getCommentDay();

  // Fetch recaps for venue + today
  useEffect(() => {
    if (!envReady || !venueId) {
      setRecaps([]);
      return;
    }

    supabase
      .from('venue_recaps')
      .select('*')
      .eq('venue_id', venueId)
      .eq('day_of', dayOf)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setRecaps(data as VenueRecap[]);
      });
  }, [venueId, dayOf]);

  // Real-time subscription for new recaps
  useEffect(() => {
    if (!envReady || !venueId) return;

    const channel = supabase
      .channel(`recaps-${venueId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'venue_recaps',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          const row = payload.new as VenueRecap;
          if (row.day_of === dayOf) {
            setRecaps(prev => [row, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, dayOf]);

  const submitRecap = useCallback(async (username: string, body: string, stars: number) => {
    if (!envReady || !venueId || !body.trim() || stars < 1) return;
    await supabase.from('venue_recaps').insert({
      venue_id: venueId,
      username,
      body: body.trim().slice(0, 200),
      stars,
      day_of: dayOf,
    });
  }, [venueId, dayOf]);

  return { recaps, submitRecap };
}
