import { useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';

export function Mindset() {
  const { daily, settings, updateDaily, growth, addGrowthLog, meta } = useStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const safeDaily = daily || {};
  const todayData = safeDaily[today] || {};

  const [reflectionText, setReflectionText] = useState(todayData.intention || '');
  const [aiStoicInsight, setAiStoicInsight] = useState<string | null>(todayData.stoicResponse || null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const [isCheckInMode, setIsCheckInMode] = useState(!todayData.mood);

  // For mindset pattern analyzer
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const [gapReport, setGapReport] = useState<string | null>(null);
  const [isGapLoading, setIsGapLoading] = useState(false);

  const [isLetterLoading, setIsLetterLoading] = useState(false);

  const currentWeek = format(new Date(), 'w');
  const cacheKey = `hardq_${currentWeek}`;
  const hardQuestion = useStore.getState().aiCache['ai_' + cacheKey]?.text;

  const STOIC_PROMPT = "What obstacle stands in my way today, and how can I turn it into the way forward?";

  const handleSaveReflection = () => {
    updateDaily(today, { intention: reflectionText });
  };

  const handleGetInsight = async () => {
    if (!reflectionText.trim() || aiStoicInsight) return;
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsInsightLoading(true);
    try {
      const text = await callGemini(
        `Stoic prompt: '${STOIC_PROMPT}'\nUser's reflection: '${reflectionText}'\nAs a Stoic philosopher-coach, respond to their reflection in 3-4 sentences. Validate what's deep in their thinking. Push back on any avoidance or rationalization you detect. Connect it to their actual habit performance. Reference Marcus Aurelius or Epictetus if relevant. Speak directly to them by name. Max 80 words.`,
        200,
        `stoic_${today}`
      );
      setAiStoicInsight(text);
      updateDaily(today, { stoicResponse: text });
    } catch (err) {
      console.error(err);
    } finally {
      setIsInsightLoading(false);
    }
  };

  const handleAnalyzePattern = async () => {
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsAnalysisLoading(true);
    try {
      const text = await callGemini(
        `Review the user's logged mood, forge score, and habit metrics. Then write an intensive psychological breakdown in 3 specific bullet points:
- What emotional or mindset dimension is consistently dragging them down, and what it signals.
- A hard, undeniable correlation you see between their mood logging and their habit skips/completion rates.
- ONE highly specific psychological or behavioral practice they must do today to break this specific trap.
Use intense, clinical, behavioral psychology language. Do not output vague affirmations.`,
        300,
        `mindset_${today}`
      );
      setAiAnalysis(text);
    } catch (err: any) {
      alert(err.message || "Failed to analyze pattern");
      console.error(err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleGapReport = async () => {
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsGapLoading(true);
    try {
       const text = await callGemini(`IDENTITY GAP REPORT
Identity Statement: "${settings.identityStatement}"
Level: ${meta.level}
Current Streak: ${meta.currentStreak}

Analyze if their actual progress matches their stated identity.
Provide:
1. EARNED IDENTITY: Based ONLY on their recent actions, what is their actual identity? (1 short sentence)
2. THE GAP: Where does their behavior fall short of their stated identity? (2 sentences, brutal honesty)
3. THE BRIDGE: One 30-day challenge to close the gap. (1 sentence)

Format clearly. Max 100 words.`, 250, `gap_${format(new Date(), 'yyyy-MM')}`, true);
       setGapReport(text);
    } catch(e: any) {
      alert(e.message || "Failed to generate report");
      console.error(e);
    } finally {
      setIsGapLoading(false);
    }
  };

  const handleAccountabilityLetter = async () => {
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsLetterLoading(true);
    try {
      const text = await callGemini(`Write 2 short letters from the user's Future Self (6 months from now).

Letter 1: THE BUILT PATH (If they maintain their current good habits)
Letter 2: THE DRIFTED PATH (If they succumb to their current weaknesses/skips)

Write from the first-person perspective ("I am you..."). Make them visceral and vivid. Max 80 words per letter. Separate them with '---'.`, 350, null, true);
      
      addGrowthLog({
         type: 'win', // Or add a specific 'letter' type if supported by GrowthLog rendering
         text: `THE ACCOUNTABILITY LETTER\n\n${text}`
      });
      alert('Accountability Letter added to your Growth Logs.');
    } catch (e) {
      console.error(e);
      alert('Failed to generate letter.');
    } finally {
      setIsLetterLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-32 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tighter uppercase text-app-primary">Mindset Module</h2>
      </div>

      <section className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold uppercase tracking-widest text-app-text-muted">Daily Stoic Challenge</span>
        </div>
        <h3 className="text-lg md:text-xl font-bold italic">"{STOIC_PROMPT}"</h3>
        
        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="Reflect here..."
          className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary min-h-[100px] resize-none"
        />
        
        <div className="flex justify-between items-center gap-4">
           <button 
             onClick={handleSaveReflection}
             className="px-6 py-2 bg-app-border text-white font-bold rounded hover:bg-app-border transition-colors"
           >
             Save Entry
           </button>

           {reflectionText.length > 5 && !aiStoicInsight && (
             <button 
               onClick={handleGetInsight}
               disabled={isInsightLoading}
               className="text-xs font-bold uppercase tracking-widest text-app-primary border border-app-primary border-opacity-50 px-3 py-2 rounded hover:bg-app-primary hover:bg-opacity-10 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
               <span>✦</span> {isInsightLoading ? 'Philosophizing...' : 'Get AI Insight'}
             </button>
           )}
        </div>

        {aiStoicInsight && (
          <div className="mt-4 pt-4 border-t border-app-border animate-fade-in">
             <div className="flex items-center mb-2 gap-2">
               <span className="text-[10px] font-bold text-app-primary uppercase tracking-wider">✦ Gemini Responds</span>
             </div>
             <p className="text-sm text-app-text-main leading-relaxed relative border-l-2 border-app-primary pl-3">
               {aiStoicInsight}
             </p>
          </div>
        )}
      </section>

      <section className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6">
         <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-app-text-muted">Mindset Check-In</h3>
               {!isCheckInMode && (
                 <button 
                   onClick={handleAnalyzePattern}
                   disabled={isAnalysisLoading}
                   className="text-[10px] font-bold uppercase tracking-widest text-app-info border border-app-info border-opacity-50 px-2 py-1 rounded hover:bg-app-info hover:bg-opacity-10 transition-colors flex items-center gap-1 disabled:opacity-50"
                 >
                   <span>✦</span> Analyze My Pattern
                 </button>
               )}
            </div>

            {isCheckInMode ? (
               <div className="space-y-4">
                  <p className="text-sm">How is your energy today?</p>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button 
                        key={v}
                        onClick={() => {
                          updateDaily(today, { mood: v });
                          setIsCheckInMode(false);
                        }}
                        className="flex-1 py-3 bg-app-elevated border border-app-border rounded font-bold hover:border-app-primary"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
               </div>
            ) : (
               <div>
                  <div className="flex items-center justify-between mb-4 bg-app-elevated p-4 rounded">
                     <span className="text-xs uppercase text-app-text-muted font-bold">Today's Energy Score</span>
                     <span className="text-xl font-bold text-app-success">{todayData.mood}/5</span>
                  </div>
                  
                  {isAnalysisLoading && (
                    <p className="text-xs text-app-text-muted animate-pulse">✦ Analyzing pattern...</p>
                  )}
                  {aiAnalysis && (
                    <div className="mt-4 border-t border-app-border pt-4 animate-fade-in">
                       <h4 className="text-[10px] font-bold uppercase text-app-info mb-2 flex items-center gap-1">
                          <span>✦</span> AI Pattern Analysis
                       </h4>
                       <div className="text-sm text-app-text-main leading-relaxed whitespace-pre-wrap pl-2 border-l border-app-info border-opacity-30">
                         {aiAnalysis}
                       </div>
                    </div>
                  )}
               </div>
            )}
         </div>
      </section>

      {true && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-app-success mb-4 flex justify-between items-center">
              Identity Gap Report
            </h3>
            
            {!gapReport ? (
              <div className="text-center py-4">
                <p className="text-xs text-app-text-muted mb-4">Compare your stated identity against your actual habits.</p>
                <button 
                  onClick={handleGapReport} disabled={isGapLoading}
                  className="px-4 py-2 bg-app-elevated text-white border border-app-border text-xs font-bold uppercase rounded hover:border-app-success"
                >
                  {isGapLoading ? "Running Report..." : "Run Monthly Report"}
                </button>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-app-text-main bg-app-elevated p-4 rounded border-l-2 border-app-success">
                {gapReport}
              </div>
            )}
          </section>

          <section className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-app-danger mb-2 flex justify-between items-center">
                 The Accountability Letter
              </h3>
              <p className="text-sm text-app-text-muted mb-4 leading-relaxed">
                 Generate two vivid letters from your future self. Saves to Growth Logs.
              </p>
            </div>
            <button 
              onClick={handleAccountabilityLetter} disabled={isLetterLoading}
              className="w-full py-3 bg-app-danger/10 text-app-danger border border-app-danger/30 text-xs font-bold uppercase rounded hover:bg-app-danger/20 transition-colors mt-auto"
            >
              {isLetterLoading ? "Writing Letters..." : "Generate Future Letters"}
            </button>
          </section>
        </div>
      )}

      {hardQuestion && (
        <section className="bg-app-orange/10 border border-app-orange/30 rounded-xl p-4 md:p-6 mb-8">
           <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-orange mb-2">This Week's Hard Question</h3>
           <p className="text-sm md:text-base font-serif italic text-app-text-main leading-relaxed">{hardQuestion}</p>
        </section>
      )}
    </div>
  )
}
