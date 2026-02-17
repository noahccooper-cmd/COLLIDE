import { useState, useEffect } from 'react';
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
  const count = headcount?.current_count ?? 0;
  const peak = headcount?.peak_count ?? 0;
  const isLive = headcount?.is_live ?? false;
  const cityLabel = venue.city === 'knoxville' ? 'Knoxville' : 'Tampa';

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

  const handleEnter = async (n = 1) => {
    setFlashClass('clicker-flash-enter');
    setBumpKey(prev => prev + 1);
    setTimeout(() => setFlashClass(''), 400);
    await onEnter(n);
  };

  const handleExit = async (n = 1) => {
    setFlashClass('clicker-flash-exit');
    setBumpKey(prev => prev + 1);
    setTimeout(() => setFlashClass(''), 400);
    await onExit(n);
  };

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
          <p className="text-[#8A8A95] text-sm font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            {venue.name} — {cityLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#00B4FF] live-dot" />
              <span className="text-[#00B4FF] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
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
              height: '200px',
              backgroundColor: '#1a0000',
              border: '2px solid #3d0000',
            }}
          >
            <Minus size={48} strokeWidth={3} className="text-[#8B0000]" />
            <span className="text-[#8B0000] font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>
              EXIT
            </span>
          </button>

          {/* ENTER */}
          <button
            onClick={() => handleEnter()}
            className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{
              height: '200px',
              backgroundColor: '#002b15',
              border: '2px solid #004d29',
            }}
          >
            <Plus size={48} strokeWidth={3} className="text-[#00E676]" />
            <span className="text-[#00E676] font-black text-lg tracking-wider"
              style={{ fontFamily: 'Satoshi, sans-serif' }}>
              ENTER
            </span>
          </button>
        </div>

        {/* Adjust row */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => handleExit(5)}
            className="flex-1 h-12 rounded-xl bg-[#111114] border border-[#2A2A30] flex items-center justify-center gap-1 text-[#8A8A95] font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            <Minus size={14} strokeWidth={2} /> 5
          </button>
          <button
            onClick={() => handleEnter(5)}
            className="flex-1 h-12 rounded-xl bg-[#111114] border border-[#2A2A30] flex items-center justify-center gap-1 text-[#8A8A95] font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            <Plus size={14} strokeWidth={2} /> 5
          </button>
        </div>

        {/* Last action + End Night */}
        <div className="flex items-center justify-between mt-4 mb-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          {lastAction ? (
            <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              Last: {lastAction.type} at {formatTime(lastAction.time)}
            </p>
          ) : (
            <span />
          )}
          <button
            onClick={onEndNight}
            className="text-[#55555F] text-xs font-medium hover:text-[#FF2D05] transition-colors"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            End Night
          </button>
        </div>
      </div>
    </div>
  );
}
