import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import { CITIES, MAPBOX_STYLE, type CityKey } from '../../lib/constants';
import { mapboxToken, mapboxReady } from '../../lib/supabase';
import { VenueBubble } from './VenueBubble';
import type { Venue } from '../../lib/types';

interface MapViewProps {
  city: CityKey;
  venues: Venue[];
  counts: Record<string, number>;
  liveVenueIds: Set<string>;
  userCheckinVenueId: string | null;
  pulsedVenueId: string | null;
  onVenueClick: (venue: Venue) => void;
}

export function MapView({ city, venues, counts, liveVenueIds, userCheckinVenueId, pulsedVenueId, onVenueClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxReady) return;

    mapboxgl.accessToken = mapboxToken;

    const config = CITIES[city];
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: [config.center.lng, config.center.lat],
      zoom: config.zoom,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [city]);

  // Update markers when venues/counts change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    venues.forEach(venue => {
      const el = document.createElement('div');
      el.style.position = 'relative';

      const root = createRoot(el);
      root.render(
        <VenueBubble
          venue={venue}
          count={counts[venue.id] ?? 0}
          isLive={liveVenueIds.has(venue.id)}
          isUserCheckedIn={userCheckinVenueId === venue.id}
          isPulsed={pulsedVenueId === venue.id}
          onClick={() => onVenueClick(venue)}
        />
      );

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [venues, counts, liveVenueIds, userCheckinVenueId, pulsedVenueId, onVenueClick, mapLoaded]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  if (!mapboxReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050507]">
        <p className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          Map requires VITE_MAPBOX_TOKEN in .env
        </p>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
