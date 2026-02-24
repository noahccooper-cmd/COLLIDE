import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getNightOf } from '../lib/utils';
import type { Venue, Headcount } from '../lib/types';

const COOLDOWN_MS = 150;
const PORTAL_CODE_KEY = 'venue_portal_code';

export interface EndNightSummary {
  venueName: string;
  peakCount: number;
  peakTime: string;
}

export function usePortal() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [headcount, setHeadcount] = useState<Headcount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<{ type: string; time: string } | null>(null);
  const [endSummary, setEndSummary] = useState<EndNightSummary | null>(null);
  const cooldownRef = useRef(false);

  const savedCode = localStorage.getItem(PORTAL_CODE_KEY) ?? '';

  // Real-time subscription for this venue's headcount
  useEffect(() => {
    if (!envReady || !venue) return;

    const channel = supabase
      .channel(`portal-hc-${venue.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'headcounts',
          filter: `venue_id=eq.${venue.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const row = payload.new as Headcount;
            setHeadcount(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venue?.id]);

  const lookupVenueByCode = useCallback(async (code: string) => {
    if (!envReady) return { error: 'Not configured' };

    setLoading(true);
    setError('');
    setEndSummary(null);

    const { data, error: err } = await supabase
      .from('venues')
      .select('*')
      .eq('staff_code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    setLoading(false);

    if (err || !data) {
      setError('Invalid venue code');
      return { error: 'Invalid venue code' };
    }

    setVenue(data as Venue);
    localStorage.setItem(PORTAL_CODE_KEY, code.toUpperCase());

    // Fetch tonight's headcount
    const nightOf = getNightOf();
    const { data: hc } = await supabase
      .from('headcounts')
      .select('*')
      .eq('venue_id', data.id)
      .eq('night_of', nightOf)
      .single();

    if (hc) {
      setHeadcount(hc as Headcount);
    }

    return { error: null };
  }, []);

  const handleEnter = useCallback(async (count = 1) => {
    if (!venue || cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);

    const nightOf = getNightOf();

    // Optimistic update
    setHeadcount(prev => {
      const newCount = Math.max((prev?.current_count ?? 0) + count, 0);
      return {
        ...(prev ?? {
          id: '',
          created_at: new Date().toISOString(),
          venue_id: venue.id,
          city: venue.city,
          night_of: nightOf,
          last_updated_by: null,
          is_live: true,
          peak_count: 0,
        }),
        updated_at: new Date().toISOString(),
        current_count: newCount,
        peak_count: Math.max(prev?.peak_count ?? 0, newCount),
      } as Headcount;
    });

    setLastAction({ type: `+${count}`, time: new Date().toISOString() });

    const { data } = await supabase.rpc(count === 1 ? 'increment_headcount' : 'adjust_headcount', {
      target_venue: venue.id,
      target_city: venue.city,
      target_night: nightOf,
      staff_user: null,
      ...(count !== 1 ? { adjustment: count } : {}),
    });

    if (data) {
      const result = data as { new_count: number; peak?: number };
      setHeadcount(prev => prev ? {
        ...prev,
        current_count: result.new_count,
        peak_count: result.peak ?? prev.peak_count,
      } : null);

      supabase.from('clicker_logs').insert({
        venue_id: venue.id,
        staff_id: null,
        action: 'enter',
        night_of: nightOf,
        count_after: result.new_count,
      });
    }
  }, [venue]);

  const handleExit = useCallback(async (count = 1) => {
    if (!venue || cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);

    const nightOf = getNightOf();

    setHeadcount(prev => prev ? {
      ...prev,
      updated_at: new Date().toISOString(),
      current_count: Math.max(prev.current_count - count, 0),
    } : null);

    setLastAction({ type: `-${count}`, time: new Date().toISOString() });

    const { data } = await supabase.rpc(count === 1 ? 'decrement_headcount' : 'adjust_headcount', {
      target_venue: venue.id,
      target_city: venue.city,
      target_night: nightOf,
      staff_user: null,
      ...(count !== 1 ? { adjustment: -count } : {}),
    });

    if (data) {
      const result = data as { new_count: number };
      setHeadcount(prev => prev ? {
        ...prev,
        current_count: result.new_count,
      } : null);

      supabase.from('clicker_logs').insert({
        venue_id: venue.id,
        staff_id: null,
        action: 'exit',
        night_of: nightOf,
        count_after: result.new_count,
      });
    }
  }, [venue]);

  const updateSpecial = useCallback(async (text: string) => {
    if (!venue || !envReady) return;
    const specialText = text.trim() || null;
    await supabase
      .from('venues')
      .update({
        tonight_special: specialText,
        special_updated_at: specialText ? new Date().toISOString() : null,
      })
      .eq('id', venue.id);

    setVenue(prev => prev ? { ...prev, tonight_special: specialText, special_updated_at: specialText ? new Date().toISOString() : null } : null);
  }, [venue]);

  const updateCover = useCallback(async (text: string) => {
    if (!venue || !envReady) return;
    const coverText = text.trim() || null;
    const { error } = await supabase
      .from('venues')
      .update({ cover_charge: coverText })
      .eq('id', venue.id);

    setVenue(prev => prev ? { ...prev, cover_charge: coverText } : null);

    // Push cover update directly into useVenues state (same pattern as headcount realtime)
    // This is immediate — no async refetch, no race condition
    if (!error) {
      window.dispatchEvent(new CustomEvent('venues-cover-update', {
        detail: { venueId: venue.id, cover_charge: coverText },
      }));
    }
  }, [venue]);

  const endNight = useCallback(async () => {
    if (!venue) return;
    const nightOf = getNightOf();

    const summary: EndNightSummary = {
      venueName: venue.name,
      peakCount: headcount?.peak_count ?? 0,
      peakTime: headcount?.updated_at ?? new Date().toISOString(),
    };

    await supabase
      .from('headcounts')
      .update({ is_live: false })
      .eq('venue_id', venue.id)
      .eq('night_of', nightOf);

    await supabase
      .from('venues')
      .update({ is_clicker_live: false })
      .eq('id', venue.id);

    setHeadcount(prev => prev ? { ...prev, is_live: false } : null);
    setEndSummary(summary);
  }, [venue, headcount]);

  const disconnect = useCallback(() => {
    setVenue(null);
    setHeadcount(null);
    setLastAction(null);
    setError('');
    setEndSummary(null);
  }, []);

  return {
    venue,
    headcount,
    loading,
    error,
    lastAction,
    savedCode,
    endSummary,
    lookupVenueByCode,
    handleEnter,
    handleExit,
    updateSpecial,
    updateCover,
    endNight,
    disconnect,
  };
}
