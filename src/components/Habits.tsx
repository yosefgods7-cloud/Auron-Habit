import { useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';

export function Habits() {
  const habits = useStore(state => state.habits);
  const settings = useStore(state => state.settings);
  const archiveHabit = useStore(state => state.archiveHabit);
  
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachAnalysis, setCoachAnalysis] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  const activeHabits = habits.filter(h => !h.archived);

  const handleAskCoach = async () => {
    setIsCoachOpen(true);
    if (coachAnalysis) return; // Already loaded

    setIsCoachLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const text = await callGemini(
        `You are AURON's habit coach. Analyze this warrior's habit data and give 3 specific, actionable coaching points:
1. Which habit needs the most urgent attention and why
2. One habit pattern or correlation you notice
3. One specific challenge or upgrade to try this week
Be brutally honest. Use their actual streak/completion numbers.
Format: numbered list, each point max 25 words. No intro.`,
        350,
        `coach_${today}`
      );
      setCoachAnalysis(text);
    } catch (err: any) {
      setCoachAnalysis('Error: ' + err.message);
    } finally {
      setIsCoachLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tighter uppercase text-[#7c6aff]">Habits Protocol</h2>
        <div className="flex items-center gap-3">
          {settings.geminiKey && activeHabits.length > 0 && (
            <button 
              onClick={handleAskCoach}
              className="text-[10px] font-bold uppercase tracking-widest text-[#7c6aff] border border-[#7c6aff] border-opacity-50 px-2 py-1 rounded hover:bg-[#7c6aff] hover:bg-opacity-10 transition-colors flex items-center gap-1"
            >
              <span>✦</span> Ask Coach
            </button>
          )}
          <span className="text-[#7a7a9a] text-xs font-bold uppercase">{activeHabits.length} ACTIVE</span>
        </div>
      </div>

      {activeHabits.length === 0 ? (
        <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-4">⚡</span>
          <h3 className="text-lg font-bold mb-2">Build Your Protocol</h3>
          <p className="text-[#7a7a9a] text-sm">Add habits using the + button below to start forging your identity.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeHabits.map((habit) => (
            <div key={habit.id} className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-[#2a2a3a] flex items-center justify-center text-lg bg-[#1c1c27]">
                  {habit.icon}
                </div>
                <div>
                  <h4 className="font-bold">{habit.name}</h4>
                  <p className="text-xs text-[#7a7a9a] uppercase tracking-wider">{habit.category} • {habit.timeslot}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to archive this habit?')) {
                    archiveHabit(habit.id);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded bg-[#1c1c27] border border-[#2a2a3a] text-[#ff6b6b] hover:bg-[#2a2a3a] transition-colors"
                title="Archive Habit"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {isCoachOpen && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-[#0d0d14] border border-[#7c6aff] rounded-xl w-full max-w-md p-6 relative">
            <div className="flex justify-between items-center mb-6 border-b border-[#2a2a3a] pb-4">
              <h2 className="text-xl font-bold uppercase flex items-center gap-2">
                <span className="text-[#7c6aff]">✦</span> AI Coach
              </h2>
              <button onClick={() => setIsCoachOpen(false)} className="text-[#7a7a9a] hover:text-white">✕</button>
            </div>
            
            <div className="min-h-[150px] flex flex-col justify-center">
              {isCoachLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="text-3xl animate-bounce">🤖</div>
                  <p className="text-sm font-bold text-[#7c6aff] uppercase tracking-widest animate-pulse">Analyzing Pattern...</p>
                </div>
              ) : (
                <div className="space-y-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {coachAnalysis}
                </div>
              )}
            </div>
            
            {!isCoachLoading && coachAnalysis && (
              <div className="mt-6 pt-4 border-t border-[#2a2a3a] flex gap-2">
                 <button 
                   onClick={() => {
                     setCoachAnalysis(null);
                     handleAskCoach();
                   }}
                   className="flex-1 py-2 text-xs font-bold uppercase border border-[#2a2a3a] rounded hover:bg-[#1c1c27] transition-colors text-[#7a7a9a]"
                 >
                   Regenerate (1 Req)
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

