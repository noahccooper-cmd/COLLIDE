import { X, Camera, MapPin, Clock, Phone, Globe, Instagram, Star } from 'lucide-react';
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
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="venue-sheet fixed bottom-0 left-0 right-0 z-[70] bg-[#1A1A1F] rounded-t-2xl"
        style={{
          maxHeight: '75vh',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)',
        }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#2A2A30]" />
        </div>

        <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 40px)' }}>
          {/* Photo placeholder */}
          {venue.image_url ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4">
              <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#1A1A1F] to-[#111114] border border-[#2A2A30] flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white/20" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {venue.name}
              </span>
            </div>
          )}

          {/* Name + Rating row */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-white font-bold text-xl flex-1 min-w-0 truncate" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {venue.name}
            </h2>
            {venue.rating && (
              <div className="flex items-center gap-1 ml-3 shrink-0">
                <Star size={14} strokeWidth={1.5} className="text-[#FFAA00] fill-[#FFAA00]" />
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  {venue.rating}
                </span>
                {venue.review_count && (
                  <span className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    ({venue.review_count})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Address */}
          {venue.address && (
            <div className="flex items-center gap-1 text-[#8A8A95] text-sm mb-1">
              <MapPin size={12} strokeWidth={1.5} className="shrink-0" />
              <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.address}</span>
            </div>
          )}

          {/* Vibe */}
          {venue.vibe && (
            <p className="text-[#8A8A95] text-sm mb-4" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {venue.vibe}
            </p>
          )}

          {/* Live headcount card */}
          {isLive && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#00B4FF33]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF2D05] live-dot" />
                  <span className="text-[#FF2D05] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>LIVE</span>
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
          {!isLive && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#2A2A30]">
              {checkinCount > 0 ? (
                <>
                  <span className="text-white font-medium text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    {checkinCount} planning to go
                  </span>
                  <p className="text-[#55555F] text-xs mt-0.5" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    No live count yet
                  </p>
                </>
              ) : (
                <p className="text-[#55555F] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  No live count yet
                </p>
              )}
            </div>
          )}

          {/* Info row: hours, phone, website, instagram */}
          {(venue.hours || venue.phone || venue.website || venue.instagram) && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[#8A8A95]">
              {venue.hours && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock size={13} strokeWidth={1.5} className="shrink-0" />
                  <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.hours}</span>
                </div>
              )}
              {venue.phone && (
                <a href={`tel:${venue.phone}`} className="flex items-center gap-1.5 text-sm hover:text-white transition-colors">
                  <Phone size={13} strokeWidth={1.5} className="shrink-0" />
                  <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.phone}</span>
                </a>
              )}
              {venue.website && (
                <a href={`https://${venue.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm hover:text-white transition-colors">
                  <Globe size={13} strokeWidth={1.5} className="shrink-0" />
                  <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.website}</span>
                </a>
              )}
              {venue.instagram && (
                <a href={`https://instagram.com/${venue.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm hover:text-white transition-colors">
                  <Instagram size={13} strokeWidth={1.5} className="shrink-0" />
                  <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.instagram}</span>
                </a>
              )}
            </div>
          )}

          {/* Live cam teaser */}
          {venue.cam_coming_soon && !venue.has_live_cam && (
            <div className="mb-4 p-3 bg-[#111114] rounded-xl border-l-2 border-[#00B4FF] relative overflow-hidden">
              <div className="flex items-center gap-2.5">
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
                : "\uD83D\uDD25 I'M GOING"}
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
