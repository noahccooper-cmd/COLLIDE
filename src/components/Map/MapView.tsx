import { useEffect, useRef, useCallback, useState, type MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import { CITIES, MAPBOX_STYLE, type CityKey } from '../../lib/constants';
import { mapboxToken, mapboxReady } from '../../lib/supabase';
import { getDotTier, getShortName, formatCount, getCoverLabel } from '../../lib/utils';
import type { Venue } from '../../lib/types';

interface MarkerEntry {
  marker: mapboxgl.Marker;
  el: HTMLDivElement;
  dotEl: HTMLDivElement;
  countEl: HTMLSpanElement;
  labelEl: HTMLDivElement;
  liveEl: HTMLDivElement;
  coverEl: HTMLDivElement;
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

/* ── Main MapView Component ──────────── */

export function MapView({ city, venues, counts, liveVenueIds, pulsedVenueId, onVenueClick, onMapTap, mapInstanceRef }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const tMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const initialCityRef = useRef(city);
  const venuesRef = useRef(venues);
  const countsRef = useRef(counts);
  const onVenueClickRef = useRef(onVenueClick);
  venuesRef.current = venues;
  countsRef.current = counts;
  onVenueClickRef.current = onVenueClick;

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
      minZoom: 1,
      maxZoom: 18,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    /* ── Debug: catch WebGL crashes ── */
    map.on('error', (e: any) => {
      console.error('MAP ERROR:', e.error?.message || e);
    });
    map.getCanvas().addEventListener('webglcontextlost', (e) => {
      console.error('WEBGL CONTEXT LOST', e);
    });
    map.getCanvas().addEventListener('webglcontextrestored', () => {
      console.log('WEBGL CONTEXT RESTORED');
    });

    /* ── Zoom-aware visibility: simple binary show/hide ── */
    const updateZoomVisibility = () => {
      const zoom = map.getZoom();
      console.log('ZOOM:', zoom.toFixed(2));

      // ── Venue markers: hidden when zoom < 12, visible when >= 12 ──
      document.querySelectorAll('.venue-marker').forEach(node => {
        const wrapper = node.parentElement as HTMLElement | null;
        if (!wrapper) return;
        if (zoom >= 12) {
          wrapper.style.display = '';
          wrapper.style.opacity = '1';
          wrapper.style.pointerEvents = 'auto';
        } else {
          wrapper.style.display = 'none';
          wrapper.style.pointerEvents = 'none';
        }
      });

      // ── Power T: hidden when zoom < 11, visible when >= 11 ──
      const tWrapper = tMarkerRef.current?.getElement() as HTMLElement | null;
      if (tWrapper) {
        if (zoom >= 11) {
          tWrapper.style.display = '';
          tWrapper.style.opacity = '1';
        } else {
          tWrapper.style.display = 'none';
        }
      }
    };

    map.on('zoom', updateZoomVisibility);

    map.on('load', () => {
      // ── Power T — fixed geographic marker at UTK campus ──
      // Stays at fixed coordinates; Mapbox handles positioning via transform.
      // We ONLY touch opacity on the inner element for zoom-based fading.
      const tEl = document.createElement('div');
      tEl.className = 'power-t-marker';
      tEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="52" height="16" rx="3" fill="#FF8200"/>
        <rect x="22" y="18" width="20" height="42" rx="3" fill="#FF8200"/>
      </svg>`;

      const tMarker = new mapboxgl.Marker({ element: tEl, anchor: 'center' })
        .setLngLat([-83.9295, 35.9544])
        .addTo(map);

      // Prevent the Mapbox wrapper from ever transitioning its transform.
      // getElement() returns the .mapboxgl-marker wrapper that Mapbox positions.
      const tWrapperEl = tMarker.getElement();
      tWrapperEl.style.transition = 'none';
      tWrapperEl.style.willChange = 'transform';

      tMarkerRef.current = tMarker;

      setMapLoaded(true);
      updateZoomVisibility();
    });

    mapRef.current = map;
    if (mapInstanceRef) mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach(entry => entry.marker.remove());
      markersRef.current.clear();
      if (tMarkerRef.current) {
        tMarkerRef.current.remove();
        tMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      if (mapInstanceRef) mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const handleClick = () => { onMapTap?.(); };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [mapLoaded, onMapTap]);

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

  const syncMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;
    console.log(`[venUe] syncMarkers: ${venues.length} venues`, venues.map(v => `${v.name} (${v.lat}, ${v.lng})`));
    const currentIds = new Set(venues.map(v => v.id));

    markersRef.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    });

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

      const coverEl = document.createElement('div');
      coverEl.className = 'venue-cover-bubble';
      coverEl.style.display = 'none';

      el.appendChild(dotEl);
      el.appendChild(labelEl);
      el.appendChild(liveEl);
      el.appendChild(coverEl);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onVenueClickRef.current(venue);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapRef.current!);

      // Lock the Mapbox wrapper so CSS transitions never catch its transform.
      // Belt-and-suspenders with the CSS rule — this also covers browsers
      // that don't support :has().
      const wrapperEl = marker.getElement();
      wrapperEl.style.transition = 'none';
      wrapperEl.style.willChange = 'transform';

      markersRef.current.set(venue.id, {
        marker, el, dotEl, countEl, labelEl, liveEl, coverEl,
        currentTier: 'dot-t0', currentCount: 0,
      });
    });
  }, [venues, mapLoaded]);

  useEffect(() => { syncMarkers(); }, [syncMarkers]);

  useEffect(() => {
    // Build a lookup for venue cover_charge
    const venueMap = new Map(venues.map(v => [v.id, v]));

    markersRef.current.forEach((entry, venueId) => {
      const count = counts[venueId] ?? 0;
      const isLive = liveVenueIds.has(venueId);
      const isPulsed = pulsedVenueId === venueId;
      const newTier = getDotTier(count);

      if (newTier !== entry.currentTier) {
        entry.dotEl.classList.remove(entry.currentTier);
        entry.dotEl.classList.add(newTier);
        entry.currentTier = newTier;
      }

      if (count !== entry.currentCount) {
        entry.countEl.textContent = count > 0 ? formatCount(count) : '';
        entry.countEl.classList.remove('bumping');
        void entry.countEl.offsetWidth;
        entry.countEl.classList.add('bumping');
        entry.currentCount = count;
      }

      entry.liveEl.style.display = isLive ? 'flex' : 'none';
      if (isLive) entry.dotEl.classList.add('live-ring');
      else entry.dotEl.classList.remove('live-ring');

      if (isPulsed) {
        entry.dotEl.classList.add('count-updated');
        setTimeout(() => entry.dotEl.classList.remove('count-updated'), 500);
      }

      // Cover bubble
      const v = venueMap.get(venueId);
      const cover = v?.cover_charge;
      if (cover) {
        entry.coverEl.textContent = getCoverLabel(cover);
        entry.coverEl.style.display = 'flex';
      } else {
        entry.coverEl.style.display = 'none';
      }
    });

  }, [counts, liveVenueIds, pulsedVenueId, venues, mapLoaded]);

  if (!mapboxReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050507]">
        <p className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          Map requires VITE_MAPBOX_TOKEN in .env
        </p>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full" />;
}
