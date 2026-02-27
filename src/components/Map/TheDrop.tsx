import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../lib/utils';

interface VenueUpdate {
  id: string;
  venue_id: string;
  venue_name: string;
  message: string;
  created_at: string;
}

interface TheDropProps {
  venues: { id: string; lat: number; lng: number }[];
  onFlyTo: (lng: number, lat: number) => void;
}

export function TheDrop({ venues, onFlyTo }: TheDropProps) {
  const [updates, setUpdates] = useState<VenueUpdate[]>([]);
  const [open, setOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch active updates + realtime subscription
  useEffect(() => {
    const fetchUpdates = async () => {
      const { data } = await supabase
        .from('venue_updates')
        .select('id, venue_id, venue_name, message, created_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setUpdates(data);
    };
    fetchUpdates();

    const channel = supabase
      .channel(`the-drop-rt-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'venue_updates' },
        (payload) => {
          const row = payload.new as VenueUpdate & { expires_at: string };
          if (new Date(row.expires_at) > new Date()) {
            setUpdates(prev => [row, ...prev].slice(0, 15));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePillClick = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleUpdateClick = useCallback((venueId: string) => {
    const v = venues.find(x => x.id === venueId);
    if (v) {
      onFlyTo(v.lng, v.lat);
    }
    setOpen(false);
  }, [venues, onFlyTo]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  }, []);

  const count = updates.length;
  const hasUpdates = count > 0;

  return (
    <>
      {/* Pill */}
      <div style={{
        position: 'absolute',
        top: '0px',
        left: 0,
        right: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        padding: '6px 0',
        pointerEvents: 'none',
      }}>
        <button
          onClick={handlePillClick}
          className={hasUpdates ? 'drop-pill-glow' : ''}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: hasUpdates ? 'rgba(255, 130, 0, 0.15)' : 'rgba(255,255,255,0.06)',
            border: hasUpdates ? '1px solid rgba(255, 130, 0, 0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: hasUpdates ? '#FF8200' : 'rgba(255,255,255,0.35)',
            fontFamily: 'Satoshi, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {'\uD83D\uDCE3'} {hasUpdates ? `${count} update${count === 1 ? '' : 's'} tonight` : 'No updates tonight'}
        </button>
      </div>

      {/* Feed overlay */}
      {open && (
        <div
          onClick={handleBackdropClick}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            background: 'rgba(5, 5, 7, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            ref={feedRef}
            style={{
              position: 'absolute',
              top: '40px',
              left: '12px',
              right: '12px',
              maxHeight: '60vh',
              overflowY: 'auto',
              borderRadius: '16px',
              background: '#111114',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              padding: '0 4px 4px',
            }}>
              {'\uD83D\uDCE3'} THE DROP
            </div>
            {updates.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '13px',
                padding: '20px 0',
                fontFamily: 'Satoshi, sans-serif',
              }}>
                No updates tonight yet
              </div>
            ) : (
              updates.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleUpdateClick(u.venue_id)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF8200', fontFamily: 'Satoshi, sans-serif' }}>
                      {u.venue_name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Satoshi, sans-serif' }}>
                      {timeAgo(u.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'white', margin: 0, lineHeight: '1.35', fontFamily: 'Satoshi, sans-serif' }}>
                    {u.message}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
