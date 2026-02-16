import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { supabase, envReady } from '../../lib/supabase';
import { getInitials } from '../../lib/utils';
import { HistoryItem } from './HistoryItem';
import type { Profile, CheckinHistory } from '../../lib/types';

interface ProfileViewProps {
  profile: Profile;
  onSignOut: () => void;
}

export function ProfileView({ profile, onSignOut }: ProfileViewProps) {
  const [history, setHistory] = useState<CheckinHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!envReady) {
      setLoading(false);
      return;
    }

    supabase
      .from('checkins')
      .select('*, venues(name)')
      .eq('user_id', profile.id)
      .order('night_of', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data as CheckinHistory[]) ?? []);
        setLoading(false);
      });
  }, [profile.id]);

  const cityLabel = profile.city === 'knoxville' ? 'Knoxville, TN' : 'Tampa, FL';

  return (
    <div className="px-6 py-8">
      {/* Avatar + Info */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg, #FF5E1A, #FF2D05)',
            fontFamily: 'Satoshi, sans-serif',
          }}>
          <span className="text-white font-bold text-lg">
            {getInitials(profile.username)}
          </span>
        </div>
        <div className="text-white font-bold text-lg" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          @{profile.username}
        </div>
        {profile.class_year && (
          <div className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            Class of {profile.class_year}
          </div>
        )}
        <div className="text-[#55555F] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {cityLabel}
        </div>
      </div>

      <div className="h-px bg-[#2A2A30] mb-6" />

      {/* Stats */}
      <div className="mb-6">
        <div className="text-[#8A8A95] text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          Total check-ins
        </div>
        <div className="text-white font-bold text-3xl" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {profile.total_checkins}
        </div>
      </div>

      {/* History */}
      <div className="mb-8">
        <h3 className="text-[#8A8A95] text-xs font-medium uppercase tracking-wider mb-2"
          style={{ fontFamily: 'Satoshi, sans-serif' }}>
          Recent
        </h3>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#FF5E1A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-[#55555F] text-sm py-4" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            No check-ins yet. Get out there!
          </p>
        ) : (
          <div className="bg-[#111114] rounded-xl border border-[#2A2A30] px-4">
            {history.map((item) => (
              <HistoryItem key={item.id} checkin={item} />
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="flex items-center justify-center gap-2 w-full py-3 text-[#55555F] hover:text-[#8A8A95] transition-colors"
        style={{ fontFamily: 'Satoshi, sans-serif' }}
      >
        <LogOut size={16} strokeWidth={1.5} />
        <span className="text-sm">Sign Out</span>
      </button>
    </div>
  );
}
