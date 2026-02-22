import { useState, useRef, useEffect, useCallback } from 'react';
import type { Venue, Headcount } from '../lib/types';

interface PrecapMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PrecapPageProps {
  venues: Venue[];
  headcounts: Record<string, Headcount>;
  username: string;
}

const SUGGESTIONS = [
  "Where's the move tonight?",
  "What bars have no cover?",
  "Best spot for a group of 8?",
  "Where's least crowded right now?",
];

function buildVenueContext(venues: Venue[], headcounts: Record<string, Headcount>): string {
  if (venues.length === 0) return 'No venue data available.';

  return venues.map(v => {
    const hc = headcounts[v.id];
    const parts = [`${v.name}`];
    if (v.category) parts.push(`(${v.category})`);
    if (v.address) parts.push(`at ${v.address}`);
    if (hc?.is_live) {
      parts.push(`— LIVE: ${hc.current_count} inside`);
      if (hc.peak_count > 0) parts.push(`(peak: ${hc.peak_count})`);
    } else {
      parts.push('— no live count');
    }
    if (v.capacity) parts.push(`capacity: ${v.capacity}`);
    if (v.tonight_special) parts.push(`tonight: ${v.tonight_special}`);
    if (v.cover_price) parts.push(`cover: ${v.cover_price}`);
    if (v.hours) parts.push(`hours: ${v.hours}`);
    if (v.vibe) parts.push(`vibe: ${v.vibe}`);
    if (v.rating) parts.push(`rating: ${v.rating}/5`);
    if (v.description) parts.push(`— ${v.description}`);
    return parts.join(' ');
  }).join('\n');
}

async function sendPrecapMessage(
  history: PrecapMessage[],
  venues: Venue[],
  headcounts: Record<string, Headcount>,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getFallbackResponse(history[history.length - 1]?.content ?? '', venues, headcounts);
  }

  const venueContext = buildVenueContext(venues, headcounts);
  const systemPrompt = `You are the Precap — venUe's AI nightlife concierge for Knoxville, TN (University of Tennessee). You have deep local knowledge of every bar, club, and late-night spot. You're fun, opinionated, concise, and talk like a friend who knows the scene inside-out.

LIVE VENUE DATA (real-time):
${venueContext}

LOCAL KNOWLEDGE:
- "The Strip" = Cumberland Ave corridor near campus — The Hill, Half Barrel, Sunspot, Hanna's Lil Dive are all here
- "Old City" = downtown district — Old City Sports Bar, Fieldhouse Social, Sapphire are here
- "Market Square" = downtown square — Preservation Pub is the anchor
- Cotton Eyed Joe's is out west, 20 min drive — big country music venue, worth the Uber for a wild night
- Game days (especially football Saturdays) = everything on The Strip is packed by noon
- Typical peak hours: 10:30 PM – 1:30 AM on weekends
- Bar close = 3 AM in Knoxville
- If someone says "where's the move" they want to know the busiest/best spot RIGHT NOW
- Hanna's is small and intimate (120 cap), Half Barrel is craft beer focused, The Hill is THE college bar, Sunspot has the best rooftop
- Preservation Pub has 3 floors + rooftop, live music every night
- Sapphire is the only real nightclub — DJ, bottle service, dress code

RULES:
- Reference actual live headcounts when available — cite specific numbers
- Recommend specific venues by name with conviction
- If asked about cover, hours, vibes, ratings — use the real data above
- Keep answers to 2-3 sentences unless the user asks for more detail
- Be a hype friend who knows the scene, not a generic assistant
- If no live counts are available, give recommendations based on the night, vibe, and venue knowledge
- Never say "I don't have that information" — use your local knowledge to give a real answer`;

  const messages = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      return getFallbackResponse(history[history.length - 1]?.content ?? '', venues, headcounts);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "Hmm, I couldn't think of anything. Try asking again!";
  } catch (err) {
    console.error('Precap API error:', err);
    return getFallbackResponse(history[history.length - 1]?.content ?? '', venues, headcounts);
  }
}

