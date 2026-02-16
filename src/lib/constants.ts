export const CITIES = {
  knoxville: {
    name: 'Knoxville',
    state: 'TN',
    school: 'UTK',
    mascot: 'Vols',
    center: { lat: 35.9580, lng: -83.9290 },
    zoom: 14.5,
    goingLabel: (count: number) => `${count} Vol${count !== 1 ? 's' : ''} going out`,
  },
  tampa: {
    name: 'Tampa',
    state: 'FL',
    school: 'USF',
    mascot: 'Bulls',
    center: { lat: 27.9540, lng: -82.4560 },
    zoom: 13.5,
    goingLabel: (count: number) => `${count} going out tonight`,
  },
} as const;

export type CityKey = keyof typeof CITIES;

export const COLORS = {
  bgPrimary: '#050507',
  bgSurface: '#111114',
  bgElevated: '#1A1A1F',
  border: '#2A2A30',
  borderGlow: '#FF5E1A33',
  accentPrimary: '#FF5E1A',
  accentHot: '#FF2D05',
  accentWarm: '#FFAA00',
  accentCool: '#4A4A52',
  accentSuccess: '#00E676',
  accentCam: '#00B4FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8A95',
  textMuted: '#55555F',
} as const;

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
