import { useState, useCallback, useRef } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getNightOf } from '../lib/utils';
import type { Venue, Headcount } from '../lib/types';

const COOLDOWN_MS = 300;
const PORTAL_CODE_KEY = 'venue_portal_code';

export function usePortal() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [headcount, setHeadcount] = useState<Headcount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<{ type: string; time: string } | null>(null);
  const cooldownRef = useRef(false);

  const savedCode = localStorage.getItem(PORTAL_CODE_KEY) ?? '';

  const lookupVenueByCode = useCallback(async (code: string) => {
    if (!envReady) return { error: 'Not configured' };

    setLoading(true);
    setError('');

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

    const { data } = await supabase.rpc(count === 1 ? 'increment_headcount' : 'adjust_headcount', {
      target_venue: venue.id,
      target_city: venue.city,
      target_night: nightOf,
      staff_user: null,
      ...(count !== 1 ? { adjustment: count } : {}),
    });

    if (data) {
      setHeadcount(prev => ({
        ...(prev ?? {
          id: '',
          created_at: new Date().toISOString(),
          venue_id: venue.id,
          city: venue.city,
          night_of: nightOf,
          last_updated_by: null,
          is_live: true,
        }),
        updated_at: new Date().toISOString(),
        current_count: (data as { new_count: number }).new_count,
        peak_count: (data as { peak?: number }).peak ?? (prev?.peak_count ?? 0),
      } as Headcount));
    }

    setLastAction({ type: `+${count}`, time: new Date().toISOString() });

    // Haptic
    if (navigator.vibrate) navigator.vibrate(50);

    // Log
    await supabase.from('clicker_logs').insert({
      venue_id: venue.id,
      staff_id: null,
      action: 'enter',
      night_of: nightOf,
      count_after: (data as { new_count: number })?.new_count ?? 0,
    });
  }, [venue]);

  const handleExit = useCallback(async (count = 1) => {
    if (!venue || cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);

    const nightOf = getNightOf();

    const { data } = await supabase.rpc(count === 1 ? 'decrement_headcount' : 'adjust_headcount', {
      target_venue: venue.id,
      target_city: venue.city,
      target_night: nightOf,
      staff_user: null,
      ...(count !== 1 ? { adjustment: -count } : {}),
    });

    if (data) {
      setHeadcount(prev => prev ? {
        ...prev,
        updated_at: new Date().toISOString(),
        current_count: (data as { new_count: number }).new_count,
      } : null);
    }

    setLastAction({ type: `-${count}`, time: new Date().toISOString() });

    if (navigator.vibrate) navigator.vibrate(50);

    await supabase.from('clicker_logs').insert({
      venue_id: venue.id,
      staff_id: null,
      action: 'exit',
      night_of: nightOf,
      count_after: (data as { new_count: number })?.new_count ?? 0,
    });
  }, [venue]);

  const endNight = useCallback(async () => {
    if (!venue) return;
    const nightOf = getNightOf();

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
  }, [venue]);

  const disconnect = useCallback(() => {
    setVenue(null);
    setHeadcount(null);
    setLastAction(null);
    setError('');
  }, []);

  return {
    venue,
    headcount,
    loading,
    error,
    lastAction,
    savedCode,
    lookupVenueByCode,
    handleEnter,
    handleExit,
    endNight,
    disconnect,
  };
}
