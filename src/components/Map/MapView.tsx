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

/* ── Neyland Stadium polygon for 3D tint ── */

const NEYLAND_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-83.9260, 35.9570],
    [-83.9200, 35.9570],
    [-83.9200, 35.9530],
    [-83.9260, 35.9530],
    [-83.9260, 35.9570],
  ]],
};

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
  venuesRef.current = venues;
  countsRef.current = counts;

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

    /* ── Zoom-aware visibility for ALL elements ── */
    const updateZoomVisibility = () => {
      const zoom = map.getZoom();

      // ── Venue dots: visible zoom >= 13, fade 12-13, hidden < 12 ──
      document.querySelectorAll('.venue-marker').forEach(node => {
        const el = node as HTMLElement;
        if (zoom >= 13) {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        } else if (zoom >= 12) {
          const fade = (zoom - 12) / 1;
          el.style.opacity = String(Math.max(0, Math.min(1, fade)));
          el.style.pointerEvents = fade > 0.3 ? 'auto' : 'none';
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });

      // ── Power T marker: visible zoom 6-12.5, fade out 12.5-14, hidden otherwise ──
      const tEl = document.querySelector('.power-t-marker') as HTMLElement | null;
      if (tEl) {
        if (zoom < 6) {
          tEl.style.opacity = '0';
          tEl.style.transform = 'scale(0.5)';
        } else if (zoom >= 6 && zoom <= 12.5) {
          tEl.style.opacity = '0.85';
          tEl.style.transform = 'scale(1)';
        } else if (zoom > 12.5 && zoom <= 14) {
          const fade = 1 - ((zoom - 12.5) / 1.5);
          tEl.style.opacity = String(Math.max(fade * 0.85, 0));
          tEl.style.transform = `scale(${Math.max(fade, 0.5)})`;
        } else {
          tEl.style.opacity = '0';
          tEl.style.transform = 'scale(0.5)';
        }
      }
    };

    map.on('zoom', updateZoomVisibility);

    // ── 3D pitch when zoomed way in ──
    map.on('zoom', () => {
      const zoom = map.getZoom();
      if (zoom >= 15.5) {
        const targetPitch = Math.min((zoom - 15.5) * 15, 45);
        if (Math.abs(map.getPitch() - targetPitch) > 2) {
          map.easeTo({ pitch: targetPitch, duration: 300 });
        }
      } else if (map.getPitch() > 0) {
        map.easeTo({ pitch: 0, duration: 300 });
      }
    });

    map.on('load', () => {
      const layers = map.getStyle().layers || [];
      let firstLabelLayer: string | undefined;
      for (const layer of layers) {
        if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
          firstLabelLayer = layer.id;
          break;
        }
      }

      // ── Road Glow (composite source, real road geometry) ──
      // Only visible zoom >= 12.5
      map.addLayer({
        id: 'road-glow',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'street'],
        paint: {
          'line-color': 'rgba(255, 215, 140, 0.06)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12.5, 6, 15, 30, 18, 60],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 12.5, 6, 15, 25, 18, 45],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, 0, 13, 0.5, 16, 0.8],
        },
      }, firstLabelLayer);

      map.addLayer({
        id: 'road-glow-inner',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'street'],
        paint: {
          'line-color': 'rgba(255, 200, 120, 0.12)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12.5, 2, 15, 8, 18, 16],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 12.5, 2, 15, 6, 18, 10],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, 0, 13, 0.6, 16, 1],
        },
      }, firstLabelLayer);

      // ── 3D Buildings with Neyland Orange Tint ──
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': [
            'case',
            ['all', ['>=', ['get', 'height'], 30], ['within', NEYLAND_POLYGON]],
            'rgba(255, 130, 0, 0.6)',
            'rgba(30, 30, 35, 0.6)',
          ] as any,
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5, 17, 0.7],
        },
      });

      // ── Heatmap Layer — only visible zoom >= 12.5 ──
      map.addSource(HEATMAP_SOURCE, { type: 'geojson', data: buildHeatGeoJSON() });

      map.addLayer({
        id: HEATMAP_LAYER,
        type: 'heatmap',
        source: HEATMAP_SOURCE,
        paint: {
          'heatmap-radius': [
            'interpolate', ['linear'], ['get', 'count'],
            0, 0, 10, 30, 50, 60, 100, 90, 200, 130, 300, 170,
          ],
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'count'],
            0, 0, 10, 0.3, 50, 0.5, 100, 0.7, 200, 0.9, 300, 1,
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
            12, 0, 12.5, 0, 13, 0.8, 15, 0.6, 18, 0.4,
          ],
        },
      });

      // ── Power T — simple SVG marker (visible zoomed OUT, hidden zoomed IN) ──
      const tEl = document.createElement('div');
      tEl.className = 'power-t-marker';
      tEl.innerHTML = `<svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="52" height="16" rx="3" fill="#FF8200"/>
        <rect x="22" y="18" width="20" height="42" rx="3" fill="#FF8200"/>
      </svg>`;

      const tMarker = new mapboxgl.Marker({ element: tEl, anchor: 'center' })
        .setLngLat([-83.9300, 35.9544])
        .addTo(map);
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
        marker, el, dotEl, countEl, labelEl, liveEl,
        currentTier: 'dot-t0', currentCount: 0,
      });
    });
  }, [venues, mapLoaded, onVenueClick]);

  useEffect(() => { syncMarkers(); }, [syncMarkers]);

  useEffect(() => {
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
    });

    if (mapRef.current && mapLoaded) {
      const source = mapRef.current.getSource(HEATMAP_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (source) source.setData(buildHeatGeoJSON());
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

  return <div ref={mapContainer} className="w-full h-full" />;
}
