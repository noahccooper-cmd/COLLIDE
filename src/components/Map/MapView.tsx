import { useEffect, useRef, useCallback, useState, type MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import { CITIES, MAPBOX_STYLE, type CityKey } from '../../lib/constants';
import { mapboxToken, mapboxReady } from '../../lib/supabase';
import { getDotTier, getShortName, formatCount } from '../../lib/utils';
import type { Venue } from '../../lib/types';

interface MarkerEntry {
  marker: mapboxgl.Marker;
  el: HTMLDivElement;
  dotEl: HTMLDivElement;
  countEl: HTMLSpanElement;
  labelEl: HTMLDivElement;
  liveEl: HTMLDivElement;
  currentTier: string;
  currentCount: number;
}

interface MapViewProps {
  city: CityKey;
  venues: Venue[];
  counts: Record<string, number>;
  liveVenueIds: Set<string>;
  pulsedVenueId: string | null;
  onVenueClick: (venue: Venue) => void;
  onMapTap?: () => void;
  mapInstanceRef?: MutableRefObject<mapboxgl.Map | null>;
}

const HEATMAP_SOURCE = 'venue-heat';
const HEATMAP_LAYER = 'venue-heatmap';

export function MapView({ city, venues, counts, liveVenueIds, pulsedVenueId, onVenueClick, onMapTap, mapInstanceRef }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const initialCityRef = useRef(city);
  const venuesRef = useRef(venues);
  const countsRef = useRef(counts);
  venuesRef.current = venues;
  countsRef.current = counts;

  // Build GeoJSON from current venues + counts
  const buildHeatGeoJSON = useCallback((): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: venuesRef.current.map(v => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      properties: {
        count: countsRef.current[v.id] || 0,
        intensity: Math.min((countsRef.current[v.id] || 0) / 100, 1),
      },
    })),
  }), []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !mapboxReady) return;

    mapboxgl.accessToken = mapboxToken;

    const config = CITIES[initialCityRef.current];
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: [config.center.lng, config.center.lat],
      zoom: config.zoom,
      bearing: 0,
      pitch: 0,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    // Zoom-aware marker fade
    const updateMarkerVisibility = () => {
      const zoom = map.getZoom();
      document.querySelectorAll('.venue-marker').forEach(node => {
        const el = node as HTMLElement;
        if (zoom >= 12.5) {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        } else if (zoom >= 11) {
          const fade = (zoom - 11) / 1.5;
          el.style.opacity = String(Math.max(0, Math.min(1, fade)));
          el.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });
    };

    map.on('zoom', updateMarkerVisibility);

    map.on('load', () => {
      // Add heatmap source + layer
      map.addSource(HEATMAP_SOURCE, {
        type: 'geojson',
        data: buildHeatGeoJSON(),
      });

      map.addLayer({
        id: HEATMAP_LAYER,
        type: 'heatmap',
        source: HEATMAP_SOURCE,
        paint: {
          'heatmap-radius': [
            'interpolate', ['linear'], ['get', 'count'],
            0, 0,
            10, 30,
            50, 60,
            100, 90,
            200, 130,
            300, 170,
          ],
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'count'],
            0, 0,
            10, 0.3,
            50, 0.5,
            100, 0.7,
            200, 0.9,
            300, 1,
          ],
          'heatmap-intensity': 0.75,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(40, 120, 50, 0.15)',
            0.25, 'rgba(80, 180, 60, 0.25)',
            0.4, 'rgba(200, 190, 40, 0.35)',
            0.55, 'rgba(240, 160, 30, 0.4)',
            0.7, 'rgba(255, 94, 26, 0.45)',
            0.85, 'rgba(240, 50, 15, 0.5)',
            1.0, 'rgba(200, 20, 5, 0.55)',
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            11, 0,
            12.5, 0.8,
            15, 0.6,
            18, 0.4,
          ],
        },
      });

      setMapLoaded(true);
      updateMarkerVisibility();
    });

    mapRef.current = map;
    if (mapInstanceRef) {
      mapInstanceRef.current = map;
    }

    return () => {
      markersRef.current.forEach(entry => entry.marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      if (mapInstanceRef) {
        mapInstanceRef.current = null;
      }
      setMapLoaded(false);
    };
  }, []);

  // Handle map click (tap on empty map area = dismiss card)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const handleClick = () => {
      onMapTap?.();
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [mapLoaded, onMapTap]);

  // Fly to new city when city changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const config = CITIES[city];
    mapRef.current.flyTo({
      center: [config.center.lng, config.center.lat],
      zoom: config.zoom,
      duration: 1500,
      essential: true,
    });
  }, [city, mapLoaded]);

  // Create markers for new venues, remove stale ones
  const syncMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    const currentIds = new Set(venues.map(v => v.id));

    // Remove markers for venues no longer present
    markersRef.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Create markers for new venues
    venues.forEach(venue => {
      if (markersRef.current.has(venue.id)) return;

      const el = document.createElement('div');
      el.className = 'venue-marker';
      el.setAttribute('data-venue-id', venue.id);

      const dotEl = document.createElement('div');
      dotEl.className = 'venue-dot dot-t0';

      const countEl = document.createElement('span');
      countEl.className = 'venue-count';
      dotEl.appendChild(countEl);

      const labelEl = document.createElement('div');
      labelEl.className = 'venue-label';
      labelEl.textContent = getShortName(venue.name);

      const liveEl = document.createElement('div');
      liveEl.className = 'venue-live-badge';
      liveEl.innerHTML = '<span class="blink"></span>LIVE';
      liveEl.style.display = 'none';

      el.appendChild(dotEl);
      el.appendChild(labelEl);
      el.appendChild(liveEl);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onVenueClick(venue);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapRef.current!);

      markersRef.current.set(venue.id, {
        marker,
        el,
        dotEl,
        countEl,
        labelEl,
        liveEl,
        currentTier: 'dot-t0',
        currentCount: 0,
      });
    });
  }, [venues, mapLoaded, onVenueClick]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  // Update marker visuals + heatmap when counts/live status change
  useEffect(() => {
    console.log('🗺️ MAP UPDATE — counts:', counts, 'live:', [...liveVenueIds]);

    markersRef.current.forEach((entry, venueId) => {
      const count = counts[venueId] ?? 0;
      const isLive = liveVenueIds.has(venueId);
      const isPulsed = pulsedVenueId === venueId;
      const newTier = getDotTier(count);

      // Update dot class if changed
      if (newTier !== entry.currentTier) {
        entry.dotEl.classList.remove(entry.currentTier);
        entry.dotEl.classList.add(newTier);
        entry.currentTier = newTier;
      }

      // Update count text
      if (count !== entry.currentCount) {
        entry.countEl.textContent = count > 0 ? formatCount(count) : '';
        entry.countEl.classList.remove('bumping');
        void entry.countEl.offsetWidth;
        entry.countEl.classList.add('bumping');
        entry.currentCount = count;
      }

      // Live badge
      entry.liveEl.style.display = isLive ? 'flex' : 'none';

      // Live ring on dot
      if (isLive) {
        entry.dotEl.classList.add('live-ring');
      } else {
        entry.dotEl.classList.remove('live-ring');
      }

      // Pulsed (count just changed via real-time)
      if (isPulsed) {
        entry.dotEl.classList.add('count-updated');
        setTimeout(() => entry.dotEl.classList.remove('count-updated'), 500);
      }
    });

    // Update heatmap data
    if (mapRef.current && mapLoaded) {
      const source = mapRef.current.getSource(HEATMAP_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(buildHeatGeoJSON());
      }
    }
  }, [counts, liveVenueIds, pulsedVenueId, mapLoaded, buildHeatGeoJSON]);

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
