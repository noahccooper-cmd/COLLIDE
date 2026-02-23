import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, envReady } from '../lib/supabase';
import { getCommentDay } from '../lib/utils';
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
  "Where should I go tonight?",
  "Plan my night for 4",
  "Best food on the strip",
  "Where can I play arcade games?",
];

const SYSTEM_PROMPT = `You are Vinny, venUe's AI nightlife assistant for Knoxville, TN. You know the Strip and surrounding bars intimately. Be conversational, fun, and specific. Match your answer to what the user is actually asking about.

VENUES YOU KNOW:
- The Hill (1105 Forest Ave): Award-winning wings, sports bar, huge patio with Sunsphere view. Daily specials: Taco Tue, Wing Wed. Open 11am-3am.
- Cool Beans (1817 Lake Ave): Classic dive bar. Cheap drinks, pool tables, sticky floors, pure college energy. Open 11am-3am.
- Half Barrel (1829 Cumberland Ave): Bourbon-focused, craft cocktails, more upscale strip bar. Open 4pm-3am.
- Sunspot (2200 Cumberland Ave): Best sit-down food on strip. Shrimp & grits, rattlesnake pasta, great brunch. Patio scene. Open 11am-10pm.
- Old City Sports Bar (106 S Central St): Downtown sports bar away from strip. Multiple TVs, game day energy.
- Taqueria Mares (2008 Cumberland Ave): Authentic Mexican, Barbie Margarita, horchata. THE late-night food spot, open til 3am.
- Hannas (1836 Cumberland Ave): Strip institution since 1994. Two floors + huge patio. 100+ beers, 200+ liquors. Dancing, pool, live music. THE 21st birthday spot. Thu-Sat 9pm-3am.
- Yacht Club (721 S 17th St): Barcade. Retro arcade games, N64, GameCube. Nearly 100 beers. Shot+PBR pregame deal.
- LiterBoard (1848 Cumberland Ave): Two-floor gaming bar. Retro consoles downstairs, bar and balcony up. Craft hot dogs, trivia, karaoke, live DJs. W-Sat 8pm-3am.
- The Bookstore (821 Melrose Pl): Intimate newer spot off strip. Low-key vibes, cocktail-focused. W-Sat 8pm-2am.

RULES:
- If they ask about FOOD → recommend Sunspot, The Hill, Mares based on what they want
- If they ask about DIVE BARS → Cool Beans, Hannas
- If they ask about GAMES/ARCADE → Yacht Club, LiterBoard
- If they ask about COCKTAILS/DATE NIGHT → The Bookstore, Half Barrel
- If they ask about DANCING/PARTY → Hannas, Cool Beans on weekends
- If they ask about LATE NIGHT FOOD → Mares, The Hill
- If they ask about SPORTS → The Hill, Old City Sports Bar
- NEVER repeat the same answer twice in a conversation
- Keep responses 2-3 sentences max, like texting a friend who knows every bar
- Use the live venue data if available (headcounts, specials, recent recaps)

LIVE DATA (from venue sensors, updated per request):
{LIVE_DATA}

TONIGHT'S RECAPS (what people are saying):
{RECAPS}`;

function buildLiveData(venues: Venue[], headcounts: Record<string, Headcount>): string {
  if (venues.length === 0) return 'No venues loaded yet.';

  return venues.map(v => {
    const hc = headcounts[v.id];
    const parts = [v.name];
    if (hc?.is_live) {
      parts.push(`— LIVE: ${hc.current_count} inside`);
      if (hc.peak_count > 0) parts.push(`(peak: ${hc.peak_count})`);
    } else {
      parts.push('— not counting yet');
    }
    if (v.tonight_special) parts.push(`| SPECIAL: ${v.tonight_special}`);
    return parts.join(' ');
  }).join('\n');
}

