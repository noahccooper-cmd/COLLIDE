export const CITIES = {
  knoxville: {
    name: 'Knoxville',
    state: 'TN',
    school: 'UTK',
    mascot: 'Vols',
    center: { lat: 35.9606, lng: -83.9207 },
    zoom: 14,
    countLabel: (count: number) =>
      count === 0
        ? 'See who\u2019s going out tonight'
        : `${count.toLocaleString()} people out right now`,
  },
  tampa: {
    name: 'Tampa',
    state: 'FL',
    school: 'USF',
    mascot: 'Bulls',
    center: { lat: 27.9506, lng: -82.4572 },
    zoom: 14,
    countLabel: (count: number) =>
      count === 0
        ? 'See who\u2019s going out tonight'
        : `${count.toLocaleString()} people out right now`,
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
  accentLive: '#00B4FF',
  accentClicker: '#FF5E1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8A95',
  textMuted: '#55555F',
} as const;

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
