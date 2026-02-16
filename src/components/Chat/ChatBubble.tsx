import { timeAgo } from '../../lib/utils';
import type { ChatMessage } from '../../lib/types';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl ${
          isOwn
            ? 'bg-[#FF5E1A] rounded-br-md'
            : 'bg-[#111114] border border-[#2A2A30] rounded-bl-md'
        }`}
      >
        {!isOwn && (
          <div className="text-[#FF5E1A] text-xs font-bold mb-0.5" style={{ fontFamily: 'Satoshi, sans-serif' }}>
            @{message.username}
          </div>
        )}
        <p className="text-white text-sm leading-relaxed break-words" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {message.body}
        </p>
        <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-[#55555F]'}`}
          style={{ fontFamily: 'Satoshi, sans-serif' }}>
          {timeAgo(message.created_at)}
        </div>
      </div>
    </div>
  );
}
