import { useState, useEffect, useCallback } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getNightOf } from '../lib/utils';
import type { CityKey } from '../lib/constants';
import type { ChatMessage } from '../lib/types';

export function useChat(city: CityKey) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const nightOf = getNightOf();

  const fetchMessages = useCallback(async () => {
    if (!envReady) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('city', city)
      .eq('night_of', nightOf)
      .order('created_at', { ascending: true })
      .limit(200);

    setMessages(data ?? []);
    setLoading(false);
  }, [city, nightOf]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!envReady) return;

    const channel = supabase
      .channel(`chat-rt-${city}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `city=eq.${city}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [city]);

  const sendMessage = useCallback(async (userId: string, username: string, body: string) => {
    if (!envReady) return { error: new Error('Not configured') };

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        username,
        city,
        body: body.trim(),
        night_of: nightOf,
      });

    return { error };
  }, [city, nightOf]);

  return { messages, loading, sendMessage };
}
