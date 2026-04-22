import { useState } from 'react';
import { useStore } from '../lib/store';
import { format, subDays, differenceInDays } from 'date-fns';
import { callGemini } from '../lib/gemini';
import { cn } from '../lib/utils';
import { AutopsyModal } from './AutopsyModal';

interface HabitsProps {
  onEditHabit?: (id: string) => void;
}

export function Habits({ onEditHabit }: HabitsProps) {
  const habits = useStore(state => state.habits);
  const settings = useStore(state => state.settings);
  const archiveHabit = useStore(state => state.archiveHabit);
  const updateHabit = useStore(state => state.updateHabit);
  const logs = useStore(state => state.logs);
  
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachAnalysis, setCoachAnalysis] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  
  const [autopsyModalId, setAutopsyModalId] = useState<string | null>(null);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);

  const activeHabits = habits.filter(h => !h.archived);
  
  const checkHabitStatus = (habitId: string, createdAt: string) => {
     const createdDate = new Date(createdAt);
     const daysSinceCreation = differenceInDays(new Date(), createdDate);
     
     // Need at least 7 days to run an autopsy, but checking last 14 days
     const daysToCheck = Math.min(daysSinceCreation + 1, 14);
     if (daysToCheck < 5) return { needsAutopsy: false, suggestLevelUp: false };
     
     const lastDays = Array.from({ length: daysToCheck }).map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
     const habitLogs = logs.filter(l => l.habitId === habitId && lastDays.includes(l.date));
     const doneCount = habitLogs.filter(l => l.completed).length;
     const completionRate = doneCount / daysToCheck;
     
     let currentStreakLine = 0;
     for (let i = 0; i < daysToCheck; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        if (logs.find(l => l.habitId === habitId && l.date === d && l.completed)) {
          currentStreakLine++;
        } else {
          break;
        }
     }

     return {
       needsAutopsy: completionRate < 0.4,
       suggestLevelUp: currentStreakLine >= 14
     };
  };

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
        <h2 className="text-xl font-bold tracking-tighter uppercase text-app-primary">Habits Protocol</h2>
        <div className="flex items-center gap-3">
          {activeHabits.length > 0 && (
            <button 
              onClick={handleAskCoach}
              className="text-[10px] font-bold uppercase tracking-widest text-app-primary border border-app-primary border-opacity-50 px-2 py-1 rounded hover:bg-app-primary hover:bg-opacity-10 transition-colors flex items-center gap-1"
            >
              <span>✦</span> Ask Coach
            </button>
          )}
          <span className="text-app-text-muted text-xs font-bold uppercase">{activeHabits.length} ACTIVE</span>
        </div>
      </div>

      {activeHabits.length === 0 ? (
        <div className="bg-app-surface border border-app-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-4">⚡</span>
          <h3 className="text-lg font-bold mb-2">Build Your Protocol</h3>
          <p className="text-app-text-muted text-sm">Add habits using the + button below to start forging your identity.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeHabits.map((habit) => {
            const { needsAutopsy, suggestLevelUp } = checkHabitStatus(habit.id, habit.createdAt);
            
            return (
              <div key={habit.id} className="bg-app-surface border border-app-border rounded-xl p-4 relative overflow-hidden transition-colors">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedHabitId(expandedHabitId === habit.id ? null : habit.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-app-border flex items-center justify-center text-lg bg-app-elevated">
                      {habit.icon}
                    </div>
                    <div>
                      <h4 className="font-bold flex items-center gap-2">
                        {habit.name}
                        {habit.alarmEnabled && <span className="text-app-info text-xs">⏰ {habit.reminderTime}</span>}
                      </h4>
                      <p className="text-xs text-app-text-muted uppercase tracking-wider">{habit.category} • {habit.timeslot}</p>
                    </div>
                  </div>
                  <div className="text-app-text-muted text-xs">
                    {expandedHabitId === habit.id ? '▲' : '▼'}
                  </div>
                </div>
                
                {habit.description && (
                  <p className="text-xs text-app-text-muted mt-3 mb-2 line-clamp-2">{habit.description}</p>
                )}

                {expandedHabitId === habit.id && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-app-border bg-app-elevated -mx-4 -mb-4 px-4 py-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditHabit?.(habit.id); setExpandedHabitId(null); }}
                      className="flex-1 flex flex-col items-center justify-center py-2 text-app-text-muted hover:text-app-info transition-colors"
                      title="Edit Habit"
                    >
                      <span className="text-lg mb-1">✎</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); useStore.getState().duplicateHabit(habit.id); setExpandedHabitId(null); }}
                      className="flex-1 flex flex-col items-center justify-center py-2 text-app-text-muted hover:text-app-primary transition-colors"
                      title="Duplicate Habit"
                    >
                      <span className="text-lg mb-1">⧉</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Duplicate</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Archive this habit? It keeps historical data.')) {
                          archiveHabit(habit.id);
                        }
                      }}
                      className="flex-1 flex flex-col items-center justify-center py-2 text-app-text-muted hover:text-app-orange transition-colors"
                      title="Archive Habit"
                    >
                      <span className="text-lg mb-1">📦</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Archive</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this habit AND all its history forever?')) {
                          useStore.getState().deleteHabit(habit.id);
                        }
                      }}
                      className="flex-1 flex flex-col items-center justify-center py-2 text-app-text-muted hover:text-app-danger transition-colors"
                      title="Delete Habit"
                    >
                      <span className="text-lg mb-1 leading-none">✕</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Delete</span>
                    </button>
                  </div>
                )}
                
                {(needsAutopsy || suggestLevelUp) && (
                  <div className="mt-3 pt-3 border-t border-app-border flex gap-2">
                    {needsAutopsy && (
                       <button 
                         onClick={() => setAutopsyModalId(habit.id)}
                         className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-app-danger/10 text-app-danger border border-app-danger/30 rounded hover:bg-app-danger/20 transition-colors"
                       >
                         ⚠️ Autopsy Required
                       </button>
                    )}
                    {suggestLevelUp && habit.difficulty < 5 && (
                       <button 
                         onClick={() => {
                           if(confirm(`Level up ${habit.name} difficulty to ${habit.difficulty + 1}?`)) {
                              updateHabit(habit.id, { difficulty: habit.difficulty + 1 });
                           }
                         }}
                         className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-app-success/10 text-app-success border border-app-success/30 rounded hover:bg-app-success/20 transition-colors"
                       >
                         ↑ Ready for Level Up
                       </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isCoachOpen && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-app-bg border border-app-primary rounded-xl w-full max-w-md p-6 relative">
            <div className="flex justify-between items-center mb-6 border-b border-app-border pb-4">
              <h2 className="text-xl font-bold uppercase flex items-center gap-2">
                <span className="text-app-primary">✦</span> AI Coach
              </h2>
              <button onClick={() => setIsCoachOpen(false)} className="text-app-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="min-h-[150px] flex flex-col justify-center">
              {isCoachLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="text-3xl animate-bounce">🤖</div>
                  <p className="text-sm font-bold text-app-primary uppercase tracking-widest animate-pulse">Analyzing Pattern...</p>
                </div>
              ) : (
                <div className="space-y-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {coachAnalysis}
                </div>
              )}
            </div>
            
            {!isCoachLoading && coachAnalysis && (
              <div className="mt-6 pt-4 border-t border-app-border flex gap-2">
                 <button 
                   onClick={() => {
                     setCoachAnalysis(null);
                     handleAskCoach();
                   }}
                   className="flex-1 py-2 text-xs font-bold uppercase border border-app-border rounded hover:bg-app-elevated transition-colors text-app-text-muted"
                 >
                   Regenerate (1 Req)
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {autopsyModalId && <AutopsyModal habitId={autopsyModalId} onClose={() => setAutopsyModalId(null)} />}
    </div>
  )
}

