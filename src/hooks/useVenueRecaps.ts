import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getCommentDay } from '../lib/utils';
import type { VenueRecap } from '../lib/types';

export function useVenueRecaps(venueId: string | null) {
  const [recaps, setRecaps] = useState<VenueRecap[]>([]);
  const dayOf = getCommentDay();
  // Track IDs we already have to avoid realtime duplicates
  const knownIds = useRef(new Set<string>());

  // Fetch recaps for venue + today
  useEffect(() => {
    if (!envReady || !venueId) {
      setRecaps([]);
      knownIds.current.clear();
      return;
    }

    supabase
      .from('venue_recaps')
      .select('*')
      .eq('venue_id', venueId)
      .eq('day_of', dayOf)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error('[recap] Fetch error:', error.message);
          return;
        }
        const rows = (data as VenueRecap[]) ?? [];
        knownIds.current = new Set(rows.map(r => r.id));
        setRecaps(rows);
      });
  }, [venueId, dayOf]);

  // Real-time subscription for new recaps from OTHER users
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
          if (row.day_of !== dayOf) return;
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);
          setRecaps(prev => [row, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, dayOf]);

  const submitRecap = useCallback(async (username: string, body: string, stars: number) => {
    if (!envReady || !venueId || !body.trim() || stars < 1) return;

    const trimmed = body.trim().slice(0, 200);

    const { data, error } = await supabase
      .from('venue_recaps')
      .insert({
        venue_id: venueId,
        username,
        body: trimmed,
        stars,
        day_of: dayOf,
      })
      .select()
      .single();

    if (error) {
      console.error('[recap] Insert error:', error.message);
      return;
    }

    if (data) {
      const row = data as VenueRecap;
      knownIds.current.add(row.id);
      setRecaps(prev => [row, ...prev]);
    }
  }, [venueId, dayOf]);

  return { recaps, submitRecap };
}
