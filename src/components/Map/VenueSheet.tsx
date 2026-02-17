import { X, Camera, MapPin, Tag, Clock } from 'lucide-react';
import { formatCount, getCapacityPercent, getCapacityColor, formatTime } from '../../lib/utils';
import type { Venue, Headcount } from '../../lib/types';

interface VenueSheetProps {
  venue: Venue;
  checkinCount: number;
  headcount: Headcount | null;
  userCheckinVenueId: string | null;
  isLoggedIn: boolean;
  onCheckIn: () => void;
  onClose: () => void;
  onLoginRequired: () => void;
}

export function VenueSheet({
  venue,
  checkinCount,
  headcount,
  userCheckinVenueId,
  isLoggedIn,
  onCheckIn,
  onClose,
  onLoginRequired,
}: VenueSheetProps) {
  const isCheckedInHere = userCheckinVenueId === venue.id;
  const isCheckedInElsewhere = userCheckinVenueId !== null && userCheckinVenueId !== venue.id;

  const isLive = headcount?.is_live ?? false;
  const liveCount = headcount?.current_count ?? 0;
  const peakCount = headcount?.peak_count ?? 0;
  const displayCount = isLive ? liveCount : checkinCount;
  const showFire = displayCount > 100;
  const capacityPercent = isLive ? getCapacityPercent(liveCount, venue.capacity) : null;

  const handleAction = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    if (!isCheckedInHere) {
      onCheckIn();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="venue-sheet fixed bottom-0 left-0 right-0 z-[70] bg-[#1A1A1F] rounded-t-2xl"
        style={{
          maxHeight: '55vh',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          boxShadow: '0 -4px 24px rgba(255, 94, 26, 0.08)',
        }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#2A2A30]" />
        </div>

        <div className="px-5 pb-5 overflow-y-auto">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-xl truncate" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {venue.name}
              </h2>
              {venue.address && (
                <div className="flex items-center gap-1 mt-1 text-[#8A8A95] text-sm">
                  <MapPin size={12} strokeWidth={1.5} />
                  <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.address}</span>
                </div>
              )}
              {venue.vibe && (
                <p className="text-[#8A8A95] text-sm mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {venue.vibe}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-3 shrink-0">
              <span className="text-white font-bold text-2xl" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {formatCount(displayCount)}
              </span>
              {showFire && <span className="text-lg">🔥</span>}
            </div>
          </div>

          {/* Live headcount card */}
          {isLive && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#00B4FF33]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF2D05] live-dot" />
                  <span className="text-[#00B4FF] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>LIVE</span>
                </div>
                <span className="text-white font-bold text-lg" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {formatCount(liveCount)} inside
                </span>
              </div>

              {/* Capacity bar */}
              {capacityPercent !== null && (
                <div className="mb-2">
                  <div className="w-full h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full capacity-bar-fill"
                      style={{
                        width: `${capacityPercent}%`,
                        backgroundColor: getCapacityColor(capacityPercent),
                      }}
                    />
                  </div>
                  <p className="text-[#55555F] text-xs mt-1 text-right" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    {capacityPercent}% full
                  </p>
                </div>
              )}

              {/* Peak */}
              {peakCount > 0 && headcount?.updated_at && (
                <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  Peak tonight: {formatCount(peakCount)} at {formatTime(headcount.updated_at)}
                </p>
              )}
            </div>
          )}

          {/* Non-live fallback */}
          {!isLive && checkinCount > 0 && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#2A2A30]">
              <span className="text-white font-medium text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {checkinCount} planning to go
              </span>
              <p className="text-[#55555F] text-xs mt-0.5" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                No live count yet
              </p>
            </div>
          )}

          {/* Info pills */}
          {(venue.cover_price || venue.deals) && (
            <div className="flex gap-2 mb-4">
              {venue.cover_price && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#111114] rounded-lg border border-[#2A2A30]">
                  <Tag size={14} strokeWidth={1.5} className="text-[#8A8A95]" />
                  <div>
                    <div className="text-[#8A8A95] text-[10px] font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>Cover</div>
                    <div className="text-white text-sm font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.cover_price}</div>
                  </div>
                </div>
              )}
              {venue.deals && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#111114] rounded-lg border border-[#2A2A30]">
                  <Clock size={14} strokeWidth={1.5} className="text-[#8A8A95]" />
                  <div>
                    <div className="text-[#8A8A95] text-[10px] font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>Deals</div>
                    <div className="text-white text-sm font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.deals}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live cam teaser */}
          {venue.cam_coming_soon && !venue.has_live_cam && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#00B4FF33] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00B4FF08] to-transparent" />
              <div className="relative flex items-center gap-2.5">
                <Camera size={18} strokeWidth={1.5} className="text-[#00B4FF] shrink-0" />
                <div>
                  <div className="text-white text-sm font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    LIVE CAM COMING SOON
                  </div>
                  <div className="text-[#8A8A95] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    Be the first to watch
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleAction}
            disabled={isCheckedInHere}
            className="w-full h-[52px] rounded-xl font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{
              fontFamily: 'Satoshi, sans-serif',
              background: isCheckedInHere
                ? '#00E676'
                : 'linear-gradient(135deg, #FF5E1A, #FF2D05)',
              opacity: isCheckedInHere ? 0.9 : 1,
            }}
          >
            {isCheckedInHere
              ? "YOU'RE GOING \u2713"
              : isCheckedInElsewhere
                ? 'SWITCH HERE'
                : "I'M GOING"}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-4 p-1.5 rounded-full bg-[#111114] text-[#8A8A95] hover:text-white transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </>
  );
}
