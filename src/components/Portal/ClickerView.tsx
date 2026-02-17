import { useState, useEffect, useCallback } from 'react';
import { Minus, Plus, LogOut } from 'lucide-react';
import { formatCount, formatTime } from '../../lib/utils';
import type { Venue, Headcount } from '../../lib/types';

interface ClickerViewProps {
  venue: Venue;
  headcount: Headcount | null;
  lastAction: { type: string; time: string } | null;
  onEnter: (count?: number) => Promise<void>;
  onExit: (count?: number) => Promise<void>;
  onEndNight: () => Promise<void>;
  onDisconnect: () => void;
}

export function ClickerView({
  venue,
  headcount,
  lastAction,
  onEnter,
  onExit,
  onEndNight,
  onDisconnect,
}: ClickerViewProps) {
  const [flashClass, setFlashClass] = useState('');
  const [bumpKey, setBumpKey] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
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
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setFlashClass(''), 400);
    await onEnter(n);
  }, [onEnter]);

  const handleExit = useCallback(async (n = 1) => {
    setFlashClass('clicker-flash-exit');
    setBumpKey(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setFlashClass(''), 400);
    await onExit(n);
  }, [onExit]);

  const handleEndNight = useCallback(async () => {
    setConfirmEnd(false);
    await onEndNight();
  }, [onEndNight]);

  return (
    <div className={`min-h-screen bg-[#050507] flex flex-col ${flashClass}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div>
          <h1 className="text-white font-black text-lg tracking-[0.05em]"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            <span>ven</span>
            <span className="text-[#FF5E1A]">U</span>
            <span>e</span>
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

      {/* Main Buttons */}
      <div className="px-4 pb-3">
        <div className="flex gap-3">
          {/* EXIT */}
          <button
            onClick={() => handleExit()}
            className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{
              height: '180px',
              backgroundColor: '#5C1A1A',
            }}
          >
            <Minus size={64} strokeWidth={2.5} className="text-white" />
            <span className="text-white font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>
              EXIT
            </span>
          </button>

          {/* ENTER */}
          <button
            onClick={() => handleEnter()}
            className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{
              height: '180px',
              backgroundColor: '#00E676',
            }}
          >
            <Plus size={64} strokeWidth={2.5} className="text-white" />
            <span className="text-white font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>
              ENTER
            </span>
          </button>
        </div>

        {/* Adjust row + last action */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => handleExit(5)}
            className="flex-1 h-12 rounded-xl bg-[#111114] border border-[#2A2A30] flex items-center justify-center gap-1 text-[#8A8A95] font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            <Minus size={14} strokeWidth={2} /> 5
          </button>
          <div className="flex-1 flex items-center justify-center">
            {lastAction ? (
              <p className="text-[#55555F] text-xs text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Last: {lastAction.type} {formatTime(lastAction.time)}
              </p>
            ) : null}
          </div>
          <button
            onClick={() => handleEnter(5)}
            className="flex-1 h-12 rounded-xl bg-[#111114] border border-[#2A2A30] flex items-center justify-center gap-1 text-[#8A8A95] font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            <Plus size={14} strokeWidth={2} /> 5
          </button>
        </div>

        {/* End Night */}
        <div className="mt-4 mb-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          {confirmEnd ? (
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
      </div>
    </div>
  );
}
