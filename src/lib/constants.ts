const defaultCountLabel = (count: number) =>
  count === 0
    ? 'See who\u2019s going out tonight'
    : `${count.toLocaleString()} people out right now`;

export const CITIES = {
  austin: {
    name: 'Austin',
    state: 'TX',
    dbName: 'Austin, TX',
    school: 'Texas',
    mascot: 'Longhorns',
    schoolAbbr: 'UT',
    schoolColor: '#BF5700',
    schoolTextColor: '#FFFFFF',
    center: { lat: 30.2672, lng: -97.7431 },
    zoom: 14,
    countLabel: defaultCountLabel,
  },
  knoxville: {
    name: 'Knoxville',
    state: 'TN',
    school: 'UTK',
    mascot: 'Vols',
    center: { lat: 35.9570, lng: -83.9300 },
    zoom: 14.5,
    countLabel: (count: number) =>
      count === 0
        ? 'See who\u2019s going out tonight'
        : `${count.toLocaleString()} people out right now`,
  },
  norman: {
    name: 'Norman',
    state: 'OK',
    dbName: 'Norman, OK',
    school: 'Oklahoma',
    mascot: 'Sooners',
    schoolAbbr: 'OU',
    schoolColor: '#841617',
    schoolTextColor: '#FFFFFF',
    center: { lat: 35.2226, lng: -97.4395 },
    zoom: 15,
    countLabel: defaultCountLabel,
  },
  tampa: {
    name: 'Tampa',
    state: 'FL',
    school: 'USF',
    mascot: 'Bulls',
    center: { lat: 27.9506, lng: -82.4572 },
    zoom: 14.5,
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
