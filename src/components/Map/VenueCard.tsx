import { useRef, useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Send } from 'lucide-react';
import { formatCount, getCapacityPercent, getCapacityColor, timeAgo, getCommentDay } from '../../lib/utils';
import { supabase, envReady } from '../../lib/supabase';
import { useVenueComments } from '../../hooks/useVenueComments';
import type { Venue, Headcount, VenueComment } from '../../lib/types';

interface VenueCardProps {
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

/* ── Thumbnail ─────────────────────────────── */

function VenueThumb({ venue }: { venue: Venue }) {
  if (venue.image_url) {
    return <img src={venue.image_url} className="venue-thumb" alt="" />;
  }
  const hash = venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 47) % 360;
  return (
    <div
      className="venue-thumb venue-thumb-placeholder"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 18%) 0%, hsl(${(hue + 60) % 360}, 30%, 10%) 100%)`,
      }}
    >
      <span className="thumb-initial">{venue.name.charAt(0)}</span>
    </div>
  );
}

/* ── Compact Live Count ────────────────────── */

function LiveCountCompact({ headcount, venue }: { headcount: Headcount | null; venue: Venue }) {
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
        {peak > 0 && <span className="live-peak">Peak: {formatCount(peak)}</span>}
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

/* ── Comment Preview ───────────────────────── */

function CommentPreview({ venue, onExpand }: { venue: Venue; onExpand: () => void }) {
  const [latestComment, setLatestComment] = useState<VenueComment | null>(null);
  const [commentCount, setCommentCount] = useState(0);

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
        setLatestComment((data?.[0] as VenueComment) || null);
        setCommentCount(count || 0);
      });
  }, [venue.id]);

  return (
    <div className="card-comments" onClick={onExpand}>
      <div className="card-comments-row">
        <span className="card-comments-label">
          {commentCount > 0 ? `${commentCount} comments tonight` : 'No comments yet'}
        </span>
        {commentCount > 0 && <span className="card-comments-more">See all &#9656;</span>}
      </div>
      {latestComment && (
        <div className="card-comments-preview">
          <span className="card-comments-user">@{latestComment.username}: </span>
          {latestComment.body}
        </div>
      )}
    </div>
  );
}

/* ── Expanded Comments View ────────────────── */

function ExpandedComments({
  venue,
  userId,
  username,
  isLoggedIn,
  onBack,
  onLoginRequired,
}: {
  venue: Venue;
  userId: string | null;
  username: string | null;
  isLoggedIn: boolean;
  onBack: () => void;
  onLoginRequired: () => void;
}) {
  const [commentText, setCommentText] = useState('');
  const { comments, sendComment } = useVenueComments(venue.id);

  const handleSend = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    await sendComment(userId, username ?? 'anonymous', commentText.trim());
    setCommentText('');
  };

  return (
    <div className="expanded-comments">
      <button onClick={onBack} className="expanded-back">
        <ArrowLeft size={16} strokeWidth={2} />
        <span>Back</span>
      </button>

      <div className="expanded-header">
        <span className="expanded-title">TONIGHT'S CHAT</span>
        <span className="expanded-count">{comments.length}</span>
      </div>

      <div className="expanded-input-row">
        <input
          value={commentText}
          onChange={e => setCommentText(e.target.value.slice(0, 200))}
          placeholder="What's happening tonight?"
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

      <div className="expanded-list">
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
  );
}

/* ── Main VenueCard ────────────────────────── */

export function VenueCard({
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
}: VenueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const isCheckedInHere = userCheckinVenueId === venue.id;
  const isCheckedInElsewhere = userCheckinVenueId !== null && userCheckinVenueId !== venue.id;

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  const handleAction = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    if (!isCheckedInHere) {
      onCheckIn();
    }
  };

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

        {expanded ? (
          <ExpandedComments
            venue={venue}
            userId={userId}
            username={username}
            isLoggedIn={isLoggedIn}
            onBack={() => setExpanded(false)}
            onLoginRequired={onLoginRequired}
          />
        ) : (
          <div className="card-body">
            {/* Top row: thumbnail + info */}
            <div className="card-top-row">
              <VenueThumb venue={venue} />
              <div className="card-info">
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
                <div className="card-meta">
                  {venue.hours && <span>{venue.hours}</span>}
                  {venue.phone && <a href={`tel:${venue.phone}`}>{venue.phone}</a>}
                </div>
              </div>
            </div>

            {/* Live count section */}
            <LiveCountCompact headcount={headcount} venue={venue} />

            {/* I'M GOING button */}
            <button
              onClick={handleAction}
              disabled={isCheckedInHere}
              className={`card-go-btn${isCheckedInHere ? ' checked' : ''}`}
              style={!isCheckedInHere ? {} : { opacity: 0.9 }}
            >
              {isCheckedInHere
                ? "YOU'RE GOING \u2713"
                : isCheckedInElsewhere
                  ? 'SWITCH HERE'
                  : "\uD83D\uDD25 I'M GOING"}
            </button>

            {/* Comment preview */}
            <CommentPreview venue={venue} onExpand={() => setExpanded(true)} />
          </div>
        )}
      </div>
    </div>
  );
}
