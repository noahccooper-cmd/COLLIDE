import { useState, useCallback } from 'react';
import type { CityKey } from '../lib/constants';

export function useCity() {
  const [city, setCity] = useState<CityKey>(() => {
    const stored = localStorage.getItem('collide_city');
    if (stored === 'knoxville' || stored === 'tampa') return stored;
    return 'knoxville';
  });

  const switchCity = useCallback((newCity: CityKey) => {
    setCity(newCity);
    localStorage.setItem('collide_city', newCity);
  }, []);

  return { city, switchCity };
}
