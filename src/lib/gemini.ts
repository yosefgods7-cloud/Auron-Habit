import { format, subDays } from 'date-fns';
import { useStore } from './store';

const QUEUE_DELAY_MS = 500;
let lastRequestTime = 0;

async function waitForQueue() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < QUEUE_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

function isCacheExpired(featureKey: string, timestamp: number) {
  const now = Date.now();
  if (featureKey.startsWith('brief_') || featureKey.startsWith('mindset_') || featureKey.startsWith('stoic_')) {
    // Expires at midnight or 24h approximation
    return now - timestamp > 24 * 60 * 60 * 1000;
  }
  if (featureKey.startsWith('coach_')) {
    // 6 hours
    return now - timestamp > 6 * 60 * 60 * 1000;
  }
  if (featureKey.startsWith('weekly_') || featureKey.startsWith('identity_')) {
    // 7 days
    return now - timestamp > 7 * 24 * 60 * 60 * 1000;
  }
  if (featureKey.startsWith('monthly_')) {
    // 30 days
    return now - timestamp > 30 * 24 * 60 * 60 * 1000;
  }
  return true;
}

export function buildContext() {
  const state = useStore.getState();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayName = format(new Date(), 'EEEE');
  const dayData = state.daily[today] || {};
  
  const activeHabits = state.habits.filter(h => !h.archived);
  
  // Calculate rolling 7-day stats for context
  const habitsSummary = activeHabits.map(h => {
    let doneLast7 = 0;
    let streak = 0;
    
    // Quick streak calc for context
    for(let i=0; i<7; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const log = state.logs.find(l => l.habitId === h.id && l.date === d);
        if (log && log.completed) {
            doneLast7++;
            streak++;
        } else if (i === 0) {
            streak = 0;
        }
    }
    const pct = Math.round((doneLast7 / 7) * 100);
    return `${h.name}(${streak > 2 ? '🔥' : ''}${streak}d,${pct}%)`;
  }).join(', ');

  // Last 3 days overall
  const last3Days = [0, 1, 2].map(i => {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const logs = state.logs.filter(l => l.date === d && l.completed);
      return activeHabits.length ? Math.round((logs.length / activeHabits.length) * 100) + '%' : '0%';
  }).reverse().join(', ');

  return `User: ${state.settings.userName} | Identity: ${state.settings.identityStatement || 'I am forging myself'} 
Habits: ${habitsSummary || 'None'}
Today: Mood ${dayData.mood || 'N/A'}/5, Forge Score ${dayData.forgeScore || 0}, Level ${state.meta.level} 
Last 3 days: ${last3Days} | ${dayName}`;
}

export async function callGemini(prompt: string, maxTokens = 300, featureKey: string | null = null, bypassCache = false, expectJson = false) {
  try {
    const state = useStore.getState();
    const key = process.env.GEMINI_API_KEY || state.settings.geminiKey;
    if (!key) throw new Error('NO_KEY');

    const today = format(new Date(), 'yyyy-MM-dd');

    // Check cache
    if (featureKey && !bypassCache) {
      const cached = state.aiCache['ai_' + featureKey];
      if (cached && !isCacheExpired(featureKey, cached.timestamp)) {
        return cached.text;
      }
    }

    // Check quota
    const safeMeta = state.meta || {};
    const safeUsage = (safeMeta as any).geminiUsage || {};
    const usage = safeUsage[today] || { requests: 0 };
    if (usage.requests >= 60) throw new Error('QUOTA_EXCEEDED');

    await waitForQueue();

    const context = buildContext();
    const fullPrompt = context + '\n\n' + prompt;

    const generationConfig: any = {
      maxOutputTokens: maxTokens,
      temperature: 0.8,
      topP: 0.9
    };
    if (expectJson) {
      generationConfig.responseMimeType = "application/json";
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig
        })
      }
    );

    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      const retryRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig
          })
        }
      );
      if (retryRes.status === 429) throw new Error('RATE_LIMIT');
      if (retryRes.status === 400) throw new Error('INVALID_KEY');
      if (!retryRes.ok) throw new Error('API_ERROR');
      
      const retryData = await retryRes.json();
      const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!retryText) throw new Error('EMPTY_RESPONSE');
      
      const tokensIn = fullPrompt.length / 4; 
      state.trackAiUsage(today, tokensIn, maxTokens);
      if (featureKey) state.setAiCache('ai_' + featureKey, { text: retryText, timestamp: Date.now() });
      return retryText;
    }

    if (res.status === 400) throw new Error('INVALID_KEY');
    if (!res.ok) throw new Error('API_ERROR');

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('EMPTY_RESPONSE');

    const tokensIn = fullPrompt.length / 4; 
    state.trackAiUsage(today, tokensIn, maxTokens);

    if (featureKey) {
      state.setAiCache('ai_' + featureKey, { text, timestamp: Date.now() });
    }

    return text;

  } catch(e: any) {
    const msgs: Record<string, string> = {
      NO_KEY: 'Add your free Gemini key in Settings → AI',
      QUOTA_EXCEEDED: 'Daily limit reached. Resets at midnight.',
      RATE_LIMIT: 'Rate limit hit. Try in 60 seconds.',
      INVALID_KEY: 'API key rejected. Check aistudio.google.com',
      EMPTY_RESPONSE: 'Gemini returned nothing. Try again.',
    };
    throw new Error(msgs[e.message] || e.message || 'Connection error. Try again.');
  }
}
