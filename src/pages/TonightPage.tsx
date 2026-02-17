import { useState, useCallback, useMemo } from 'react';
import { MapView } from '../components/Map/MapView';
import { VenueSheet } from '../components/Map/VenueSheet';
import type { Venue, Headcount } from '../lib/types';
import type { CityKey } from '../lib/constants';

interface TonightPageProps {
  city: CityKey;
  venues: Venue[];
  counts: Record<string, number>;
  headcounts: Record<string, Headcount>;
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
  headcounts,
  userCheckinVenueId,
  pulsedVenueId,
  isLoggedIn,
  onCheckIn,
  onLoginRequired,
}: TonightPageProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Merged counts: headcount if live, else checkin count
  const mergedCounts = useMemo(() => {
    const merged: Record<string, number> = { ...counts };
    for (const [venueId, hc] of Object.entries(headcounts)) {
      if (hc.is_live) {
        merged[venueId] = hc.current_count;
      }
    }
    return merged;
  }, [counts, headcounts]);

  // Set of venue IDs with live headcount data
  const liveVenueIds = useMemo(() => {
    return new Set(
      Object.entries(headcounts)
        .filter(([, hc]) => hc.is_live)
        .map(([id]) => id)
    );
  }, [headcounts]);

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
        counts={mergedCounts}
        liveVenueIds={liveVenueIds}
        userCheckinVenueId={userCheckinVenueId}
        pulsedVenueId={pulsedVenueId}
        onVenueClick={handleVenueClick}
      />

      {selectedVenue && (
        <VenueSheet
          venue={selectedVenue}
          checkinCount={counts[selectedVenue.id] ?? 0}
          headcount={headcounts[selectedVenue.id] ?? null}
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