async function fetchRecentRecaps(venues: Venue[]): Promise<string> {
  if (!envReady || venues.length === 0) return 'No recaps yet tonight.';

  try {
    const dayOf = getCommentDay();
    const { data, error } = await supabase
      .from('venue_recaps')
      .select('username, body, stars, venue_id')
      .eq('day_of', dayOf)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error || !data || data.length === 0) return 'No recaps yet tonight.';

    const venueMap = new Map(venues.map(v => [v.id, v.name]));
    return data.map(r => {
      const venueName = venueMap.get(r.venue_id) ?? 'Unknown';
      return `@${r.username} at ${venueName}: ${'\u2605'.repeat(r.stars)}${'\u2606'.repeat(5 - r.stars)} "${r.body}"`;
    }).join('\n');
  } catch {
    return 'No recaps yet tonight.';
  }
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

  const liveData = buildLiveData(venues, headcounts);
  const recaps = await fetchRecentRecaps(venues);

  const fullPrompt = SYSTEM_PROMPT
    .replace('{LIVE_DATA}', liveData)
    .replace('{RECAPS}', recaps);

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
        max_tokens: 400,
        system: fullPrompt,
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
  const busiestVenue = [...liveVenues].sort(
    (a, b) => (headcounts[b.id]?.current_count ?? 0) - (headcounts[a.id]?.current_count ?? 0)
  )[0];

  const msg = userMsg.toLowerCase();

  // Food questions
  if (msg.includes('food') || msg.includes('eat') || msg.includes('hungry') || msg.includes('wing')) {
    return "Sunspot has the best sit-down food on the strip — shrimp & grits and rattlesnake pasta are incredible. For late-night, Taqueria Mares is THE move (open til 3am weekends, try the Barbie Margarita). And The Hill's wings are award-winning — go buffalo or garlic parm.";
  }

  // Gaming/arcade questions
  if (msg.includes('game') || msg.includes('arcade') || msg.includes('video') || msg.includes('play')) {
    return "Yacht Club is the hidden barcade gem — 25-cent retro arcade games, N64 Smash Bros, and the shot + PBR deal is only $5. LiterBoard is the two-floor gaming spot with retro consoles downstairs and a balcony overlooking Cumberland upstairs. Both are must-visits for gamers.";
  }

  // Plan/group questions
  if (msg.includes('plan') || msg.includes('group') || msg.includes('night for')) {
    return "Start at Cool Beans for cheap pregame pitchers and patio vibes. Move to Hanna's for the energy (two floors, dancing, huge patio). End at Taqueria Mares for late-night burritos — the Barbie Margarita is a must. That's the classic strip crawl right there.";
  }

  // Date night
  if (msg.includes('date') || msg.includes('romantic') || msg.includes('chill')) {
    return "For date night, start at Sunspot for dinner (upstairs balcony is perfect). Walk to Half Barrel for bourbon cocktails — try the PB&J Mixtape. End at The Bookstore on Melrose for intimate cocktail vibes. You'll look like you planned it for weeks.";
  }

  // Pregame/cheap
  if (msg.includes('cheap') || msg.includes('pregame') || msg.includes('deal') || msg.includes('budget')) {
    return "Cool Beans has $10 pitchers and the best dive patio on the strip. Yacht Club's shot + PBR deal is $5. Half Barrel's happy hour draft selection is unbeatable. For pure value, Cool Beans is your pregame HQ.";
  }

  // Dancing
  if (msg.includes('dance') || msg.includes('dancing') || msg.includes('energy') || msg.includes('party')) {
    return "Hanna's is THE energy spot — two floors, huge patio, dancing, live music. It's been the strip heartbeat since 1994. Opens Thu-Sat at 9pm and fills up fast. Get there early for the best experience.";
  }

  // Sports
  if (msg.includes('sport') || msg.includes('game day') || msg.includes('football') || msg.includes('watch')) {
    return "Old City Sports Bar has a 160-inch video wall and FREE beer until first score on UT game days — that's unbeatable. The Hill is the other go-to with big screens everywhere and award-winning wings. Both get packed on Saturdays so arrive early.";
  }

  // Drinks/cocktails/bourbon
  if (msg.includes('bourbon') || msg.includes('whiskey') || msg.includes('cocktail') || msg.includes('drink') || msg.includes('beer')) {
    return "Half Barrel has the best bourbon selection on the strip — maybe in all of Knoxville. Try the PB&J Mixtape cocktail. For craft beer, they also have 35+ taps. Yacht Club has nearly 100 beers in a cozy barcade setting.";
  }

  // Cover charge
  if (msg.includes('cover') || msg.includes('free entry')) {
    return "Most spots on the strip don't charge cover on regular nights — Cool Beans, Half Barrel, Yacht Club, and The Hill are usually free to walk in. Hanna's sometimes has a small cover on big weekends. Mares never charges cover.";
  }

  // Where to go / the move
  if (msg.includes('move') || msg.includes('where') || msg.includes('go') || msg.includes('tonight') || msg.includes('recommend')) {
    if (busiestVenue) {
      const count = headcounts[busiestVenue.id]?.current_count ?? 0;
      return `${busiestVenue.name} is popping right now with ${count} people inside! If you want the energy, head there. For something chill, Yacht Club or Half Barrel are always solid picks.`;
    }
    const day = new Date().getDay();
    if (day === 2) return "It's Taco Tuesday — The Hill is going to be packed. Start there, then hit the strip. Hanna's and Cool Beans will be lively later tonight.";
    if (day === 3) return "Wing Wednesday at The Hill is legendary. Grab wings early, then head to Half Barrel for craft beers. LiterBoard has trivia tonight too — solid Wednesday move.";
    if (day === 4) return "Thursday is when the strip wakes up! Hanna's opens at 9pm — two floors of energy. Pregame at Cool Beans or Yacht Club first for the best deals.";
    if (day === 5 || day === 6) return "Weekend vibes! The strip will be packed tonight. Start at Sunspot for dinner, pregame at Cool Beans, then Hanna's for the energy. End at Mares for late-night food (open til 3am).";
    return "The strip always has something going on. The Hill and Cool Beans are open daily til 3am. Half Barrel is great for a chill weeknight hang. What kind of vibe are you looking for?";
  }

  // Quiet/chill
  if (msg.includes('quiet') || msg.includes('least') || msg.includes('crowd')) {
    if (liveVenues.length > 0) {
      const quietest = [...liveVenues].sort(
        (a, b) => (headcounts[a.id]?.current_count ?? 0) - (headcounts[b.id]?.current_count ?? 0)
      )[0];
      if (quietest) {
        return `${quietest.name} is the chillest right now with only ${headcounts[quietest.id]?.current_count ?? 0} people. The Bookstore and Half Barrel are always great for low-key vibes too.`;
      }
    }
    return "For chill vibes, The Bookstore on Melrose is intimate and cocktail-focused. Half Barrel is perfect for conversation over bourbon. Yacht Club is cozy with retro games. All three are great when you want space to actually talk.";
  }

  // Live counts available
  if (liveVenues.length > 0) {
    const totalOut = liveVenues.reduce((s, v) => s + (headcounts[v.id]?.current_count ?? 0), 0);
    return `${totalOut} people are out right now across ${liveVenues.length} venues. ${busiestVenue ? `${busiestVenue.name} is leading the pack!` : ''} What kind of night are you looking for?`;
  }

  return "I know every spot on the strip inside and out — ask me about food, drinks, gaming, dancing, or tell me your vibe and I'll plan your whole night!";
}

export function PrecapPage({ venues, headcounts, username }: PrecapPageProps) {
  const [messages, setMessages] = useState<PrecapMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey ${username}! I'm Vinny — your AI nightlife assistant. I know every spot on the strip, live headcounts, tonight's specials, and what people are saying. What's the plan tonight?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref always holds the latest messages — avoids stale closure issues
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

    // Use ref to get the FULL conversation history (never stale)
    const fullHistory = [...messagesRef.current, userMsg];
    const reply = await sendPrecapMessage(fullHistory, venues, headcounts);

    const assistantMsg: PrecapMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: reply,
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  }, [input, isTyping, venues, headcounts]);

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
