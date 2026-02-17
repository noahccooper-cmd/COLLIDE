import { formatNightDate } from '../../lib/utils';
import { CITIES, type CityKey } from '../../lib/constants';
import { CityToggle } from './CityToggle';

interface HeaderProps {
  city: CityKey;
  onCityChange: (city: CityKey) => void;
  totalCount: number;
}

export function Header({ city, onCityChange, totalCount }: HeaderProps) {
  const config = CITIES[city];
  const nightDate = formatNightDate();
  const showFire = totalCount > 50;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[108px] bg-[#050507] border-b border-[#2A2A30]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 pt-2 pb-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-black text-xl tracking-[0.05em]"
            style={{ fontFamily: 'Satoshi, sans-serif', textShadow: '0 0 20px rgba(255, 94, 26, 0.3)' }}>
            VENYOU
          </h1>
          <CityToggle city={city} onChange={onCityChange} />
        </div>
        <div className="flex items-center gap-1.5 text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {showFire && <span>🔥</span>}
          <span className="font-medium">Tonight</span>
          <span className="text-[#55555F]">&middot;</span>
          <span>{nightDate}</span>
        </div>
        <div className="text-white font-bold text-lg" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {config.goingLabel(totalCount)}
        </div>
      </div>
    </header>
  );
}