function getFallbackResponse(
  userMsg: string,
  venues: Venue[],
  headcounts: Record<string, Headcount>,
): string {
  const liveVenues = venues.filter(v => headcounts[v.id]?.is_live);
  const busiestVenue = liveVenues.sort(
    (a, b) => (headcounts[b.id]?.current_count ?? 0) - (headcounts[a.id]?.current_count ?? 0)
  )[0];

  const msg = userMsg.toLowerCase();

  if (msg.includes('move') || msg.includes('where') || msg.includes('go')) {
    if (busiestVenue) {
      const count = headcounts[busiestVenue.id]?.current_count ?? 0;
      return `${busiestVenue.name} is the move right now with ${count} people inside! Head there before it fills up.`;
    }
    return "Counts aren't live yet tonight — check back after 9pm when the bouncers start clicking!";
  }

  if (msg.includes('cover') || msg.includes('free')) {
    const noCover = venues.filter(v => v.cover_price?.toLowerCase().includes('no cover') || v.cover_price?.toLowerCase().includes('free'));
    if (noCover.length > 0) {
      return `No cover at: ${noCover.map(v => v.name).join(', ')}. Save that money for drinks!`;
    }
    return "I don't have cover info loaded yet tonight. Check the venue cards on the map for details!";
  }

  if (msg.includes('crowd') || msg.includes('quiet') || msg.includes('least')) {
    const quietest = liveVenues.sort(
      (a, b) => (headcounts[a.id]?.current_count ?? 0) - (headcounts[b.id]?.current_count ?? 0)
    )[0];
    if (quietest) {
      return `${quietest.name} is the chillest right now with only ${headcounts[quietest.id]?.current_count ?? 0} people. Perfect if you want space!`;
    }
    return "No live counts yet — everywhere's pretty open early on!";
  }

  if (msg.includes('group') || msg.includes('big')) {
    const spacious = venues.filter(v => v.capacity && v.capacity >= 200);
    if (spacious.length > 0) {
      return `For a big group, try ${spacious.map(v => v.name).join(' or ')} — they've got the space to fit everyone.`;
    }
    return "Most of the strip can handle groups! I'd suggest checking the map to see who's least packed right now.";
  }

  if (liveVenues.length > 0) {
    const totalOut = liveVenues.reduce((s, v) => s + (headcounts[v.id]?.current_count ?? 0), 0);
    return `${totalOut} people are out right now across ${liveVenues.length} bars. ${busiestVenue ? `${busiestVenue.name} is leading the pack!` : 'Check the map for live counts!'}`;
  }

  return "Hey! I'm your nightlife assistant. Ask me about the best bars, live crowds, specials, or where to take your group tonight!";
}

export function PrecapPage({ venues, headcounts, username }: PrecapPageProps) {
  const [messages, setMessages] = useState<PrecapMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey ${username}! I'm the Precap — your AI nightlife assistant. I know every bar, live headcount, and tonight's specials. What's the plan tonight?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isTyping) return;

    const userMsg: PrecapMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const allMessages = [...messages, userMsg];
    const reply = await sendPrecapMessage(allMessages, venues, headcounts);

    const assistantMsg: PrecapMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: reply,
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  }, [input, isTyping, messages, venues, headcounts]);

  const handleSuggestion = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  return (
    <div className="precap-page">
      {/* Header */}
      <div className="precap-header">
        <span className="precap-header-icon">{'\u2728'}</span>
        <span className="precap-header-title">Precap</span>
        <span className="precap-header-sub">AI Nightlife Assistant</span>
      </div>

      {/* Messages */}
      <div className="precap-messages" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`precap-bubble ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="precap-avatar">{'\u2728'}</div>
            )}
            <div className={`precap-bubble-content ${msg.role}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="precap-bubble assistant">
            <div className="precap-avatar">{'\u2728'}</div>
            <div className="precap-bubble-content assistant">
              <div className="precap-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Suggestion chips — only show when few messages */}
        {messages.length <= 2 && !isTyping && (
          <div className="precap-suggestions">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                className="precap-chip"
                onClick={() => handleSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="precap-input-row">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about tonight..."
          className="precap-input"
          maxLength={300}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="precap-send"
        >
          {'\u2191'}
        </button>
      </div>
    </div>
  );
}
