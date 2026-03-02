import { useState, useEffect, useCallback } from 'react';
import { Minus, Plus, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCount, formatTime, timeAgo } from '../../lib/utils';
import type { Venue, Headcount, VenueRecap } from '../../lib/types';
import type { EndNightSummary } from '../../hooks/usePortal';

interface ClickerViewProps {
  venue: Venue;
  headcount: Headcount | null;
  lastAction: { type: string; time: string } | null;
  endSummary: EndNightSummary | null;
  onEnter: (count?: number) => Promise<void>;
  onExit: (count?: number) => Promise<void>;
  onEndNight: () => Promise<void>;
  onUpdateCover: (text: string) => Promise<void>;
  onDisconnect: () => void;
}

const COVER_PRESETS = ['FREE', '$10', '$20', '$40'];

export function ClickerView({
  venue,
  headcount,
  lastAction,
  endSummary,
  onEnter,
  onExit,
  onEndNight,
  onUpdateCover,
  onDisconnect,
}: ClickerViewProps) {
  const [flashClass, setFlashClass] = useState('');
  const [bumpKey, setBumpKey] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [specialText, setSpecialText] = useState('');
  const [specialConfirm, setSpecialConfirm] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastConfirm, setBroadcastConfirm] = useState('');
  const [updates, setUpdates] = useState<{ id: string; venue_id: string; venue_name: string; message: string; created_at: string }[]>([]);
  const [recaps, setRecaps] = useState<VenueRecap[]>([]);
  const [recapsOpen, setRecapsOpen] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string>(() => {
    const current = venue.cover_charge;
    if (!current || current === 'FREE') return 'FREE';
    const match = COVER_PRESETS.find(p => p === current);
    return match ?? 'FREE';
  });

  // Sync selectedCover when venue or its cover_charge changes (re-login, refetch, realtime)
  useEffect(() => {
    const current = venue.cover_charge;
    if (!current || current === 'FREE') {
      setSelectedCover('FREE');
    } else {
      const match = COVER_PRESETS.find(p => p === current);
      setSelectedCover(match ?? 'FREE');
    }
  }, [venue.id, venue.cover_charge]);

  // Load current special on mount
  useEffect(() => {
    const loadSpecial = async () => {
      const { data } = await supabase
        .from('venues')
        .select('special')
        .eq('id', venue.id)
        .single();
      if (data?.special) setSpecialText(data.special);
    };
    loadSpecial();
  }, [venue.id]);

  // Fetch all recaps for this venue
  useEffect(() => {
    const loadRecaps = async () => {
      const { data } = await supabase
        .from('venue_recaps')
        .select('*')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setRecaps(data as VenueRecap[]);
    };
    loadRecaps();
  }, [venue.id]);

  const count = headcount?.current_count ?? 0;
  const peak = headcount?.peak_count ?? 0;
  const isLive = headcount?.is_live ?? false;

  // Request wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch { /* ignore */ }
    };
    requestWakeLock();
    return () => { wakeLock?.release(); };
  }, []);

  const handleEnter = useCallback(async (n = 1) => {
    setFlashClass('clicker-flash-enter');
    setBumpKey(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => setFlashClass(''), 400);
    await onEnter(n);
  }, [onEnter]);

  const handleExit = useCallback(async (n = 1) => {
    setFlashClass('clicker-flash-exit');
    setBumpKey(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => setFlashClass(''), 400);
    await onExit(n);
  }, [onExit]);

  const handleEndNight = useCallback(async () => {
    setConfirmEnd(false);
    await onEndNight();
  }, [onEndNight]);

  const handleSetSpecial = useCallback(async () => {
    if (!specialText.trim()) return;
    await supabase
      .from('venues')
      .update({ special: specialText.trim() })
      .eq('id', venue.id);
    setSpecialConfirm('Special set ✓');
    setTimeout(() => setSpecialConfirm(''), 2000);
  }, [specialText, venue.id]);

  const handleClearSpecial = useCallback(async () => {
    await supabase
      .from('venues')
      .update({ special: null })
      .eq('id', venue.id);
    setSpecialText('');
    setSpecialConfirm('Special cleared');
    setTimeout(() => setSpecialConfirm(''), 2000);
  }, [venue.id]);

  const handleCoverTap = useCallback(async (preset: string) => {
    setSelectedCover(preset);
    if (navigator.vibrate) navigator.vibrate(40);
    await onUpdateCover(preset);
  }, [onUpdateCover]);

  const handleSendUpdate = useCallback(async () => {
    if (!broadcastText.trim()) return;
    await supabase.from('venue_updates').insert({
      venue_id: venue.id,
      venue_name: venue.name,
      message: broadcastText.trim(),
    });
    setBroadcastText('');
    setBroadcastConfirm('Dropped \u2713');
    setTimeout(() => setBroadcastConfirm(''), 2000);
  }, [broadcastText, venue.id, venue.name]);

  // Fetch active venue updates + realtime subscription
  useEffect(() => {
    const fetchUpdates = async () => {
      const { data } = await supabase
        .from('venue_updates')
        .select('id, venue_id, venue_name, message, created_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setUpdates(data);
    };
    fetchUpdates();

    const channel = supabase
      .channel(`venue-updates-rt-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'venue_updates' },
        (payload) => {
          const row = payload.new as { id: string; venue_id: string; venue_name: string; message: string; created_at: string; expires_at: string };
          if (new Date(row.expires_at) > new Date()) {
            setUpdates(prev => [row, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Show end-of-night summary
  if (endSummary) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-white font-black text-2xl tracking-[0.05em] mb-6"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            venuu
          </h1>
          <div className="bg-[#111114] border border-[#2A2A30] rounded-2xl p-6">
            <p className="text-[#8A8A95] text-sm mb-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>Tonight at</p>
            <h2 className="text-white font-black text-xl mb-4" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {endSummary.venueName}
            </h2>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-white font-black text-5xl" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {formatCount(endSummary.peakCount)}
              </span>
              <span className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>peak</span>
            </div>
            <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              at {formatTime(endSummary.peakTime)}
            </p>
          </div>
          <button
            onClick={onDisconnect}
            className="w-full rounded-xl font-bold text-white mt-6 active:scale-[0.98] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif', background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)', height: '52px', fontSize: '16px' }}
          >
            DONE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#050507] flex flex-col ${flashClass}`}
      style={{ overscrollBehavior: 'none', touchAction: 'manipulation', overflowY: 'auto', paddingBottom: '160px' }}>
      {/* Header */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <div>
          <h1 className="text-white font-black text-lg tracking-[0.05em]"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            <span>venuu</span>
            <span className="text-[#8A8A95] font-bold text-sm ml-2">Portal</span>
          </h1>
          <p className="text-white text-sm font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            {venue.name}
          </p>
          {venue.address && (
            <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {venue.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#00E676] live-dot" />
              <span className="text-[#00E676] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                LIVE
              </span>
            </div>
          )}
          <button
            onClick={onDisconnect}
            className="p-2 rounded-lg bg-[#111114] text-[#55555F] hover:text-white transition-colors"
            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Count Display */}
      <div className="flex flex-col items-center justify-center px-6" style={{ padding: '12px 24px' }}>
        <div key={bumpKey} className="count-bump">
          <span className="text-white font-black leading-none"
            style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '64px' }}>
            {formatCount(count)}
          </span>
        </div>
        <p className="text-[#8A8A95] text-sm mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          inside right now
        </p>
        {peak > 0 && headcount?.updated_at && (
          <p className="text-[#55555F] text-xs mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Peak: {formatCount(peak)} at {formatTime(headcount.updated_at)}
          </p>
        )}
      </div>

      {/* Cover Charge — instant save on tap */}
      <div className="px-4 pb-1">
        <div className="bg-[#111114] border border-[#2A2A30] rounded-xl" style={{ padding: '10px 16px' }}>
          <p className="text-[#8A8A95] text-xs font-bold tracking-wider mb-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            {'\uD83D\uDCB5'} COVER
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '8px' }}>
            {COVER_PRESETS.map(preset => {
              const isSelected = selectedCover === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleCoverTap(preset)}
                  className="active:scale-[0.95] transition-transform"
                  style={{
                    fontFamily: 'Satoshi, sans-serif',
                    minWidth: '60px',
                    height: '40px',
                    borderRadius: '20px',
                    background: isSelected ? '#22C55E' : '#1A1A24',
                    color: isSelected ? 'white' : '#22C55E',
                    fontWeight: 700,
                    fontSize: '16px',
                    border: isSelected ? '2px solid white' : '2px solid #22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <p className="text-[#22C55E] text-sm font-bold text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Cover: {selectedCover}
          </p>
        </div>
      </div>

      {/* Main Buttons */}
      <div className="px-4 pb-2">
        <div className="flex gap-3">
          <button
            onClick={() => handleExit()}
            className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
            style={{ height: '100px', backgroundColor: '#5C1A1A', borderRadius: '16px' }}
          >
            <Minus size={32} strokeWidth={2.5} className="text-white" />
            <span className="text-white tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '18px', fontWeight: 800 }}>EXIT</span>
          </button>
          <button
            onClick={() => handleEnter()}
            className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
            style={{ height: '100px', backgroundColor: '#00E676', borderRadius: '16px' }}
          >
            <Plus size={32} strokeWidth={2.5} className="text-white" />
            <span className="text-white tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '18px', fontWeight: 800 }}>ENTER</span>
          </button>
        </div>

        {/* Bulk buttons */}
        <div className="clicker-bulk-row">
          <button onClick={() => handleExit(5)} className="clicker-bulk minus">-5</button>
          <button onClick={() => handleExit(2)} className="clicker-bulk minus">-2</button>
          <button onClick={() => handleEnter(2)} className="clicker-bulk plus">+2</button>
          <button onClick={() => handleEnter(5)} className="clicker-bulk plus">+5</button>
        </div>

        {/* Last action */}
        {lastAction && (
          <p className="text-[#55555F] text-xs text-center mt-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Last: {lastAction.type} at {formatTime(lastAction.time)}
          </p>
        )}

        {/* End Night */}
        <div className="mt-3">
          {confirmEnd ? (
            <div className="flex flex-col gap-2">
              <p className="text-[#8A8A95] text-sm text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                End tracking for {venue.name} tonight?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEnd(false)}
                  style={{
                    flex: 1,
                    height: '48px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'Satoshi, sans-serif',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndNight}
                  style={{
                    flex: 1,
                    height: '48px',
                    borderRadius: '12px',
                    background: '#FF2D05',
                    border: 'none',
                    color: 'white',
                    fontFamily: 'Satoshi, sans-serif',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                >
                  End Tracking
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: 'Satoshi, sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              End Night
            </button>
          )}
        </div>

        {/* Tonight's Special */}
        <div style={{ marginTop: '14px', padding: '0 0 20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            {'\uD83C\uDF89'} TONIGHT'S SPECIAL
          </div>
          <input
            type="text"
            value={specialText}
            onChange={(e) => setSpecialText(e.target.value)}
            placeholder="e.g. $3 wells til midnight"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '0 16px',
              fontSize: '15px',
              color: 'white',
              outline: 'none',
              boxSizing: 'border-box' as const,
              marginBottom: '8px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSetSpecial}
              style={{
                flex: 3,
                height: '44px',
                borderRadius: '12px',
                background: '#FF8200',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              SET SPECIAL
            </button>
            <button
              onClick={handleClearSpecial}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          </div>
          {specialConfirm && (
            <div style={{
              color: '#22C55E',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              marginTop: '6px',
            }}>
              {specialConfirm}
            </div>
          )}
        </div>

        {/* The Drop */}
        <div style={{ marginTop: '14px', padding: '0 0 14px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            {'\uD83D\uDD25'} THE DROP
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value.slice(0, 140))}
              placeholder="e.g. Cover just dropped to FREE! Come thru"
              maxLength={140}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '0 50px 0 16px',
                fontSize: '15px',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
            <span style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: broadcastText.length > 120 ? '#FF8200' : 'rgba(255,255,255,0.25)',
              fontWeight: 600,
              pointerEvents: 'none',
            }}>
              {140 - broadcastText.length}
            </span>
          </div>
          <button
            onClick={handleSendUpdate}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              background: '#FF8200',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            DROP IT
          </button>
          {broadcastConfirm && (
            <div style={{
              color: '#22C55E',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              marginTop: '6px',
            }}>
              {broadcastConfirm}
            </div>
          )}

          {/* Live feed */}
          {updates.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {updates.map(u => (
                <div
                  key={u.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeft: u.venue_id === venue.id ? '3px solid #FF8200' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', fontFamily: 'Satoshi, sans-serif' }}>
                      {u.venue_name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      {timeAgo(u.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.3' }}>
                    {u.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recaps */}
        <div style={{ marginTop: '14px', padding: '0 0 24px' }}>
          <button
            onClick={() => setRecapsOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              marginBottom: recapsOpen ? '10px' : 0,
            }}
          >
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1px',
              textTransform: 'uppercase' as const,
            }}>
              {'\u2B50'} RECAPS ({recaps.length})
            </span>
            <ChevronDown
              size={14}
              style={{
                color: 'rgba(255,255,255,0.4)',
                transition: 'transform 0.2s',
                transform: recapsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {recapsOpen && (
            recaps.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Satoshi, sans-serif' }}>
                No recaps yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recaps.map(r => (
                  <div
                    key={r.id}
                    style={{
                      background: '#0A0A0F',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', fontFamily: 'Satoshi, sans-serif' }}>
                        {r.username}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} style={{ fontSize: '14px', color: i < r.stars ? '#FF8200' : '#2A2A30' }}>
                          {'\u2605'}
                        </span>
                      ))}
                    </div>
                    {r.body && (
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4', fontFamily: 'Satoshi, sans-serif' }}>
                        {r.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
