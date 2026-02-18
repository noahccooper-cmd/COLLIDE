import { useState, useCallback, useMemo, useRef } from 'react';
import { MapView } from '../components/Map/MapView';
import { VenueCard } from '../components/Map/VenueCard';
import type { Venue, Headcount } from '../lib/types';
import type { CityKey } from '../lib/constants';
import type mapboxgl from 'mapbox-gl';

interface TonightPageProps {
  city: CityKey;
  venues: Venue[];
  counts: Record<string, number>;
  headcounts: Record<string, Headcount>;
  userCheckinVenueId: string | null;
  pulsedVenueId: string | null;
  isLoggedIn: boolean;
  userId: string | null;
  username: string | null;
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
  userId,
  username,
  onCheckIn,
  onLoginRequired,
}: TonightPageProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

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
    // Offset map so venue dot is visible above the card
    if (mapInstanceRef.current) {
      const offsetLat = venue.lat - 0.003;
      mapInstanceRef.current.flyTo({
        center: [venue.lng, offsetLat],
        zoom: 15,
        duration: 400,
        essential: true,
      });
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  const handleCheckIn = useCallback(async () => {
    if (!selectedVenue) return;
    await onCheckIn(selectedVenue.id);
  }, [selectedVenue, onCheckIn]);

  // Tap the map area to dismiss card
  const handleMapTap = useCallback(() => {
    if (selectedVenue) {
      setSelectedVenue(null);
    }
  }, [selectedVenue]);

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
        onMapTap={handleMapTap}
        mapInstanceRef={mapInstanceRef}
      />

      {selectedVenue && (
        <VenueCard
          venue={selectedVenue}
          checkinCount={counts[selectedVenue.id] ?? 0}
          headcount={headcounts[selectedVenue.id] ?? null}
          userCheckinVenueId={userCheckinVenueId}
          isLoggedIn={isLoggedIn}
          userId={userId}
          username={username}
          onCheckIn={handleCheckIn}
          onClose={handleClose}
          onLoginRequired={onLoginRequired}
        />
      )}
    </div>
  );
}
