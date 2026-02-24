import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

interface VenueOption {
  id: string;
  name: string;
}

interface PortalLoginProps {
  venues: VenueOption[];
  loading: boolean;
  error: string;
  onSubmit: (venueId: string, pin: string) => Promise<{ error: string | null }>;
}

export function PortalLogin({ venues, loading, error, onSubmit }: PortalLoginProps) {
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (error) {
      setShaking(true);
      setDigits(['', '', '', '']);
      setTimeout(() => {
        setShaking(false);
        inputRefs.current[0]?.focus();
      }, 400);
    }
  }, [error]);

  // Focus first PIN box when venue is selected
  useEffect(() => {
    if (selectedVenueId) {
      inputRefs.current[0]?.focus();
    }
  }, [selectedVenueId]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    // Auto-advance to next box
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const pin = digits.join('');
  const canSubmit = selectedVenueId && pin.length === 4 && !loading;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit(selectedVenueId, pin);
  }, [canSubmit, selectedVenueId, pin, onSubmit]);

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>
            {'\uD83D\uDD10'} Bouncer Portal
          </h1>
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
            Enter your venue code to start
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Venue Selector */}
          <div className="portal-select-wrap">
            <select
              value={selectedVenueId}
              onChange={e => setSelectedVenueId(e.target.value)}
              className="portal-venue-select"
            >
              <option value="">Select your venue...</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <ChevronDown size={18} className="portal-select-icon" />
          </div>

          {/* PIN Input — 4 digit boxes */}
          <div className={`portal-pin-row ${shaking ? 'shake' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="portal-pin-box"
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '14px', color: '#FF2D05', textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>
              {error}
            </p>
          )}

          {/* CLOCK IN button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="portal-clock-in-btn"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'CLOCK IN'}
          </button>
        </form>

        <div className="text-center mt-8">
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '12px', color: '#55555F' }}>
            Don't have a code?
          </p>
          <p style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '12px', color: '#8A8A95' }}>
            Contact us to get your bar on venuu
          </p>
        </div>
      </div>
    </div>
  );
}
