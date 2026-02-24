import { useRef, useState, useEffect, useCallback } from 'react';
import { formatCount, getCapacityPercent, timeAgo } from '../../lib/utils';
import { useVenueRecaps } from '../../hooks/useVenueRecaps';
import type { Venue, Headcount } from '../../lib/types';

type SheetState = 'hidden' | 'peeked' | 'expanded';

interface VenueSheetProps {
  venue: Venue;
  headcount: Headcount | null;
  username: string;
  onClose: () => void;
}

/* ── Photo Placeholder (gradient, NOT brown rectangle) ── */

function PhotoPlaceholder({ venue }: { venue: Venue }) {
  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;

  return (
    <div
      className="photo-placeholder"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 35%, 15%) 0%, hsl(${(hue + 60) % 360}, 25%, 8%) 100%)`,
      }}
    >
      <span className="placeholder-name">{venue.name}</span>
    </div>
  );
}

/* ── Uber deep link ── */

function getUberUrl(venue: Venue): string {
  const params = new URLSearchParams({
    action: 'setPickup',
    'dropoff[latitude]': String(venue.lat),
    'dropoff[longitude]': String(venue.lng),
    'dropoff[nickname]': venue.name,
  });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) return `uber://?${params.toString()}`;
  return `https://m.uber.com/ul/?${params.toString()}`;
}

/* ── Directions helper ── */

function getDirectionsUrl(venue: Venue): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) return `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;
  return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}&travelmode=walking`;
}

/* ── Tonight Banner (peek-visible, below venue name) ── */

function TonightBanner({ venue }: { venue: Venue }) {
  if (!venue.tonight_special) return null;
  const specials = venue.tonight_special.split('|').map(s => s.trim()).filter(Boolean);
  if (specials.length === 0) return null;

  return (
    <div className="tonight-banner">
      <div className="tonight-banner-scroll">
        {specials.map((special, i) => (
          <span key={i} className="tonight-pill">{'\uD83C\uDF89'} {special}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Specials Row (scrollable chips) ── */

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

/* ── Recap Card ── */

function RecapCard({ recap, index }: { recap: any; index: number }) {
  return (
    <div className="recap-card" style={{ zIndex: 100 - index }}>
      <div className="recap-header">
        <span className="recap-user">@{recap.username}</span>
        <div className="recap-stars">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`star ${s <= recap.stars ? 'filled' : 'empty'}`}>{'\u2605'}</span>
          ))}
        </div>
      </div>
      <p className="recap-body">{recap.body}</p>
      <span className="recap-time">{timeAgo(recap.created_at)}</span>
    </div>
  );
}

/* ── Leave a Recap ── */

function LeaveRecap({ username, submitRecap }: { venue: Venue; username: string; submitRecap: (u: string, b: string, s: number) => Promise<void> }) {
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
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="How was tonight?"
        maxLength={200}
        className="recap-input recap-input-full"
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <button onClick={submit} className="recap-submit-full" disabled={stars === 0 || !text.trim()}>
        POST RECAP
      </button>
    </div>
  );
}

