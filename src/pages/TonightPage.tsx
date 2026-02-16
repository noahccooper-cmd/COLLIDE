import { useState, useCallback } from 'react';
import { MapView } from '../components/Map/MapView';
import { VenueSheet } from '../components/Map/VenueSheet';
import type { Venue } from '../lib/types';
import type { CityKey } from '../lib/constants';

interface TonightPageProps {
  city: CityKey;
  venues: Venue[];
  counts: Record<string, number>;
  userCheckinVenueId: string | null;
  pulsedVenueId: string | null;
  isLoggedIn: boolean;
  onCheckIn: (venueId: string) => Promise<{ error: unknown }>;
  onLoginRequired: () => void;
}

export function TonightPage({
  city,
  venues,
  counts,
  userCheckinVenueId,
  pulsedVenueId,
  isLoggedIn,
  onCheckIn,
  onLoginRequired,
}: TonightPageProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const handleVenueClick = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  const handleCheckIn = useCallback(async () => {
    if (!selectedVenue) return;
    const result = await onCheckIn(selectedVenue.id);
    if (!result.error) {
      // Keep sheet open to show the updated state
    }
  }, [selectedVenue, onCheckIn]);

  return (
    <div className="absolute inset-0" style={{ top: '108px', bottom: '64px' }}>
      <MapView
        city={city}
        venues={venues}
        counts={counts}
        userCheckinVenueId={userCheckinVenueId}
        pulsedVenueId={pulsedVenueId}
        onVenueClick={handleVenueClick}
      />

      {selectedVenue && (
        <VenueSheet
          venue={selectedVenue}
          count={counts[selectedVenue.id] ?? 0}
          userCheckinVenueId={userCheckinVenueId}
          isLoggedIn={isLoggedIn}
          onCheckIn={handleCheckIn}
          onClose={handleClose}
          onLoginRequired={onLoginRequired}
        />
      )}
    </div>
  );
}
