import { useRef, useState, useEffect, useCallback } from 'react';
import { formatCount, getCapacityPercent, getCapacityColor, formatTime } from '../../lib/utils';
import { useVenueRecaps } from '../../hooks/useVenueRecaps';
import type { Venue, Headcount } from '../../lib/types';

type SheetState = 'hidden' | 'peeked' | 'expanded';

interface VenueSheetProps {
  venue: Venue;
  headcount: Headcount | null;
  username: string;
  onClose: () => void;
}

/* ── Bar Photo with LIVE Badge ───────── */

function BarPhoto({ venue, isLive }: { venue: Venue; isLive: boolean }) {
  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;

  return (
    <div className="bar-photo-wrap">
      {venue.image_url ? (
        <img src={venue.image_url} className="bar-photo" alt={venue.name} />
      ) : (
        <div
          className="bar-photo-placeholder"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 40%, 18%) 0%, hsl(${(hue + 60) % 360}, 30%, 10%) 100%)`,
          }}
        >
          <span className="bar-photo-initial">{venue.name.charAt(0)}</span>
          <span className="bar-photo-name">{venue.name}</span>
        </div>
      )}
      {isLive && (
        <div className="photo-live-badge">
          <span className="live-dot" /> LIVE
        </div>
      )}
    </div>
  );
}

/* ── Live Count Section ──────────────── */

function LiveCountSection({ headcount, venue }: { headcount: Headcount | null; venue: Venue }) {
  const isLive = headcount?.is_live ?? false;
  const count = headcount?.current_count ?? 0;
  const peak = headcount?.peak_count ?? 0;

  if (!isLive) {
    return (
      <div className="live-compact empty">
        <span className="live-no-data">No live count yet</span>
      </div>
    );
  }

  const pct = getCapacityPercent(count, venue.capacity);

  return (
    <div className="live-compact active">
      <div className="live-row">
        <span className="live-badge-sm">
          <span className="live-blink" /> LIVE
        </span>
        <span className="live-count-num">{formatCount(count)}</span>
        <span className="live-count-label">inside</span>
        {peak > 0 && (
          <span className="live-peak-label">Peak: {formatCount(peak)}</span>
        )}
      </div>
      {pct !== null && (
        <div className="live-bar-row">
          <div className="live-bar">
            <div className="live-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getCapacityColor(pct)}, #FF2D05)` }} />
          </div>
          <span className="live-bar-pct">{pct}%</span>
        </div>
      )}
    </div>
  );
}

/* ── Action Buttons: Uber, Call, Recap ── */

function ActionButtons({ venue, onOpenRecap }: { venue: Venue; onOpenRecap: () => void }) {
  const uberDeepLink = `uber://?action=setPickup&dropoff[latitude]=${venue.lat}&dropoff[longitude]=${venue.lng}&dropoff[nickname]=${encodeURIComponent(venue.name)}`;
  const uberWebFallback = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${venue.lat}&dropoff[longitude]=${venue.lng}&dropoff[nickname]=${encodeURIComponent(venue.name)}`;

  const handleUber = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = uberDeepLink;
    setTimeout(() => {
      window.location.href = uberWebFallback;
    }, 500);
  };

  return (
    <div className="action-row">
      <a href={uberDeepLink} onClick={handleUber} className="action-btn">
        <span className="action-icon">{'\uD83D\uDE97'}</span>
        <span className="action-label">Uber</span>
      </a>
      {venue.phone ? (
        <a href={`tel:${venue.phone}`} className="action-btn">
          <span className="action-icon">{'\uD83D\uDCDE'}</span>
          <span className="action-label">Call</span>
        </a>
      ) : (
        <div className="action-btn disabled">
          <span className="action-icon">{'\uD83D\uDCDE'}</span>
          <span className="action-label">Call</span>
        </div>
      )}
      <button onClick={onOpenRecap} className="action-btn">
        <span className="action-icon">{'\u2B50'}</span>
        <span className="action-label">Recap</span>
      </button>
    </div>
  );
}

/* ── Specials Row (scrollable chips) ──── */

function SpecialsRow({ venue }: { venue: Venue }) {
  if (!venue.tonight_special) return null;
  const specials = venue.tonight_special.split('|').map(s => s.trim()).filter(Boolean);
  if (specials.length === 0) return null;

  return (
    <div className="specials-section">
      <div className="specials-label">{'\uD83C\uDF89'} TONIGHT</div>
      <div className="specials-scroll">
        {specials.map((special, i) => (
          <div key={i} className="special-chip">{special}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Directions helper ──────────────── */

function getDirectionsUrl(venue: Venue): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}&travelmode=walking`;
}

/* ── Recap Card ──────────────────────── */

function RecapCard({ recap, index }: { recap: any; index: number }) {
  return (
    <div className="recap-card" style={{ zIndex: 100 - index }}>
      <div className="recap-header">
        <span className="recap-user">{'\uD83D\uDC64'} @{recap.username}</span>
        <div className="recap-stars">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`star ${s <= recap.stars ? 'filled' : 'empty'}`}>{'\u2605'}</span>
          ))}
        </div>
      </div>
      <p className="recap-body">{recap.body}</p>
      <span className="recap-time">{formatTime(recap.created_at)}</span>
    </div>
  );
}

