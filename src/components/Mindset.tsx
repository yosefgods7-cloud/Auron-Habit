import { useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';

export function Mindset() {
  const { daily, settings, updateDaily } = useStore();
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

  const STOIC_PROMPT = "What obstacle stands in my way today, and how can I turn it into the way forward?";

  const handleSaveReflection = () => {
    updateDaily(today, { intention: reflectionText });
  };

  const handleGetInsight = async () => {
    if (!reflectionText.trim() || aiStoicInsight) return;
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
    setIsAnalysisLoading(true);
    try {
      const text = await callGemini(
        `Analyze the pattern in 3 bullet points:
• What mindset dimension is consistently weakest and what it signals
• A correlation between their mindset scores and habit performance
• One specific practice to target their lowest dimension
Max 20 words per bullet. Be precise and direct.`,
        250,
        `mindset_${today}`
      );
      setAiAnalysis(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-32 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tighter uppercase text-[#7c6aff]">Mindset Module</h2>
      </div>

      <section className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold uppercase tracking-widest text-[#7a7a9a]">Daily Stoic Challenge</span>
        </div>
        <h3 className="text-lg md:text-xl font-bold italic">"{STOIC_PROMPT}"</h3>
        
        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="Reflect here..."
          className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff] min-h-[100px] resize-none"
        />
        
        <div className="flex justify-between items-center gap-4">
           <button 
             onClick={handleSaveReflection}
             className="px-6 py-2 bg-[#2a2a3a] text-white font-bold rounded hover:bg-[#3a3a4a] transition-colors"
           >
             Save Entry
           </button>

           {settings.geminiKey && reflectionText.length > 5 && !aiStoicInsight && (
             <button 
               onClick={handleGetInsight}
               disabled={isInsightLoading}
               className="text-xs font-bold uppercase tracking-widest text-[#7c6aff] border border-[#7c6aff] border-opacity-50 px-3 py-2 rounded hover:bg-[#7c6aff] hover:bg-opacity-10 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
               <span>✦</span> {isInsightLoading ? 'Philosophizing...' : 'Get AI Insight'}
             </button>
           )}
        </div>

        {aiStoicInsight && (
          <div className="mt-4 pt-4 border-t border-[#2a2a3a] animate-fade-in">
             <div className="flex items-center mb-2 gap-2">
               <span className="text-[10px] font-bold text-[#7c6aff] uppercase tracking-wider">✦ Gemini Responds</span>
             </div>
             <p className="text-sm text-[#e8e8f0] leading-relaxed relative border-l-2 border-[#7c6aff] pl-3">
               {aiStoicInsight}
             </p>
          </div>
        )}
      </section>

      <section className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 md:p-6">
         <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#7a7a9a]">Mindset Check-In</h3>
               {settings.geminiKey && !isCheckInMode && (
                 <button 
                   onClick={handleAnalyzePattern}
                   disabled={isAnalysisLoading}
                   className="text-[10px] font-bold uppercase tracking-widest text-[#00d4ff] border border-[#00d4ff] border-opacity-50 px-2 py-1 rounded hover:bg-[#00d4ff] hover:bg-opacity-10 transition-colors flex items-center gap-1 disabled:opacity-50"
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
                        className="flex-1 py-3 bg-[#1c1c27] border border-[#2a2a3a] rounded font-bold hover:border-[#7c6aff]"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
               </div>
            ) : (
               <div>
                  <div className="flex items-center justify-between mb-4 bg-[#1c1c27] p-4 rounded">
                     <span className="text-xs uppercase text-[#7a7a9a] font-bold">Today's Energy Score</span>
                     <span className="text-xl font-bold text-[#22d37a]">{todayData.mood}/5</span>
                  </div>
                  
                  {isAnalysisLoading && (
                    <p className="text-xs text-[#7a7a9a] animate-pulse">✦ Analyzing pattern...</p>
                  )}
                  {aiAnalysis && (
                    <div className="mt-4 border-t border-[#2a2a3a] pt-4 animate-fade-in">
                       <h4 className="text-[10px] font-bold uppercase text-[#00d4ff] mb-2 flex items-center gap-1">
                          <span>✦</span> AI Pattern Analysis
                       </h4>
                       <div className="text-sm text-[#e8e8f0] leading-relaxed whitespace-pre-wrap pl-2 border-l border-[#00d4ff] border-opacity-30">
                         {aiAnalysis}
                       </div>
                    </div>
                  )}
               </div>
            )}
         </div>
      </section>
    </div>
  )
}
