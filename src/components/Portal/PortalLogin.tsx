import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PortalLoginProps {
  savedCode: string;
  loading: boolean;
  error: string;
  onSubmit: (code: string) => Promise<{ error: string | null }>;
}

export function PortalLogin({ savedCode, loading, error, onSubmit }: PortalLoginProps) {
  const [code, setCode] = useState(savedCode);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6 || loading) return;
    await onSubmit(code.trim());
  };

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-white font-black text-2xl tracking-[0.05em] mb-1"
            style={{ fontFamily: 'Satoshi, sans-serif' }}>
            <span className="text-white">venuu</span>
            <span className="text-[#8A8A95] font-bold text-lg ml-2">Portal</span>
          </h1>
          <p className="text-[#8A8A95] text-sm mt-3" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            For venue staff only.
          </p>
          <p className="text-[#55555F] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Enter your venue code to start tracking tonight.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className={shaking ? 'shake' : ''}>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="HILL01"
              maxLength={6}
              className="w-full h-14 px-5 bg-[#111114] border border-[#2A2A30] rounded-xl text-white text-center text-xl font-bold tracking-[0.2em] placeholder-[#333338] outline-none focus:border-[#FF5E1A] transition-colors"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            />
          </div>
          <p className="text-[#55555F] text-xs mt-2 text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            6-character venue code
          </p>

          {error && (
            <p className="text-[#FF2D05] text-sm text-center mt-3 font-medium" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="w-full h-[52px] rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 mt-5"
            style={{
              fontFamily: 'Satoshi, sans-serif',
              background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'START COUNTING'}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-[#55555F] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Don't have a code?
          </p>
          <p className="text-[#8A8A95] text-xs" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Contact us to get your bar on venuu
          </p>
        </div>
      </div>
    </div>
  );
}
