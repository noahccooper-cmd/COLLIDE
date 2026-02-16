import { getBubbleStyle, formatCount } from '../../lib/utils';
import type { Venue } from '../../lib/types';

interface VenueBubbleProps {
  venue: Venue;
  count: number;
  isUserCheckedIn: boolean;
  isPulsed: boolean;
  onClick: () => void;
}

export function VenueBubble({ venue, count, isUserCheckedIn, isPulsed, onClick }: VenueBubbleProps) {
  const style = getBubbleStyle(count);

  return (
    <div
      className="venue-bubble-wrapper"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div
        className={`venue-bubble ${style.pulse ? 'bubble-pulse' : ''} ${isPulsed ? 'count-updated' : ''}`}
        style={{
          width: style.size,
          height: style.size,
          backgroundColor: isUserCheckedIn ? '#00E676' : style.color,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isUserCheckedIn ? '0 0 14px rgba(0, 230, 118, 0.4)' : style.glow,
          '--pulse-speed': style.pulseSpeed,
          transform: 'translate(-50%, -50%)',
          position: 'relative',
          border: isUserCheckedIn ? '2px solid rgba(0, 230, 118, 0.6)' : '2px solid rgba(255,255,255,0.1)',
        } as React.CSSProperties}
      >
        <span
          className="text-white font-bold leading-none"
          style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: style.size >= 56 ? '20px' : style.size >= 44 ? '16px' : '14px',
          }}
        >
          {formatCount(count)}
        </span>
      </div>
      <div
        className="text-center mt-1 whitespace-nowrap"
        style={{
          fontFamily: 'Satoshi, sans-serif',
          fontSize: '11px',
          fontWeight: 500,
          color: '#FFFFFF',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          transform: 'translateX(-50%)',
          position: 'relative',
          left: '50%',
        }}
      >
        {venue.name}
      </div>
    </div>
  );
}
