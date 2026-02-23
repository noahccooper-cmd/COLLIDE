import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePortal } from '../hooks/usePortal';
import { PortalLogin } from '../components/Portal/PortalLogin';
import { ClickerView } from '../components/Portal/ClickerView';

interface PortalPageProps {
  initialCode?: string;
  onExit?: () => void;
}

export function PortalPage({ initialCode, onExit }: PortalPageProps) {
  const {
    venue,
    headcount,
    loading,
    error,
    lastAction,
    savedCode,
    endSummary,
    lookupVenueByCode,
    handleEnter,
    handleExit,
    updateSpecial,
    updateCover,
    endNight,
    disconnect,
  } = usePortal();

  // Auto-lookup if initialCode provided
  if (initialCode && !venue && !loading && !error) {
    lookupVenueByCode(initialCode);
  }

  const handleDisconnect = useCallback(() => {
    disconnect();
    if (onExit) onExit();
  }, [disconnect, onExit]);

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#050507]">
        {onExit && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 text-[#8A8A95] hover:text-white transition-colors"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
              <span className="text-sm">Back</span>
            </button>
          </div>
        )}
        <PortalLogin
          savedCode={initialCode ?? savedCode}
          loading={loading}
          error={error}
          onSubmit={lookupVenueByCode}
        />
      </div>
    );
  }

  return (
    <ClickerView
      venue={venue}
      headcount={headcount}
      lastAction={lastAction}
      endSummary={endSummary}
      onEnter={handleEnter}
      onExit={handleExit}
      onEndNight={endNight}
      onUpdateSpecial={updateSpecial}
      onUpdateCover={updateCover}
      onDisconnect={handleDisconnect}
    />
  );
}