/* ── Recap Section ── */

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
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDragging = useRef(false);
  const isLive = headcount?.is_live ?? false;
  const count = headcount?.current_count ?? 0;
  const peak = headcount?.peak_count ?? 0;
  const pct = getCapacityPercent(count, venue.capacity);

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

  const handleUber = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const deepLink = getUberUrl(venue);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = deepLink;
      setTimeout(() => {
        window.location.href = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${venue.lat}&dropoff[longitude]=${venue.lng}&dropoff[nickname]=${encodeURIComponent(venue.name)}`;
      }, 500);
    } else {
      window.open(deepLink, '_blank');
    }
  }, [venue]);

  /* ── Swipe / drag gesture handling ── */

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = startYRef.current - currentYRef.current; // positive = swipe up

    // Reset any drag transform
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }

    if (diff > 60) {
      // SWIPED UP
      if (sheetState === 'peeked') setSheetState('expanded');
    } else if (diff < -60) {
      // SWIPED DOWN
      if (sheetState === 'expanded' && (sheetRef.current?.scrollTop ?? 0) < 5) {
        setSheetState('peeked');
      } else if (sheetState === 'peeked') {
        dismiss();
      }
    }
  }, [sheetState, dismiss]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentYRef.current = e.touches[0].clientY;

    // Visual drag feedback in peek mode
    const diff = currentYRef.current - startYRef.current;
    if (sheetRef.current && sheetState === 'peeked' && diff < 0) {
      const offset = Math.max(diff, -40);
      sheetRef.current.style.transform = `translateY(${offset}px)`;
    }
  }, [sheetState]);

  const handleTouchEnd = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    isDragging.current = true;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    currentYRef.current = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  // Handle toggle
  const handleHandleTap = useCallback(() => {
    if (sheetState === 'peeked') setSheetState('expanded');
    else if (sheetState === 'expanded') setSheetState('peeked');
  }, [sheetState]);

  return (
    <div
      ref={sheetRef}
      className={`venue-sheet ${sheetState}`}
      onClick={e => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Handle area — tappable to expand/collapse */}
      <div className="sheet-handle-area" onClick={handleHandleTap}>
        <div className="sheet-handle" />
        {sheetState === 'peeked' && (
          <div className="swipe-hint">Tap or swipe up for more</div>
        )}
      </div>

      {/* Close button (expanded only via CSS) */}
      <button className="sheet-close-btn" onClick={dismiss}>{'\u2715'}</button>

      {/* ═══ BANNER IMAGE (full-width, above peek content) ═══ */}
      {venue.image_url && (
        <div className="sheet-banner-wrap">
          <img src={venue.image_url} className="sheet-banner-img" alt={venue.name} />
          <div className="sheet-banner-gradient" />
          {isLive && (
            <div className="sheet-live-badge">
              <span className="ld" /> LIVE
            </div>
          )}
        </div>
      )}

      {/* ═══ PEEK CONTENT (always visible) ═══ */}
      <div className="sheet-peek-content">
        {/* Name + Rating */}
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
              className="sheet-address"
            >
              {'\uD83D\uDCCD'} {venue.address}
            </a>
          )}
        </div>

        {/* Cover Charge Banner (visible in peek) */}
        {venue.cover_charge && (
          <div className="cover-banner">
            <span className="cover-pill">
              {'\uD83D\uDCB5'} {venue.cover_charge.toUpperCase() === 'FREE' || venue.cover_charge.toUpperCase() === 'NO COVER' ? 'FREE ENTRY' : `COVER: ${venue.cover_charge}`}
            </span>
          </div>
        )}

        {/* Tonight's Specials Banner (visible in peek) */}
        <TonightBanner venue={venue} />

        {/* Live Count */}
        {isLive ? (
          <div className="sheet-live-section">
            <div className="sheet-live-row">
              <span className="sheet-live-pill"><span className="ld" /> LIVE</span>
              <span className="sheet-live-count">{formatCount(count)}</span>
              <span className="sheet-live-label">inside</span>
              {peak > 0 && (
                <span className="sheet-live-peak">Peak: {formatCount(peak)}</span>
              )}
            </div>
            {pct !== null && (
              <div className="sheet-bar-row">
                <div className="sheet-bar">
                  <div
                    className="sheet-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="sheet-bar-pct">{pct}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="sheet-live-section empty">
            <span className="sheet-no-data">No live count yet</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="sheet-actions">
          <a href={getUberUrl(venue)} onClick={handleUber} className="sheet-action-btn">
            <span className="sa-icon">{'\uD83D\uDE97'}</span>
            <span className="sa-label">Uber</span>
          </a>
          {venue.phone ? (
            <a href={`tel:${venue.phone}`} className="sheet-action-btn">
              <span className="sa-icon">{'\uD83D\uDCDE'}</span>
              <span className="sa-label">Call</span>
            </a>
          ) : (
            <div className="sheet-action-btn disabled">
              <span className="sa-icon">{'\uD83D\uDCDE'}</span>
              <span className="sa-label">Call</span>
            </div>
          )}
          <button onClick={handleOpenRecap} className="sheet-action-btn">
            <span className="sa-icon">{'\u2B50'}</span>
            <span className="sa-label">Recap</span>
          </button>
        </div>
      </div>

      {/* ═══ EXPANDED CONTENT (hidden when peeked via CSS) ═══ */}
      <div className="sheet-expanded-content">
        {/* Specials */}
        <SpecialsRow venue={venue} />

        {/* Description */}
        {venue.description && (
          <p className="sheet-description">{venue.description}</p>
        )}

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
    </div>
  );
}
