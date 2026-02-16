import { MapPin } from 'lucide-react';
import type { CheckinHistory } from '../../lib/types';

interface HistoryItemProps {
  checkin: CheckinHistory;
}

export function HistoryItem({ checkin }: HistoryItemProps) {
  const date = new Date(checkin.night_of + 'T12:00:00');
  const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const venueName = checkin.venues?.name ?? 'Unknown venue';

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2A2A30] last:border-b-0">
      <div className="flex items-center gap-2.5">
        <MapPin size={14} strokeWidth={1.5} className="text-[#FF5E1A] shrink-0" />
        <span className="text-white text-sm font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {venueName}
        </span>
      </div>
      <span className="text-[#55555F] text-xs shrink-0 ml-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        {formatted}
      </span>
    </div>
  );
}
