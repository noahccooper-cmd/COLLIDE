import { useRef, useState } from 'react';
import { X, MapPin, Clock, Phone, Globe, Star, Send, MessageCircle } from 'lucide-react';
import { formatCount, getCapacityPercent, getCapacityColor, formatTime, timeAgo } from '../../lib/utils';
import { useVenueComments } from '../../hooks/useVenueComments';
import type { Venue, Headcount } from '../../lib/types';

interface VenueSheetProps {
  venue: Venue;
  checkinCount: number;
  headcount: Headcount | null;
  userCheckinVenueId: string | null;
  isLoggedIn: boolean;
  userId: string | null;
  username: string | null;
  onCheckIn: () => void;
  onClose: () => void;
  onLoginRequired: () => void;
}

function VenuePhoto({ venue }: { venue: Venue }) {
  if (venue.image_url) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden mb-4">
        <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;

  return (
    <div
      className="w-full aspect-video rounded-xl flex flex-col items-center justify-center overflow-hidden mb-4 border border-[#2A2A30]"
      style={{ background: `linear-gradient(135deg, hsl(${hue},35%,12%), hsl(${(hue + 40) % 360},25%,8%))` }}
    >
      <span className="text-5xl font-black text-white/10" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        {venue.name.charAt(0)}
      </span>
      <span className="text-lg font-bold text-white/15 tracking-wider mt-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        {venue.name}
      </span>
    </div>
  );
}

export function VenueSheet({
  venue,
  checkinCount,
  headcount,
  userCheckinVenueId,
  isLoggedIn,
  userId,
  username,
  onCheckIn,
  onClose,
  onLoginRequired,
}: VenueSheetProps) {
  const startY = useRef<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const { comments, sendComment } = useVenueComments(venue.id);

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

  const handleCopyAddress = () => {
    if (venue.address) {
      navigator.clipboard?.writeText(venue.address);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    await sendComment(userId, username ?? 'anonymous', commentText.trim());
    setCommentText('');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80) onClose();
    startY.current = null;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1000] bg-black/50 flex items-end" onClick={onClose}>
        {/* Sheet */}
        <div
          className="venue-sheet w-full bg-[#0A0A0C] rounded-t-[20px] overflow-y-auto"
          style={{
            maxHeight: '85vh',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            WebkitOverflowScrolling: 'touch',
          }}
          onClick={e => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle */}
          <div className="flex justify-center pt-2.5 pb-2">
            <div className="w-9 h-1 rounded-full bg-[#3A3A42]" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-4 p-1.5 rounded-full bg-[#111114] text-[#8A8A95] hover:text-white transition-colors z-10"
          >
            <X size={16} strokeWidth={1.5} />
          </button>

          <div className="px-5 pb-5">
            {/* Photo */}
            <VenuePhoto venue={venue} />

            {/* Name + Rating */}
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
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 text-[#8A8A95] text-sm mb-1 hover:text-white transition-colors text-left"
              >
                <MapPin size={12} strokeWidth={1.5} className="shrink-0" />
                <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.address}</span>
              </button>
            )}

            {/* Vibe */}
            {(venue.description || venue.vibe) && (
              <p className="text-[#8A8A95] text-sm mb-4 italic" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                {venue.description || venue.vibe}
              </p>
            )}

            {/* Live headcount */}
            {isLive && (
              <div className="mb-4 p-4 bg-[#111114] rounded-xl border border-[#2A2A3040]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF2D05] live-dot" />
                    <span className="text-[#FF2D05] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>LIVE</span>
                  </div>
                  <span className="text-white font-bold text-xl" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    {formatCount(liveCount)} inside
                  </span>
                </div>

                {capacityPercent !== null && (
                  <div className="mb-2">
                    <div className="w-full h-2.5 bg-[#2A2A30] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full capacity-bar-fill"
                        style={{ width: `${capacityPercent}%`, backgroundColor: getCapacityColor(capacityPercent) }}
                      />
                    </div>
                    <p className="text-[#55555F] text-xs mt-1 text-right" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                      {capacityPercent}% full
                    </p>
                  </div>
                )}

                {peakCount > 0 && headcount?.updated_at && (
                  <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    Peak: {formatCount(peakCount)} at {formatTime(headcount.updated_at)}
                  </p>
                )}
              </div>
            )}

            {/* Non-live */}
            {!isLive && (
              <div className="mb-4 p-3 bg-[#111114] rounded-xl border border-[#2A2A30]">
                {checkinCount > 0 ? (
                  <>
                    <span className="text-white font-medium text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                      {checkinCount} planning to go
                    </span>
                    <p className="text-[#55555F] text-xs mt-0.5" style={{ fontFamily: 'Satoshi, sans-serif' }}>No live count yet</p>
                  </>
                ) : (
                  <p className="text-[#55555F] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>No live count yet</p>
                )}
              </div>
            )}

            {/* Contact */}
            {(venue.hours || venue.phone || venue.website) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-[#8A8A95] text-sm">
                {venue.hours && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} strokeWidth={1.5} />
                    <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.hours}</span>
                  </div>
                )}
                {venue.phone && (
                  <a href={`tel:${venue.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                    <Phone size={13} strokeWidth={1.5} />
                    <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.phone}</span>
                  </a>
                )}
                {venue.website && (
                  <a href={`https://${venue.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                    <Globe size={13} strokeWidth={1.5} />
                    <span style={{ fontFamily: 'Satoshi, sans-serif' }}>{venue.website}</span>
                  </a>
                )}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleAction}
              disabled={isCheckedInHere}
              className="w-full h-[52px] rounded-xl font-bold text-white text-base transition-all active:scale-[0.98]"
              style={{
                fontFamily: 'Satoshi, sans-serif',
                background: isCheckedInHere ? '#00E676' : 'linear-gradient(135deg, #FF5E1A, #FF2D05)',
                opacity: isCheckedInHere ? 0.9 : 1,
                borderRadius: '12px',
              }}
            >
              {isCheckedInHere
                ? "YOU'RE GOING \u2713"
                : isCheckedInElsewhere
                  ? 'SWITCH HERE'
                  : "\uD83D\uDD25 I'M GOING"}
            </button>

            {/* ═══════ COMMENTS ═══════ */}
            <div className="mt-6 pt-5 border-t border-[#2A2A30]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} strokeWidth={1.5} className="text-[#8A8A95]" />
                  <span className="text-white font-bold text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    TONIGHT&apos;S CHAT
                  </span>
                </div>
                {comments.length > 0 && (
                  <span className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    {comments.length} {'\uD83D\uDCAC'}
                  </span>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2 mb-4">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value.slice(0, 200))}
                  placeholder={`What's happening tonight?`}
                  className="flex-1 h-10 rounded-xl bg-[#111114] border border-[#2A2A30] px-3 text-white text-sm outline-none focus:border-[#FF5E1A] transition-colors placeholder:text-[#55555F]"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                  onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                  maxLength={200}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  className="h-10 px-4 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.97] disabled:opacity-30"
                  style={{ fontFamily: 'Satoshi, sans-serif', background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)' }}
                >
                  <Send size={14} strokeWidth={2} />
                </button>
              </div>

              {/* List */}
              {comments.length === 0 ? (
                <p className="text-[#55555F] text-sm text-center py-4" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  Be the first to say something about {venue.name} tonight
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="bg-[#111114] rounded-xl p-3 border border-[#2A2A30]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#FF5E1A] text-xs font-bold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                          @{c.username}
                        </span>
                        <span className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="text-white text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
