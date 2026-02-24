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

const SYSTEM_PROMPT = `You are Vinny, the AI nightlife assistant inside venuu. You know Knoxville's bar scene inside and out because you've been to every spot, talked to every bartender, and closed out tabs at 3 AM more times than you can count.

PERSONALITY:
- You're everyone's favorite going-out friend. Energetic, witty, sharp, and genuinely helpful.
- Match the user's energy. If they're hype, you're hype. If they're chill, you keep it smooth.
- Talk like a real person — casual, fun, trendy. Not corporate. Not robotic. You're the homie who knows every spot.
- Ask early: what's their vibe tonight? Who are they with? What kind of night are they looking for?
- Use their answers to tailor everything. A 35-year-old couple gets different recs than 4 freshmen trying to rage.
- Keep it concise. Don't write paragraphs. Quick, punchy, conversational.
- Opening energy examples: "Yo what's good! I'm Vinny. What's the move tonight?" or "What's up! You trying to go off or keep it chill? I got you either way."

KNOXVILLE BAR KNOWLEDGE:

THE HILL:
- THE game day spot. Wall-to-wall energy, live bands, DJs spinning hits everyone knows.
- Staff are legends — super friendly, treat you like family.
- Cheap drinks, and the food keeps you going all day. Wings are the move. Wing Wednesday packs the place out.
- Two floors — dancing upstairs, games on every screen. You'll be there from 11 AM to 1 AM on game day and not want to leave.
- Always a good-looking crowd everywhere you turn. Social scene is unmatched.
- If someone wants the full college bar experience with energy, this is the answer. Always busy, always a good time.

COOL BEANS:
- The spot for upperclassmen who want to kick back without the freshman chaos.
- Beers are like $2. Everything is affordable.
- Arcade games, photo booth, pool tables (quarter a game), basketball shoot hoop.
- Indoor-outdoor front bar area with garage doors that open up in warm weather. Heaters when it's cold.
- Outdoor patio with a Jumbotron for watching games on a big screen. Shaded section with a white tent.
- Booths are first come first served — get there early or grab a table.
- Food during the day but kitchen closes around 9 PM.
- Like the grown-up version of Half Barrel — similar vibes but more homey, different crowd.
- This is where people migrate to AFTER Sunspot on Wine Wednesdays. Remember that flow.

SUNSPOT:
- Dual personality spot. Downstairs: actual nice restaurant with cloth napkins, host seats you, great food. Upstairs: rooftop party.
- Perfect for dates or when parents visit — classy but still fun. Dinner for two runs under $40. Bottles of wine are $11.
- Wine Wednesday is the event. Starts buzzing at 4 PM, shoulder to shoulder by 7 PM. Live DJs on the rooftop.
- The rooftop has couches, umbrellas in orange and yellow, string lights above. The sunset literally sets on the bar — everyone's wearing sunglasses up there. Once the sun drops, the lights take over and the vibe stays going.
- People dress a little nicer here. Sundresses, nice sunglasses. It's that type of scene.
- Right on the end of Cumberland Ave strip.
- The ultimate pregame spot that can also be the main event. After Sunspot, the crowd flows to Cool Beans or Half Barrel.

MARES TAQUERIA:
- Mexican spot with build-your-own tacos and HUGE margaritas. The margs are the move here.
- Located on the bottom floor of Slate apartments, up Cumberland past Sunspot.
- Wall-to-wall packed on game nights and weekends. That USA vs Canada hockey game? Eruption of "USA! USA!" chants you could hear from next door.
- Staff is super interactive — they'll take photos with you and put you on their photo wall.
- Bright red and orange inside, rooster logo. The energy matches the colors.
- Good for literally anyone — upperclassmen, underclassmen, visitors. They just want you to have a great time.
- Perfect bite-and-margs spot to start the night before heading to the bars.

HALF BARREL:
- Underclassmen central. This is where the younger crowd lives.
- Three distinct sections: front bar with darts and games, second bar with open-air garage doors, and a chill patio out back.
- Smoker-friendly — light up wherever.
- Berry bombs are LEGENDARY here. If someone asks about signature drinks, berry bombs at Half Barrel.
- Parker's hot dogs outside at 3 AM is the late-night savior. Always mention this if someone asks about late-night food.
- Friendly crowd, good energy, layered layout so you can find your pocket.

YACHT CLUB:
- Fort Sanders staple. The classic college dive.
- Shot and a PBR combo is the signature. Cheap and iconic.
- Gritty, loud, packed, exactly what you want from a college bar.
- Right on the Strip near all the action.

UNDECLARED:
- Right next to Yacht Club — literally same building.
- Big freshman bar. Food, drinks, events.
- If someone's new to campus or younger, this is a solid starting point.

LITERBOARD:
- Gaming bar. N64s, GameCubes, gaming PCs, Galaga, the works.
- Come here if you want to game and drink at the same time.
- Chill vibe, not a rager. Good for a unique night out.

THE BOOKSTORE:
- Hidden gem cocktail bar. Speakeasy energy.
- Menus hidden in encyclopedias. Craft cocktails done right.
- More intimate, quieter, good for a date or a smaller group.

OLD CITY SPORTS BAR:
- Sports bar in the Old City district. Multiple TVs, game day energy.
- Different crowd than the Strip — a bit more spread out, less packed.

PRESERVATION PUB:
- Market Square downtown. Three stories with a rooftop.
- Live music venue — bands play here regularly.
- Different energy from the Strip. More of a downtown scene.

RADIUS ROOFTOP:
- Upscale rooftop lounge on Gay Street downtown.
- Craft cocktails, dressed-up crowd, city views.
- This is the move for someone who wants something elevated and classy.

CROWD FLOW KNOWLEDGE (this is critical):
- Wine Wednesday: Sunspot rooftop → Cool Beans or Half Barrel
- Game day: The Hill all day, overflow to Half Barrel or Cool Beans at night
- Freshman night out: Half Barrel → Undeclared → Yacht Club
- Upperclassmen night: Sunspot → Cool Beans
- Date night: Sunspot dinner → Bookstore cocktails → Radius Rooftop
- Late night food: Parker's hot dogs outside Half Barrel, Mares for tacos
- Pregame spot: Sunspot or Mares, then migrate to the bars

RULES:
- Always ask what vibe they want before recommending
- Read their age/group and tailor accordingly — don't send a 30-year-old couple to Half Barrel
- If they mention food, know which spots have kitchens and when they close
- If they ask about cover charges or headcount, reference the LIVE data from venuu — tell them to check the map for real-time numbers
- Keep responses short and punchy. 2-4 sentences max unless they ask for detail.
- Never be generic. Always reference specific things: the berry bombs, the $11 wine bottles, Parker's hot dogs, the rooftop sunset.
- You know where crowds go AFTER each spot. Use that intel.

LIVE DATA (from venuu sensors, updated per request):
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
  if (msg.includes('food') || msg.includes('eat') || msg.includes('hungry') || msg.includes('wing') || msg.includes('taco')) {
    return "Wing Wednesday at The Hill is PACKED for a reason — wings are the move there. Mares has build-your-own tacos and huge margs, perfect pre-bar fuel. Late night? Parker's hot dogs outside Half Barrel at 3 AM will save your life.";
  }

  // Gaming/arcade questions
  if (msg.includes('game') || msg.includes('arcade') || msg.includes('video') || msg.includes('play') || msg.includes('gaming')) {
    return "LiterBoard is the gaming bar — N64s, GameCubes, gaming PCs, Galaga, the works. Chill vibe, not a rager. Yacht Club's also got the shot + PBR combo if you want something grittier. Both solid for a unique night.";
  }

  // Plan/group questions
  if (msg.includes('plan') || msg.includes('group') || msg.includes('night for')) {
    return "Bet! Start at Mares for tacos and margs to fuel up, hit Cool Beans for $2 beers and the patio Jumbotron, then close it out wherever the energy takes you. Parker's hot dogs outside Half Barrel at 3 AM for the save. Classic strip crawl.";
  }

  // Date night
  if (msg.includes('date') || msg.includes('romantic') || msg.includes('couple')) {
    return "Date night? Start at Sunspot — dinner for two under $40, $11 wine bottles, the sunset hits the rooftop perfectly. Walk to The Bookstore for speakeasy cocktails (menus hidden in encyclopedias). If you want to level up, Radius Rooftop downtown for city views.";
  }

  // Chill vibes
  if (msg.includes('chill') || msg.includes('lowkey') || msg.includes('low key') || msg.includes('relaxed')) {
    return "Cool Beans is your spot — $2 beers, pool tables, garage doors open in warm weather. It's the grown-up version of the strip bars. Bookstore is even more lowkey if you want craft cocktails and speakeasy vibes.";
  }

  // Pregame/cheap
  if (msg.includes('cheap') || msg.includes('pregame') || msg.includes('deal') || msg.includes('budget')) {
    return "Cool Beans is pregame HQ — $2 beers, quarter pool tables, arcade games. Yacht Club's shot + PBR combo is iconic. Half Barrel's berry bombs are legendary if you want something with more kick. You won't break the bank at any of these.";
  }

  // Dancing/party/energy
  if (msg.includes('dance') || msg.includes('dancing') || msg.includes('energy') || msg.includes('party') || msg.includes('rage') || msg.includes('hype')) {
    return "The Hill is where the energy LIVES — two floors, DJs spinning hits, the crowd is always good-looking and going off. Game days it's wall-to-wall from 11 AM. If you want to rage, that's the answer. Always busy, always a good time.";
  }

  // Sports
  if (msg.includes('sport') || msg.includes('game day') || msg.includes('football') || msg.includes('watch')) {
    return "The Hill is THE game day spot — you'll be there from 11 AM to 1 AM and not want to leave. Games on every screen, live bands, DJs. Old City Sports Bar is the other move with a huge video wall. Both get packed so show up early!";
  }

  // Drinks/cocktails/bourbon
  if (msg.includes('bourbon') || msg.includes('whiskey') || msg.includes('cocktail') || msg.includes('drink') || msg.includes('beer') || msg.includes('marg')) {
    return "Berry bombs at Half Barrel are LEGENDARY — that's the signature. Mares has huge margs that'll sneak up on you. Bookstore does craft cocktails right with speakeasy energy. And Cool Beans? $2 beers all day. Depends on your vibe!";
  }

  // Cover charge
  if (msg.includes('cover') || msg.includes('free entry')) {
    return "Check the venuu map for real-time cover charges — it updates live. Most strip spots are free on regular nights. I'd check the dots before heading out so you know exactly what you're walking into.";
  }

  // Wine Wednesday
  if (msg.includes('wine') || msg.includes('wednesday')) {
    return "Wine Wednesday at Sunspot is THE event. $11 bottles, rooftop DJs, shoulder to shoulder by 7 PM. The sunset hits the bar perfectly — everyone's in sundresses and sunglasses up there. After Sunspot, the crowd flows to Cool Beans. That's the move.";
  }

  // Freshman/new
  if (msg.includes('freshman') || msg.includes('new') || msg.includes('first time') || msg.includes('21')) {
    return "Welcome to the strip! Half Barrel → Undeclared → Yacht Club is the freshman flow. Berry bombs at Half Barrel to start, Undeclared for the scene, Yacht Club for the shot + PBR combo to close it out. Parker's hot dogs at 3 AM. You'll thank me later.";
  }

  // Where to go / the move
  if (msg.includes('move') || msg.includes('where') || msg.includes('go') || msg.includes('tonight') || msg.includes('recommend')) {
    if (busiestVenue) {
      const count = headcounts[busiestVenue.id]?.current_count ?? 0;
      return `${busiestVenue.name} is popping right now with ${count} people inside! That's where the energy is. But real talk — what's YOUR vibe tonight? I'll give you the perfect route.`;
    }
    const day = new Date().getDay();
    if (day === 2) return "Taco Tuesday! Mares is gonna be packed — huge margs and build-your-own tacos. Start there, then hit the strip bars. The Hill and Cool Beans will be lively later.";
    if (day === 3) return "Wine Wednesday! Sunspot rooftop is THE move — $11 bottles, DJs, sunset vibes. Get there by 5 to grab a spot. After that, the crowd flows to Cool Beans. Wing Wednesday at The Hill is also going off.";
    if (day === 4) return "Thursday the strip wakes up! Pregame at Cool Beans or Mares, then let the energy take you. The Hill and Half Barrel will both be going. What's your crew looking like?";
    if (day === 5 || day === 6) return "Weekend vibes! Start at Sunspot or Mares to fuel up, hit Cool Beans for the patio, then wherever the energy takes you. Parker's hot dogs outside Half Barrel at 3 AM is the closer. What kind of night you going for?";
    return "The strip always has something going on. But tell me — who are you with and what's the vibe? I'll build you the perfect route.";
  }

  // Quiet/chill
  if (msg.includes('quiet') || msg.includes('least') || msg.includes('crowd')) {
    if (liveVenues.length > 0) {
      const quietest = [...liveVenues].sort(
        (a, b) => (headcounts[a.id]?.current_count ?? 0) - (headcounts[b.id]?.current_count ?? 0)
      )[0];
      if (quietest) {
        return `${quietest.name} is the chillest right now with only ${headcounts[quietest.id]?.current_count ?? 0} people. Bookstore is always intimate, and Cool Beans has pockets where you can actually hear yourself think.`;
      }
    }
    return "Bookstore is the hidden gem — speakeasy vibes, menus in encyclopedias, craft cocktails done right. Cool Beans is more laid back than most strip bars too. Both good when you want to actually have a conversation.";
  }

  // Live counts available
  if (liveVenues.length > 0) {
    const totalOut = liveVenues.reduce((s, v) => s + (headcounts[v.id]?.current_count ?? 0), 0);
    return `${totalOut} people are out right now across ${liveVenues.length} venues! ${busiestVenue ? `${busiestVenue.name} is leading the pack.` : ''} What's your vibe — trying to go off or keep it smooth?`;
  }

  return "I know every spot, every crowd flow, every late-night move. Tell me your vibe and who you're with — I'll build the perfect night for you.";
}

export function PrecapPage({ venues, headcounts, username }: PrecapPageProps) {
  const [messages, setMessages] = useState<PrecapMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Yo what's good ${username}! I'm Vinny — I know every spot on the strip inside and out. What's the move tonight? You trying to go off or keep it chill?`,
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
    if (navigator.vibrate) navigator.vibrate(10);

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
