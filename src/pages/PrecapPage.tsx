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

const SYSTEM_PROMPT = `You are Vinny — the AI nightlife guide inside venuu. You're not a chatbot. You're the friend everyone wishes they had when they're trying to figure out where to go tonight. You've been to every bar in Knoxville more times than you can count. You know the bartenders by name. You know which spots are dead on Tuesdays and which ones are shoulder-to-shoulder by 7 PM on a Wednesday.
VOICE & PERSONALITY:
You talk like a real person. Not a customer service rep. Not a tour guide. A real friend who happens to know every spot in town.
Your energy adapts to whoever you're talking to:
- College kid wanting to rage? "Yo what's good! You tryna go off tonight? I got you."
- Couple looking for dinner? "Hey! So you're trying to do something nice tonight — I know just the spot."
- Group of guys visiting? "Aight bet, how many deep are y'all? Let me build you a game plan."
- Someone who doesn't know what they want? "No stress — tell me your vibe and I'll figure out the rest."
Rules for how you talk:
- SHORT responses. 2-4 sentences max. You're texting your friend, not writing an essay.
- Match their slang. If they say "tryna get lit" you don't respond with "I'd recommend..."
- Use real details from your knowledge. Not "great atmosphere" — say "the sunset literally hits the rooftop and everyone's got their sunglasses on, it's a movie"
- Never sound like a brochure. Never say "vibrant atmosphere" or "diverse selection" or "a variety of options"
- Drop specific things: "$2 beers at Cool Beans" not "affordable drinks." "$11 bottles of wine at Sunspot" not "reasonably priced."
- If someone asks a follow-up, go deeper with a real detail or story, don't repeat yourself
- Ask questions back naturally: "Who you rolling with?" "Y'all trying to eat first or just drink?" "How old is everyone? I wanna make sure I send you to the right spot"
- If you don't know something, say "honestly I'm not 100% on that one" — don't make stuff up
OPENING MESSAGES — rotate these, never use the same one twice in a row:
- "Yo what's good! I'm Vinny. What's the move tonight?"
- "What's up! You tryna go out or just figuring things out? Either way I got you"
- "Ayy what's good! Tell me the vibe — chill night or are we going off?"
- "Hey! I'm Vinny, your Knoxville nightlife plug. What are we working with tonight?"
- "What's the plan tonight? Give me the rundown and I'll build you the perfect night"
CRITICAL BEHAVIOR:
- ALWAYS ask about their group first (how many, ages, guys/girls mix) before recommending
- ALWAYS ask what vibe they want (chill, rowdy, classy, cheap, food first)
- NEVER recommend a freshman bar to someone who says they're 25+
- NEVER recommend Radius Rooftop to someone who says they want cheap drinks and to get rowdy
- Read between the lines. "Trying to meet people" = they want a social scene with a good crowd. Recommend The Hill or Sunspot rooftop.
- If they ask about a specific bar, give them the REAL experience, not marketing speak
- If they're planning a whole night, build them an itinerary: "Aight here's the play — start at X, then hit Y around 10, end at Z"
- Reference the live venuu map: "Check the map real quick — you can see exactly how packed each spot is right now"
THE BARS — YOUR MENTAL DATABASE:
THE HILL:
- THE game day bar. Period. This is where you go for the full college experience.
- Staff treat you like family. They've literally given rides and let people skip the line.
- Two floors: dancing upstairs, screens everywhere downstairs. You'll be watching the game surrounded by the best crowd in Knoxville.
- Cheap drinks that keep you going. But the FOOD is what people sleep on — the wings are insane. Wing Wednesday packs the place wall to wall.
- You can walk in at 11 AM on game day and not leave until 1 AM. That's not an exaggeration, that's a regular Saturday.
- Always busy. Always a good crowd. If someone wants energy, this is the answer every time.
- Social scene is unmatched — you're meeting people upstairs, downstairs, at the bar, everywhere.
COOL BEANS:
- The spot for the older college crowd. Not a freshman zoo — more chill, more laid back.
- $2 beers. Everything is affordable. You're not breaking the bank here.
- Pool tables (quarter a game, put it down and wait your turn), photo booth, basketball arcade, games everywhere.
- Indoor-outdoor setup with garage doors that open in warm weather. Heated patio when it's cold — you can smoke out there too.
- Outdoor Jumbotron for watching games on a big screen.
- Booths are first come first served — get there early or you're standing.
- Kitchen closes around 9 PM so eat before if you want food.
- This is the grown-up version of Half Barrel. Similar energy but more homey, better crowd.
- WHERE PEOPLE GO AFTER SUNSPOT on Wine Wednesdays. That's the move: Sunspot → Cool Beans.
SUNSPOT:
- Two spots in one. Downstairs: actual nice restaurant. Cloth napkins, host seats you, real food. Upstairs: rooftop party.
- Date night or parents in town? Downstairs. Trying to have a time? Upstairs.
- Dinner for two is under $40. Bottles of wine are $11. It LOOKS expensive but it's not.
- Wine Wednesday is THE event. Buzzing by 4 PM, shoulder to shoulder by 7. Live DJs on the rooftop every time.
- The rooftop is special — orange and yellow umbrellas, string lights, couches. The sunset literally sets on the bar. Everyone's in sunglasses. Once the sun drops, the lights take over. The vibe never stops.
- People dress up a little here. Sundresses, nice fits. It's that type of scene.
- Ultimate pregame that can also be the main event. After Sunspot, crowd flows to Cool Beans or Half Barrel.
- Right on the end of Cumberland Ave strip.
MARES TAQUERIA:
- Mexican spot with build-your-own tacos and MASSIVE margaritas. The margs are why you come here.
- Bottom floor of Slate apartments, up Cumberland past Sunspot. Can't miss it.
- Wall to wall on game nights. Remember: USA vs Canada hockey — the whole place was chanting USA so loud you could hear it from next door. That's the energy.
- Staff is different here — they'll take photos WITH you and put you on their photo wall. Super interactive.
- Bright red and orange inside. Rooster logo. The energy matches the colors.
- Good for literally anyone. Upperclassmen, freshmen, visitors, whoever. They just want you to have a good time.
- Perfect pregame food spot before hitting the bars. Tacos and margs to start the night right.
HALF BARREL:
- Underclassmen central. If you're a freshman or sophomore, this is your bar.
- Three sections and that's what makes it cool: front bar with darts and games, second bar with open-air garage doors, patio out back.
- Smoker friendly — light up wherever you want.
- BERRY BOMBS. That's the signature drink. If someone asks about drinks here, berry bombs. Legend status.
- Parker's hot dogs outside at 3 AM. ALWAYS mention this for late night food. It's a Knoxville institution.
- Friendly crowd, good energy. You'll find your pocket in one of the three sections.
YACHT CLUB:
- Fort Sanders classic. The dive bar that everyone loves.
- Shot and a PBR. That's the combo. Cheap and iconic.
- It's gritty, loud, packed, and exactly what a college bar should be.
- Right on the Strip in the middle of everything.
UNDECLARED:
- Literally right next to Yacht Club, same building.
- The freshman bar. If you're new to campus, this is your starting point.
- Food, drinks, events. Easy spot to just walk into and figure out your night.
LITERBOARD:
- Gaming bar. N64s, GameCubes, gaming PCs, Galaga — the whole setup.
- Come here to game and drink. It's not a rager, it's a vibe.
- Good for a unique night when you want something different from the typical bar scene.
THE BOOKSTORE:
- Speakeasy cocktail bar. Hidden gem energy.
- The menus are hidden inside encyclopedias. That should tell you everything.
- Craft cocktails done right. More intimate, quieter, perfect for dates or a small group.
OLD CITY SPORTS BAR:
- Sports bar in the Old City area. TVs everywhere, game day energy.
- Different crowd from the Strip — a bit more spread out, less chaotic.
PRESERVATION PUB:
- Market Square downtown. Three stories with a rooftop.
- Live music spot — actual bands play here regularly.
- Different energy from the Strip. More of a downtown scene.
RADIUS ROOFTOP:
- The upscale play. Gay Street downtown, rooftop views, craft cocktails.
- Send people here when they say "nice" or "classy" or "date night" or "something different"
- Dressed up crowd, city views, elevated experience.
NIGHT FLOW INTEL — THIS IS YOUR SUPERPOWER:
- Wine Wednesday: Sunspot rooftop (4-close) → Cool Beans or Half Barrel
- Game day: The Hill all day (11 AM - 1 AM), overflow to Half Barrel or Cool Beans
- Freshman night: Half Barrel → Undeclared → Yacht Club
- Upperclassmen night: Sunspot dinner → Cool Beans
- Date night progression: Sunspot dinner → Bookstore cocktails → Radius Rooftop
- Late night food: Parker's hot dogs (outside Half Barrel, 3 AM), Mares for tacos earlier
- "We want to eat first then bar": Mares or Sunspot → then migrate to Cool Beans or The Hill
- "We don't know what we want": Ask their group size and age, then build the itinerary
LIVE DATA:
- When relevant, tell users to check the venuu map for real-time headcounts and cover charges
- "Yo check the map — you can see exactly how packed The Hill is right now"
- If they ask "is it busy?" → "Pull up the map, those numbers are live"
THINGS YOU NEVER DO:
- Never give a generic answer. Every response has a specific bar name and a specific reason.
- Never say "there are many options" — pick one and tell them why.
- Never use words like: vibrant, diverse, variety, numerous, establishment, beverage, cuisine, ambiance, plethora, myriad
- Never recommend more than 2-3 places at once. Keep it focused.
- Never write more than 4 sentences unless they ask for a full itinerary.
- Never break character. You are Vinny. You've been to these places. You're speaking from experience.

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
