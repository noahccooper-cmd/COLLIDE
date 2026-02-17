import { LoginScreen } from '../components/Auth/LoginScreen';
import { OnboardScreen } from '../components/Auth/OnboardScreen';
import { ProfileView } from '../components/Profile/ProfileView';
import type { Profile } from '../lib/types';
import type { CityKey } from '../lib/constants';

interface ProfilePageProps {
  isLoggedIn: boolean;
  needsOnboard: boolean;
  profile: Profile | null;
  onSendMagicLink: (email: string) => Promise<{ error: unknown }>;
  onCompleteOnboard: (username: string, classYear: number, city: CityKey) => Promise<{ error: unknown }>;
  onSignOut: () => void;
  onOpenPortal: () => void;
  onBrowseAsGuest: () => void;
}

export function ProfilePage({
  isLoggedIn,
  needsOnboard,
  profile,
  onSendMagicLink,
  onCompleteOnboard,
  onSignOut,
  onOpenPortal,
  onBrowseAsGuest,
}: ProfilePageProps) {
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ top: '108px', bottom: '64px' }}>
      {!isLoggedIn && (
        <LoginScreen onSendLink={onSendMagicLink} onBrowseAsGuest={onBrowseAsGuest} />
      )}

      {isLoggedIn && needsOnboard && (
        <OnboardScreen onComplete={onCompleteOnboard} />
      )}

      {isLoggedIn && !needsOnboard && profile && (
        <ProfileView profile={profile} onSignOut={onSignOut} onOpenPortal={onOpenPortal} />
      )}
    </div>
  );
}
