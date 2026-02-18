import { useState, useEffect, useCallback } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getCommentDay } from '../lib/utils';
import type { VenueComment } from '../lib/types';

export function useVenueComments(venueId: string | null) {
  const [comments, setComments] = useState<VenueComment[]>([]);
  const [loading, setLoading] = useState(false);

  const dayOf = getCommentDay();

  // Fetch comments for this venue + today
  useEffect(() => {
    if (!envReady || !venueId) {
      setComments([]);
      return;
    }

    setLoading(true);

    supabase
      .from('venue_comments')
      .select('*')
      .eq('venue_id', venueId)
      .eq('day_of', dayOf)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setComments(data as VenueComment[]);
        }
        setLoading(false);
      });
  }, [venueId, dayOf]);

  // Real-time subscription for new comments
  useEffect(() => {
    if (!envReady || !venueId) return;

    const channel = supabase
      .channel(`vc-${venueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'venue_comments',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          const row = payload.new as VenueComment;
          if (row.day_of === dayOf) {
            setComments(prev => [row, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, dayOf]);

  const sendComment = useCallback(async (
    userId: string | null,
    username: string,
    body: string,
  ) => {
    if (!envReady || !venueId || !body.trim()) return { error: 'empty' };

    const { error } = await supabase
      .from('venue_comments')
      .insert({
        venue_id: venueId,
        user_id: userId,
        username,
        body: body.trim().slice(0, 200),
        day_of: dayOf,
      });

    return { error };
  }, [venueId, dayOf]);

  return { comments, loading, sendComment };
}
