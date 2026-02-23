import { useState, useEffect, useCallback } from 'react';
import { Minus, Plus, LogOut } from 'lucide-react';
import { formatCount, formatTime } from '../../lib/utils';
import type { Venue, Headcount } from '../../lib/types';
import type { EndNightSummary } from '../../hooks/usePortal';

interface ClickerViewProps {
  venue: Venue;
  headcount: Headcount | null;
  lastAction: { type: string; time: string } | null;
  endSummary: EndNightSummary | null;
  onEnter: (count?: number) => Promise<void>;
  onExit: (count?: number) => Promise<void>;
  onEndNight: () => Promise<void>;
  onUpdateSpecial: (text: string) => Promise<void>;
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
  onUpdateSpecial,
  onUpdateCover,
  onDisconnect,
}: ClickerViewProps) {
  const [flashClass, setFlashClass] = useState('');
  const [bumpKey, setBumpKey] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [specialText, setSpecialText] = useState(venue.tonight_special ?? '');
  const [specialSaved, setSpecialSaved] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string>(() => {
    const current = venue.cover_charge;
    if (!current || current === 'FREE') return 'FREE';
    const match = COVER_PRESETS.find(p => p === current);
    return match ?? 'FREE';
  });

  // Sync selectedCover when venue or its cover_charge changes (re-login, refetch, realtime)
  useEffect(() => {
    const current = venue.cover_charge;
    console.log('PORTAL COVER SYNC: venue.cover_charge =', current, 'for', venue.name);
    if (!current || current === 'FREE') {
      setSelectedCover('FREE');
    } else {
      const match = COVER_PRESETS.find(p => p === current);
      setSelectedCover(match ?? 'FREE');
    }
  }, [venue.id, venue.cover_charge]);
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

  const handleUpdateSpecial = useCallback(async () => {
    if (!specialText.trim()) return;
    await onUpdateSpecial(specialText);
    setSpecialSaved(true);
    setTimeout(() => setSpecialSaved(false), 3000);
  }, [specialText, onUpdateSpecial]);

  const handleClearSpecial = useCallback(async () => {
    await onUpdateSpecial('');
    setSpecialText('');
  }, [onUpdateSpecial]);

  const handleCoverTap = useCallback(async (preset: string) => {
    setSelectedCover(preset);
    if (navigator.vibrate) navigator.vibrate(40);
    await onUpdateCover(preset);
  }, [onUpdateCover]);

  // Auto-clear special at 6am
  useEffect(() => {
    const scheduleAutoClear = () => {
      const now = new Date();
      const sixAm = new Date(now);
      sixAm.setHours(6, 0, 0, 0);
      if (now >= sixAm) sixAm.setDate(sixAm.getDate() + 1);
      const ms = sixAm.getTime() - now.getTime();
      return setTimeout(() => {
        onUpdateSpecial('');
        setSpecialText('');
      }, ms);
    };
    const timer = scheduleAutoClear();
    return () => clearTimeout(timer);
  }, [onUpdateSpecial]);

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
            className="w-full h-[52px] rounded-xl font-bold text-white text-base mt-6 active:scale-[0.98] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif', background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)' }}
          >
            DONE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#050507] flex flex-col ${flashClass}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
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
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Count Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div key={bumpKey} className="count-bump">
          <span className="text-white font-black leading-none"
            style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '96px' }}>
            {formatCount(count)}
          </span>
        </div>
        <p className="text-[#8A8A95] text-sm mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          inside right now
        </p>
        {peak > 0 && headcount?.updated_at && (
          <p className="text-[#55555F] text-xs mt-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Peak: {formatCount(peak)} at {formatTime(headcount.updated_at)}
          </p>
        )}
      </div>

      {/* Cover Charge — instant save on tap */}
      <div className="px-4 pb-2">
        <div className="p-4 bg-[#111114] border border-[#2A2A30] rounded-xl">
          <p className="text-[#8A8A95] text-xs font-bold tracking-wider mb-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            {'\uD83D\uDCB5'} COVER
          </p>
          <div className="flex gap-2 justify-between mb-3">
            {COVER_PRESETS.map(preset => {
              const isSelected = selectedCover === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleCoverTap(preset)}
                  className="flex items-center justify-center active:scale-[0.95] transition-transform"
                  style={{
                    fontFamily: 'Satoshi, sans-serif',
                    width: 70,
                    height: 40,
                    borderRadius: 20,
                    background: isSelected ? '#22C55E' : '#1A1A24',
                    color: isSelected ? 'white' : '#22C55E',
                    fontWeight: 'bold',
                    fontSize: 14,
                    border: isSelected ? '2px solid white' : '2px solid #22C55E',
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
      <div className="px-4 pb-3">
        <div className="flex gap-3">
          <button
            onClick={() => handleExit()}
            className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ height: '180px', backgroundColor: '#5C1A1A' }}
          >
            <Minus size={64} strokeWidth={2.5} className="text-white" />
            <span className="text-white font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>EXIT</span>
          </button>
          <button
            onClick={() => handleEnter()}
            className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ height: '180px', backgroundColor: '#00E676' }}
          >
            <Plus size={64} strokeWidth={2.5} className="text-white" />
            <span className="text-white font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>ENTER</span>
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
        <div className="mt-4">
          {confirmEnd ? (
            <div className="flex flex-col gap-2">
              <p className="text-[#8A8A95] text-sm text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                End tracking for {venue.name} tonight?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="flex-1 h-11 rounded-xl bg-[#111114] border border-[#2A2A30] text-[#8A8A95] text-sm font-medium"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndNight}
                  className="flex-1 h-11 rounded-xl bg-[#FF2D05] text-white text-sm font-bold"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                >
                  End Tracking
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="w-full h-11 rounded-xl bg-[#111114] border border-[#2A2A30] text-[#55555F] text-sm font-medium hover:text-[#FF2D05] hover:border-[#FF2D0533] transition-colors"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              End Night
            </button>
          )}
        </div>

        {/* Tonight's Special input */}
        <div className="mt-4 mb-2 p-4 bg-[#111114] border border-[#2A2A30] rounded-xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          <p className="text-[#8A8A95] text-xs font-bold tracking-wider mb-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            {'\uD83C\uDF89'} TONIGHT'S SPECIAL
          </p>
          {venue.tonight_special && !specialSaved ? (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {venue.tonight_special.split('|').map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-white text-sm font-medium"
                    style={{ fontFamily: 'Satoshi, sans-serif', background: 'rgba(255, 94, 26, 0.25)', border: '1px solid rgba(255, 94, 26, 0.4)' }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {specialSaved ? (
            <div className="flex items-center gap-2 py-3 justify-center">
              <span className="text-[#00E676] text-sm font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {'\u2705'} Special set!
              </span>
              <span className="text-[#8A8A95] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {specialText}
              </span>
            </div>
          ) : (
            <>
              <input
                value={specialText}
                onChange={e => setSpecialText(e.target.value.slice(0, 200))}
                placeholder="e.g. $3 wells til midnight | $20 cover til 9"
                className="w-full h-11 px-3 bg-[#050507] border border-[#2A2A30] rounded-lg text-white text-sm outline-none focus:border-[#FF5E1A] transition-colors placeholder-[#444]"
                style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '16px' }}
              />
              <p className="text-[#55555F] text-[10px] mt-1 mb-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Use | to separate multiple specials
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateSpecial}
                  disabled={!specialText.trim()}
                  className="flex-1 h-11 rounded-lg text-white text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-40"
                  style={{
                    fontFamily: 'Satoshi, sans-serif',
                    background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)',
                  }}
                >
                  Set Special
                </button>
                {venue.tonight_special && (
                  <button
                    onClick={handleClearSpecial}
                    className="h-11 px-4 rounded-lg text-[#8A8A95] text-sm font-medium bg-[#1A1A22] border border-[#2A2A30] active:scale-[0.98] transition-transform"
                    style={{ fontFamily: 'Satoshi, sans-serif' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
