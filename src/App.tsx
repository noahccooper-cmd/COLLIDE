import { useState, useCallback } from 'react';
import { envReady } from './lib/supabase';
import { useCity } from './hooks/useCity';
import { useAuth } from './hooks/useAuth';
import { useVenues } from './hooks/useVenues';
import { useCheckins } from './hooks/useCheckins';
import { useChat } from './hooks/useChat';
import { Header } from './components/Layout/Header';
import { BottomNav, type Tab } from './components/Layout/BottomNav';
import { TonightPage } from './pages/TonightPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const [tab, setTab] = useState<Tab>('tonight');
  const { city, switchCity } = useCity();
  const { user, profile, loading: authLoading, needsOnboard, sendMagicLink, createProfile, signOut } = useAuth();
  const { venues } = useVenues(city);
  const { counts, totalCount, userCheckinVenueId, pulsedVenueId, checkIn } = useCheckins(city, profile?.id);
  const { messages, loading: chatLoading, sendMessage } = useChat(city);

  const isLoggedIn = !!user && !authLoading;

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

  // Missing env error screen
  if (!envReady) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-white font-black text-2xl tracking-[0.05em] mb-4"
            style={{ fontFamily: 'Satoshi, sans-serif', textShadow: '0 0 20px rgba(255, 94, 26, 0.3)' }}>
            VENYOU
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

  return (
    <div className="min-h-screen bg-[#050507] relative">
      <Header city={city} onCityChange={switchCity} totalCount={totalCount} />

      <div className={tab === 'tonight' ? '' : 'hidden'}>
        <TonightPage
          city={city}
          venues={venues}
          counts={counts}
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
        />
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
