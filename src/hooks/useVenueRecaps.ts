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

    console.log('[recap] Fetching recaps for venue', venueId, 'day', dayOf);

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
        console.log('[recap] Loaded', rows.length, 'recaps');
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
          // Skip if we already added this optimistically
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);
          setRecaps(prev => [row, ...prev]);
          console.log('[recap] Realtime new recap from', row.username);
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
    console.log('[recap] Submitting:', { venue_id: venueId, username, stars, body: trimmed, day_of: dayOf });

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
      console.error('[recap] Insert error:', error.message, error.details, error.hint);
      alert(`Recap failed: ${error.message}`);
      return;
    }

    // Optimistic: add immediately so user sees it
    if (data) {
      const row = data as VenueRecap;
      knownIds.current.add(row.id);
      setRecaps(prev => [row, ...prev]);
      console.log('[recap] Posted successfully, id:', row.id);
    }
  }, [venueId, dayOf]);

  return { recaps, submitRecap };
}
