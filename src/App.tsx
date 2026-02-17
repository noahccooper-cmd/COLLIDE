import { useState, useCallback, useMemo } from 'react';
import { envReady } from './lib/supabase';
import { useCity } from './hooks/useCity';
import { useAuth } from './hooks/useAuth';
import { useVenues } from './hooks/useVenues';
import { useCheckins } from './hooks/useCheckins';
import { useHeadcounts } from './hooks/useHeadcounts';
import { useChat } from './hooks/useChat';
import { Header } from './components/Layout/Header';
import { BottomNav, type Tab } from './components/Layout/BottomNav';
import { TonightPage } from './pages/TonightPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { PortalPage } from './pages/PortalPage';

export default function App() {
  const [tab, setTab] = useState<Tab>('tonight');
  const [portalMode, setPortalMode] = useState(false);
  const { city, switchCity } = useCity();
  const { user, profile, loading: authLoading, needsOnboard, sendMagicLink, createProfile, signOut } = useAuth();
  const { venues } = useVenues(city);
  const { counts, totalCount, userCheckinVenueId, pulsedVenueId: checkinPulsedId, checkIn } = useCheckins(city, profile?.id);
  const { headcounts, pulsedVenueId: headcountPulsedId } = useHeadcounts(city);
  const { messages, loading: chatLoading, sendMessage } = useChat(city);

  const isLoggedIn = !!user && !authLoading;

  // Merge pulsed venue IDs (headcount pulse takes priority)
  const pulsedVenueId = headcountPulsedId ?? checkinPulsedId;

  // Compute merged total: headcount if live, else checkin count per venue
  const mergedTotalCount = useMemo(() => {
    const liveVenueIds = new Set(
      Object.entries(headcounts)
        .filter(([, hc]) => hc.is_live)
        .map(([id]) => id)
    );

    let total = 0;
    for (const [, hc] of Object.entries(headcounts)) {
      if (hc.is_live) total += hc.current_count;
    }
    for (const [id, count] of Object.entries(counts)) {
      if (!liveVenueIds.has(id)) total += count;
    }
    return total;
  }, [counts, headcounts]);

  const displayTotalCount = Object.keys(headcounts).length > 0 ? mergedTotalCount : totalCount;

  const handleLoginRequired = useCallback(() => {
    setTab('profile');
  }, []);

  const handleCheckIn = useCallback(async (venueId: string) => {
    return checkIn(venueId);
  }, [checkIn]);

  const handleSendChat = useCallback(async (body: string) => {
    if (!profile) return;
    await sendMessage(profile.id, profile.username, body);
  }, [profile, sendMessage]);

  const handleOpenPortal = useCallback(() => {
    setPortalMode(true);
  }, []);

  const handleExitPortal = useCallback(() => {
    setPortalMode(false);
  }, []);

  const handleBrowseAsGuest = useCallback(() => {
    setTab('tonight');
  }, []);

  // Missing env error screen
  if (!envReady) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-white font-black text-2xl tracking-[0.05em] mb-4"
            style={{ fontFamily: 'Satoshi, sans-serif', textShadow: '0 0 20px rgba(255, 94, 26, 0.3)' }}>
            ven<span style={{ color: '#FF5E1A' }}>U</span>e
          </h1>
          <div className="bg-[#111114] border border-[#2A2A30] rounded-xl p-5">
            <p className="text-[#FF5E1A] font-medium text-sm mb-2" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              Missing configuration
            </p>
            <p className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              Check your .env file. Required variables:
            </p>
            <ul className="text-[#55555F] text-xs mt-2 space-y-1" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
              <li>VITE_MAPBOX_TOKEN</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Portal mode — fullscreen, no header/nav
  if (portalMode) {
    return (
      <div className="min-h-screen bg-[#050507] relative">
        <PortalPage onExit={handleExitPortal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] relative">
      <Header city={city} onCityChange={switchCity} totalCount={displayTotalCount} />

      <div className={tab === 'tonight' ? '' : 'hidden'}>
        <TonightPage
          city={city}
          venues={venues}
          counts={counts}
          headcounts={headcounts}
          userCheckinVenueId={userCheckinVenueId}
          pulsedVenueId={pulsedVenueId}
          isLoggedIn={isLoggedIn}
          onCheckIn={handleCheckIn}
          onLoginRequired={handleLoginRequired}
        />
      </div>

      <div className={tab === 'chat' ? '' : 'hidden'}>
        <ChatPage
          city={city}
          messages={messages}
          loading={chatLoading}
          userId={profile?.id}
          username={profile?.username}
          isLoggedIn={isLoggedIn}
          onSend={handleSendChat}
          onLoginRequired={handleLoginRequired}
        />
      </div>

      <div className={tab === 'profile' ? '' : 'hidden'}>
        <ProfilePage
          isLoggedIn={isLoggedIn}
          needsOnboard={needsOnboard}
          profile={profile}
          onSendMagicLink={sendMagicLink}
          onCompleteOnboard={createProfile}
          onSignOut={signOut}
          onOpenPortal={handleOpenPortal}
          onBrowseAsGuest={handleBrowseAsGuest}
        />
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
