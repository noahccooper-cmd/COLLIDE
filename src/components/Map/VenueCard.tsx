import { useRef, useState, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { formatCount, getCapacityPercent, getCapacityColor, timeAgo, getCommentDay } from '../../lib/utils';
import { supabase, envReady } from '../../lib/supabase';
import { useVenueComments } from '../../hooks/useVenueComments';
import type { Venue, Headcount, VenueComment } from '../../lib/types';

interface VenueSidePanelProps {
  venue: Venue;
  headcount: Headcount | null;
  username: string;
  onClose: () => void;
}

/* ── Photo Hero ──────────────────────────── */

function VenuePhoto({ venue }: { venue: Venue }) {
  if (venue.image_url) {
    return (
      <div className="sp-photo-wrap">
        <img src={venue.image_url} className="sp-photo" alt="" />
      </div>
    );
  }
  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;
  return (
    <div className="sp-photo-wrap">
      <div
        className="sp-photo-placeholder"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 40%, 18%) 0%, hsl(${(hue + 60) % 360}, 30%, 10%) 100%)`,
        }}
      >
        <span className="sp-big-initial">{venue.name.charAt(0)}</span>
        <span className="sp-photo-name">{venue.name}</span>
      </div>
    </div>
  );
}

/* ── Live Count Section ─────────────────── */

function LiveCountSection({ headcount, venue }: { headcount: Headcount | null; venue: Venue }) {
  const isLive = headcount?.is_live ?? false;
  const count = headcount?.current_count ?? 0;

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

/* ── Comment Section ──────────────────── */

function CommentSection({ venue, username }: { venue: Venue; username: string }) {
  const { comments, sendComment } = useVenueComments(venue.id);
  const [commentText, setCommentText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [previewComment, setPreviewComment] = useState<VenueComment | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!envReady) return;
    const dayOf = getCommentDay();
    supabase
      .from('venue_comments')
      .select('*', { count: 'exact' })
      .eq('venue_id', venue.id)
      .eq('day_of', dayOf)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, count }) => {
        setPreviewComment((data?.[0] as VenueComment) || null);
        setPreviewCount(count || 0);
      });
  }, [venue.id]);

  useEffect(() => {
    if (comments.length > 0) {
      setPreviewComment(comments[0]);
      setPreviewCount(comments.length);
    }
  }, [comments]);

  const handleSend = useCallback(async () => {
    if (!commentText.trim()) return;
    await sendComment(null, username, commentText.trim());
    setCommentText('');
  }, [commentText, sendComment, username]);

  return (
    <div className="sp-comments-section">
      {/* Preview row */}
      <div className="card-comments" onClick={!expanded ? () => setExpanded(true) : undefined}>
        <div className="card-comments-row">
          <span className="card-comments-label">
            {'\uD83D\uDCAC'} {previewCount > 0 ? `${previewCount} tonight` : 'No comments yet'}
          </span>
          {!expanded && previewCount > 0 && (
            <span className="card-comments-more">See all &#9656;</span>
          )}
        </div>
        {!expanded && previewComment && (
          <div className="card-comments-preview">
            <span className="card-comments-user">@{previewComment.username}: </span>
            {previewComment.body}
          </div>
        )}
      </div>

      {/* Expanded comments */}
      {expanded && (
        <div className="expanded-comments-inline">
          <div className="expanded-input-row">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, 200))}
              placeholder="Say something..."
              className="expanded-input"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!commentText.trim()}
              className="expanded-send"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
          <div className="expanded-list" ref={listRef}>
            {comments.length === 0 ? (
              <p className="expanded-empty">
                Be the first to say something about {venue.name} tonight
              </p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="expanded-comment">
                  <div className="expanded-comment-top">
                    <span className="expanded-comment-user">@{c.username}</span>
                    <span className="expanded-comment-time">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="expanded-comment-body">{c.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Directions helper ──────────────────── */

function getDirectionsUrl(venue: Venue): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}&travelmode=walking`;
}

/* ── Main Side Panel ──────────────────── */

export function VenueSidePanel({
  venue,
  headcount,
  username,
  onClose,
}: VenueSidePanelProps) {
  const [dismissing, setDismissing] = useState(false);

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  useEffect(() => {
    setDismissing(false);
  }, [venue.id]);

  return (
    <div className={`side-panel${dismissing ? ' dismissing' : ''}`}>
      <button className="side-panel-close" onClick={dismiss}>&#10005;</button>

      {/* Photo */}
      <VenuePhoto venue={venue} />

      {/* Content */}
      <div className="side-panel-content">
        <div className="sp-header">
          <h2 className="sp-name">{venue.name}</h2>
          {venue.rating && (
            <div className="sp-rating">
              <span className="sp-stars">{'★'.repeat(Math.round(venue.rating))}</span>
              <span className="sp-rating-num">{venue.rating}</span>
              {venue.review_count && <span className="sp-reviews">({venue.review_count})</span>}
            </div>
          )}
        </div>

        {venue.address && <p className="sp-address">{venue.address}</p>}

        {venue.description && (
          <p className="sp-description">{venue.description}</p>
        )}

        {/* Tonight's Special */}
        {venue.tonight_special && (
          <div className="sp-special">
            <span className="sp-special-badge">{'\uD83C\uDF89'} TONIGHT</span>
            <p className="sp-special-text">{venue.tonight_special}</p>
          </div>
        )}

        {/* Live Count */}
        <LiveCountSection headcount={headcount} venue={venue} />

        {/* Info Grid */}
        <div className="sp-info-grid">
          {venue.hours && (
            <div className="sp-info-item">
              <span className="sp-info-icon">{'\uD83D\uDD50'}</span>
              <span>{venue.hours}</span>
            </div>
          )}
          {venue.phone && (
            <a href={`tel:${venue.phone}`} className="sp-info-item clickable">
              <span className="sp-info-icon">{'\uD83D\uDCDE'}</span>
              <span>{venue.phone}</span>
            </a>
          )}
          {venue.website && (
            <a href={`https://${venue.website}`} target="_blank" rel="noopener noreferrer" className="sp-info-item clickable">
              <span className="sp-info-icon">{'\uD83C\uDF10'}</span>
              <span>{venue.website}</span>
            </a>
          )}
        </div>

        {/* Directions */}
        <a
          href={getDirectionsUrl(venue)}
          target="_blank"
          rel="noopener noreferrer"
          className="sp-directions-btn"
        >
          {'\uD83D\uDCCD'} Get Directions
        </a>

        {/* Comments */}
        <CommentSection venue={venue} username={username} />
      </div>
    </div>
  );
}
