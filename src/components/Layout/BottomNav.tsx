import { MapPin, Radio } from 'lucide-react';

export type Tab = 'tonight' | 'portal';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { key: Tab; label: string; icon: typeof MapPin }[] = [
  { key: 'tonight', label: 'Tonight', icon: MapPin },
  { key: 'portal', label: 'Portal', icon: Radio },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#050507] border-t border-[#2A2A30] flex items-center justify-around"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2"
          >
            <Icon
              size={22}
              strokeWidth={1.5}
              color={isActive ? '#FF5E1A' : '#55555F'}
            />
            <span
              className="text-[11px] font-medium"
              style={{
                fontFamily: 'Satoshi, sans-serif',
                color: isActive ? '#FF5E1A' : '#55555F',
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
