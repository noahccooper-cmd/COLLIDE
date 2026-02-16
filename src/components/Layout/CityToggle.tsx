import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CITIES, type CityKey } from '../../lib/constants';

interface CityToggleProps {
  city: CityKey;
  onChange: (city: CityKey) => void;
}

export function CityToggle({ city, onChange }: CityToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const config = CITIES[city];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111114] border border-[#2A2A30] text-white text-sm font-medium"
        style={{ fontFamily: 'Satoshi, sans-serif' }}
      >
        {config.name}
        <ChevronDown size={14} strokeWidth={1.5} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1A1A1F] border border-[#2A2A30] rounded-lg overflow-hidden shadow-lg min-w-[140px] z-50">
          {(Object.keys(CITIES) as CityKey[]).map((key) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                key === city
                  ? 'text-[#FF5E1A] bg-[#FF5E1A0D]'
                  : 'text-white hover:bg-[#111114]'
              }`}
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              {CITIES[key].name}, {CITIES[key].state}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