/* ── Leave a Recap ───────────────────── */

function LeaveRecap({ venue, username, submitRecap }: { venue: Venue; username: string; submitRecap: (u: string, b: string, s: number) => Promise<void> }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');

  const submit = useCallback(async () => {
    if (stars === 0 || !text.trim()) return;
    await submitRecap(username, text.trim(), stars);
    setStars(0);
    setText('');
  }, [stars, text, username, submitRecap]);

  return (
    <div className="leave-recap">
      <div className="recap-input-label">{'\u2B50'} Leave your recap</div>
      <div className="star-selector">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            className={`star-btn ${s <= stars ? 'active' : ''}`}
            onClick={() => setStars(s)}
          >
            {'\u2605'}
          </button>
        ))}
      </div>
      <div className="recap-input-row">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="How was tonight?"
          maxLength={200}
          className="recap-input"
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} className="recap-submit" disabled={stars === 0 || !text.trim()}>
          Post
        </button>
      </div>
    </div>
  );
}

/* ── Recap Section ───────────────────── */

function RecapSection({ venue, username }: { venue: Venue; username: string }) {
  const { recaps, submitRecap } = useVenueRecaps(venue.id);

  return (
    <div className="recap-section">
      <div className="recap-header-row">
        <span className="recap-title">{'\u2B50'} THE RECAP</span>
        <span className="recap-count">{recaps.length > 0 ? `${recaps.length} \u2B50` : ''}</span>
      </div>
      <div className="recap-list">
        {recaps.length === 0 ? (
          <p className="recap-empty">No recaps yet tonight. Be the first!</p>
        ) : (
          recaps.map((r, i) => <RecapCard key={r.id} recap={r} index={i} />)
        )}
      </div>
      <LeaveRecap venue={venue} username={username} submitRecap={submitRecap} />
    </div>
  );
}

/* ── Main VenueSheet (Pull-Up Bottom Sheet) ── */

export function VenueSheet({
  venue,
  headcount,
  username,
  onClose,
}: VenueSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('peeked');
  const sheetRef = useRef<HTMLDivElement>(null);
  const recapRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isLive = headcount?.is_live ?? false;

  // Reset state when venue changes
  useEffect(() => {
    setSheetState('peeked');
    if (sheetRef.current) sheetRef.current.scrollTop = 0;
  }, [venue.id]);

  const dismiss = useCallback(() => {
    setSheetState('hidden');
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleOpenRecap = useCallback(() => {
    setSheetState('expanded');
    setTimeout(() => {
      recapRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  }, []);

  // Swipe gesture handling
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = startY.current - e.changedTouches[0].clientY;

    if (sheetState === 'peeked') {
      if (diff > 50) setSheetState('expanded');
      else if (diff < -50) dismiss();
    } else if (sheetState === 'expanded') {
      // Only collapse if scrolled to top
      if (diff < -50 && (sheetRef.current?.scrollTop ?? 0) < 5) {
        setSheetState('peeked');
      }
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`venue-sheet ${sheetState}`}
      onClick={e => e.stopPropagation()}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <div className="sheet-handle" />

      {/* Close button (expanded only via CSS) */}
      <button className="sheet-close-btn" onClick={dismiss}>{'\u2715'}</button>

      {/* Photo */}
      <BarPhoto venue={venue} isLive={isLive} />

      {/* Info */}
      <div className="sheet-info">
        <div className="sheet-name-row">
          <h2 className="sheet-name">{venue.name}</h2>
          {venue.rating && (
            <span className="sheet-rating">
              {'\u2605'} {venue.rating}
              {venue.review_count ? <span className="sheet-rating-count"> ({venue.review_count})</span> : null}
            </span>
          )}
        </div>
        {venue.address && (
          <a
            href={getDirectionsUrl(venue)}
            target="_blank"
            rel="noopener noreferrer"
            className="venue-address-link"
          >
            {'\uD83D\uDCCD'} {venue.address}
          </a>
        )}
      </div>

      {/* Live Count */}
      <div className="sheet-section">
        <LiveCountSection headcount={headcount} venue={venue} />
      </div>

      {/* Action Buttons */}
      <ActionButtons venue={venue} onOpenRecap={handleOpenRecap} />

      {/* Swipe hint (hidden when expanded via CSS) */}
      <div className="swipe-hint">{'\u2191'} Swipe up for more</div>

      {/* ─── Expanded content below ─── */}

      {/* Description */}
      {venue.description && (
        <p className="sheet-description">{venue.description}</p>
      )}

      {/* Specials */}
      <SpecialsRow venue={venue} />

      {/* Hours / Website */}
      <div className="sheet-meta">
        {venue.hours && (
          <span className="sheet-meta-item">{'\uD83D\uDD50'} {venue.hours}</span>
        )}
        {venue.website && (
          <span className="sheet-meta-item">
            {'\uD83C\uDF10'}{' '}
            <a href={`https://${venue.website}`} target="_blank" rel="noopener noreferrer" className="sheet-meta-link">
              {venue.website}
            </a>
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="sheet-divider" />

      {/* The Recap */}
      <div ref={recapRef}>
        <RecapSection venue={venue} username={username} />
      </div>
    </div>
  );
}
