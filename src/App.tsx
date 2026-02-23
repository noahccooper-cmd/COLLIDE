import { useState, useMemo } from 'react';
import { envReady } from './lib/supabase';
import { useCity } from './hooks/useCity';
import { useVenues } from './hooks/useVenues';
import { useHeadcounts } from './hooks/useHeadcounts';
import { Header } from './components/Layout/Header';
import { BottomNav, type Tab } from './components/Layout/BottomNav';
import { TonightPage } from './pages/TonightPage';
import { PrecapPage } from './pages/PrecapPage';
import { PortalPage } from './pages/PortalPage';
import { UsernameScreen } from './components/UsernameScreen';

export default function App() {
  const [tab, setTab] = useState<Tab>('tonight');
  const [username, setUsername] = useState<string | null>(
    () => localStorage.getItem('venue_username')
  );
  const { city, switchCity } = useCity();
  const { venues } = useVenues(city);
  const { headcounts, pulsedVenueId } = useHeadcounts(city);

  // Build counts map from headcounts (portal data only)
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [venueId, hc] of Object.entries(headcounts)) {
      if (hc.is_live) {
        map[venueId] = hc.current_count;
      }
    }
    return map;
  }, [headcounts]);

  // Total count across all live venues
  const totalCount = useMemo(() => {
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
  }, [counts]);

  // Set of venue IDs with live headcount
  const liveVenueIds = useMemo(() => {
    return new Set(
      Object.entries(headcounts)
        .filter(([, hc]) => hc.is_live)
        .map(([id]) => id)
    );
  }, [headcounts]);

  // Missing env error screen
  if (!envReady) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-white font-black text-2xl tracking-[0.05em] mb-4"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            venuu
          </h1>
          <div className="bg-[#111114] border border-[#2A2A30] rounded-xl p-5">
            <p className="text-[#FF5E1A] font-medium text-sm mb-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              Missing configuration
            </p>
            <p className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              Check your .env file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Username onboarding — first open
  if (!username) {
    return <UsernameScreen onComplete={setUsername} />;
  }

  return (
    <div className="min-h-screen bg-[#050507] relative">
      <Header
        city={city}
        onCityChange={switchCity}
        totalCount={totalCount}
        username={username}
      />

      {/* Tonight tab — map + venue cards */}
      <div className={tab === 'tonight' ? '' : 'hidden'}>
        <TonightPage
          city={city}
          venues={venues}
          counts={counts}
          headcounts={headcounts}
          liveVenueIds={liveVenueIds}
          pulsedVenueId={pulsedVenueId}
          username={username}
        />
      </div>

      {/* Precap tab — AI nightlife assistant */}
      <div className={tab === 'precap' ? '' : 'hidden'}>
        <PrecapPage
          venues={venues}
          headcounts={headcounts}
          username={username}
        />
      </div>

      {/* Portal tab — fullscreen clicker */}
      <div className={tab === 'portal' ? '' : 'hidden'}>
        <PortalPage onExit={() => setTab('tonight')} />
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
