import { useEffect, useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePortal } from '../hooks/usePortal';
import { PortalLogin } from '../components/Portal/PortalLogin';
import { ClickerView } from '../components/Portal/ClickerView';
import { supabase, envReady } from '../lib/supabase';

interface PortalPageProps {
  onExit?: () => void;
}

export function PortalPage({ onExit }: PortalPageProps) {
  const {
    venue,
    headcount,
    loading,
    error,
    lastAction,
    savedVenueId,
    endSummary,
    loginWithPin,
    loadVenueById,
    handleEnter,
    handleExit,
    updateCover,
    endNight,
    disconnect,
  } = usePortal();

  // Fetch venue list for dropdown (id + name + city — no bouncer_pin)
  const [venueList, setVenueList] = useState<{ id: string; name: string; city: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    if (!envReady) return;
    supabase
      .from('venues')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setVenueList(data as { id: string; name: string; city: string }[]);
      });
  }, []);

  // Derive distinct sorted cities and filtered venues from venueList
  const cities = [...new Set(venueList.map(v => v.city))].sort();
  const filteredVenues = selectedCity
    ? venueList.filter(v => v.city === selectedCity)
    : [];

  // Auto-restore session from localStorage
  useEffect(() => {
    if (savedVenueId && !venue && !loading) {
      loadVenueById(savedVenueId);
    }
  }, [savedVenueId, venue, loading, loadVenueById]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    if (onExit) onExit();
  }, [disconnect, onExit]);

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#050507]">
        {onExit && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 text-[#8A8A95] hover:text-white transition-colors"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
              <span className="text-sm">Back</span>
            </button>
          </div>
        )}
        <PortalLogin
          cities={cities}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          venues={filteredVenues}
          loading={loading}
          error={error}
          onSubmit={loginWithPin}
        />
      </div>
    );
  }

  return (
    <ClickerView
      venue={venue}
      headcount={headcount}
      lastAction={lastAction}
      endSummary={endSummary}
      onEnter={handleEnter}
      onExit={handleExit}
      onEndNight={endNight}
      onUpdateCover={updateCover}
      onDisconnect={handleDisconnect}
    />
  );
}
