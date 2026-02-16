import { ChatRoom } from '../components/Chat/ChatRoom';
import { CITIES, type CityKey } from '../lib/constants';
import type { ChatMessage } from '../lib/types';

interface ChatPageProps {
  city: CityKey;
  messages: ChatMessage[];
  loading: boolean;
  userId?: string;
  username?: string;
  isLoggedIn: boolean;
  onSend: (body: string) => Promise<void>;
  onLoginRequired: () => void;
}

export function ChatPage({ city, messages, loading, userId, username, isLoggedIn, onSend, onLoginRequired }: ChatPageProps) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ top: '108px', bottom: '64px' }}>
      <div className="px-4 py-2.5 border-b border-[#2A2A30] bg-[#050507]">
        <h2 className="text-white font-bold text-sm" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          COLLIDE Chat — {CITIES[city].name}
        </h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatRoom
          messages={messages}
          loading={loading}
          userId={userId}
          username={username}
          isLoggedIn={isLoggedIn}
          onSend={onSend}
          onLoginRequired={onLoginRequired}
        />
      </div>
    </div>
  );
}
