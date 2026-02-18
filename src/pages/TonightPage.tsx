import { useState, useCallback, useRef } from 'react';
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
  liveVenueIds: Set<string>;
  pulsedVenueId: string | null;
  username: string;
}

export function TonightPage({
  city,
  venues,
  counts,
  headcounts,
  liveVenueIds,
  pulsedVenueId,
  username,
}: TonightPageProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Keep selectedVenue in sync with venues array (for realtime special updates)
  const currentVenue = selectedVenue
    ? venues.find(v => v.id === selectedVenue.id) ?? selectedVenue
    : null;

  const handleVenueClick = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const bounds = map.getBounds();
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const offsetLat = venue.lat - latSpan * 0.22;
      map.flyTo({
        center: [venue.lng, offsetLat],
        zoom: Math.max(map.getZoom(), 14.5),
        duration: 400,
        essential: true,
      });
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedVenue(null);
  }, []);

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
        counts={counts}
        liveVenueIds={liveVenueIds}
        pulsedVenueId={pulsedVenueId}
        onVenueClick={handleVenueClick}
        onMapTap={handleMapTap}
        mapInstanceRef={mapInstanceRef}
      />

      {currentVenue && (
        <VenueCard
          venue={currentVenue}
          headcount={headcounts[currentVenue.id] ?? null}
          username={username}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
