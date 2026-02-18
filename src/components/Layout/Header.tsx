import { User } from 'lucide-react';
import { formatNightDate } from '../../lib/utils';
import { CITIES, type CityKey } from '../../lib/constants';
import { CityToggle } from './CityToggle';

interface HeaderProps {
  city: CityKey;
  onCityChange: (city: CityKey) => void;
  totalCount: number;
  onProfileTap: () => void;
}

export function Header({ city, onCityChange, totalCount, onProfileTap }: HeaderProps) {
  const config = CITIES[city];
  const nightDate = formatNightDate();
  const showFire = totalCount > 50;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#050507] border-b border-[#2A2A30]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 pt-2 pb-3 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-black text-xl tracking-[0.05em]"
            style={{ fontFamily: 'Satoshi, sans-serif', textShadow: '0 0 20px rgba(255, 94, 26, 0.3)' }}>
            ven<span className="text-[#FF5E1A]" style={{ fontSize: '24px' }}>U</span>e
          </h1>
          <div className="flex items-center gap-2">
            <CityToggle city={city} onChange={onCityChange} />
            <button
              onClick={onProfileTap}
              className="w-9 h-9 rounded-full bg-[#111114] border border-[#2A2A30] flex items-center justify-center text-[#8A8A95] hover:text-white transition-colors"
            >
              <User size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          <span className="font-medium">Tonight</span>
          <span className="text-[#55555F]">&middot;</span>
          <span>{nightDate}</span>
        </div>
        <div className="text-white font-bold text-lg" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {showFire && <span className="mr-1">{'\uD83D\uDD25'}</span>}
          {config.countLabel(totalCount)}
        </div>
      </div>
    </header>
  );
}
