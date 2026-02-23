import { formatNightDate, getInitials } from '../../lib/utils';
import type { CityKey } from '../../lib/constants';
import { CityToggle } from './CityToggle';

interface HeaderProps {
  city: CityKey;
  onCityChange: (city: CityKey) => void;
  totalCount: number;
  username: string;
}

export function Header({ city, onCityChange, username }: HeaderProps) {
  const nightDate = formatNightDate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#050507] border-b border-[#2A2A30]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 pt-2 pb-3 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-black text-xl tracking-[0.05em]"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            venuu
          </h1>
          <div className="flex items-center gap-2">
            <CityToggle city={city} onChange={onCityChange} />
            <div
              className="w-9 h-9 rounded-full bg-[#111114] border border-[#2A2A30] flex items-center justify-center text-[#FF5E1A] text-xs font-bold"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              {getInitials(username)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          <span className="font-medium">Tonight</span>
          <span className="text-[#55555F]">&middot;</span>
          <span>{nightDate}</span>
        </div>
        <div className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          See who's going out tonight
        </div>
      </div>
    </header>
  );
}
