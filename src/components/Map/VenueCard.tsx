import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { formatCount, getCapacityPercent, getCapacityColor, timeAgo, getCommentDay } from '../../lib/utils';
import { supabase, envReady } from '../../lib/supabase';
import { useVenueComments } from '../../hooks/useVenueComments';
import type { Venue, Headcount, VenueComment } from '../../lib/types';

interface VenueCardProps {
  venue: Venue;
  headcount: Headcount | null;
  username: string;
  onClose: () => void;
}

/* ── Photo Hero ──────────────────────────── */

function VenuePhoto({ venue }: { venue: Venue }) {
  if (venue.image_url) {
    return (
      <div className="card-photo-wrap">
        <img src={venue.image_url} className="card-photo" alt="" />
      </div>
    );
  }
  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;
  return (
    <div className="card-photo-wrap">
      <div
        className="card-photo-placeholder"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 40%, 18%) 0%, hsl(${(hue + 60) % 360}, 30%, 10%) 100%)`,
        }}
      >
        <span className="big-initial">{venue.name.charAt(0)}</span>
        <span className="photo-venue-name">{venue.name}</span>
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

/* ── Comment Section (preview + expanded) ── */

function CommentSection({
  venue,
  username,
  expanded,
  onExpand,
}: {
  venue: Venue;
  username: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const { comments, sendComment } = useVenueComments(venue.id);
  const [commentText, setCommentText] = useState('');
  const [previewComment, setPreviewComment] = useState<VenueComment | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch preview data
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

  // Update preview from realtime comments
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
    <>
      {/* Preview row */}
      <div className="card-comments" onClick={!expanded ? onExpand : undefined}>
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

      {/* Expanded inline comments */}
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
    </>
  );
}

/* ── Main VenueCard (Floating Pill) ──────── */

export function VenueCard({
  venue,
  headcount,
  username,
  onClose,
}: VenueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onClose(), 180);
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 50) {
      if (expanded) {
        setExpanded(false);
      } else {
        dismiss();
      }
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    setExpanded(false);
    setDismissing(false);
  }, [venue.id]);

  return (
    <div className="venue-card-wrap">
      <div
        className={`venue-card${expanded ? ' expanded' : ''}${dismissing ? ' dismissing' : ''}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle + close */}
        <div className="card-handle-row">
          <div className="card-handle" />
          <button className="card-close" onClick={dismiss}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="card-body">
          {/* Photo hero */}
          <VenuePhoto venue={venue} />

          {/* Info section */}
          <div className="card-info-section">
            <div className="card-name-row">
              <h3 className="card-name">{venue.name}</h3>
              {venue.rating && (
                <span className="card-rating">
                  {'\u2605'} {venue.rating}
                  {venue.review_count ? <span className="card-rating-count">({venue.review_count})</span> : null}
                </span>
              )}
            </div>
            {venue.address && <p className="card-address">{venue.address}</p>}
          </div>

          {/* Tonight's Special */}
          {venue.tonight_special && (
            <div className="card-special">
              <div className="special-badge">{'\uD83C\uDF89'} TONIGHT</div>
              <p className="special-text">{venue.tonight_special}</p>
            </div>
          )}

          {/* Live count section */}
          <LiveCountSection headcount={headcount} venue={venue} />

          {/* Comments section (preview + expandable) */}
          <CommentSection
            venue={venue}
            username={username}
            expanded={expanded}
            onExpand={() => setExpanded(true)}
          />
        </div>
      </div>
    </div>
  );
}
