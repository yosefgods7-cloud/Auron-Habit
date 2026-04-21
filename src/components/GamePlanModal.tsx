import { useState } from 'react';
import { useStore } from '../lib/store';
import { callGemini } from '../lib/gemini';
import { cn } from '../lib/utils';
import { format, addDays } from 'date-fns';

export function GamePlanModal({ onClose }: { onClose: () => void }) {
  const habits = useStore(state => state.habits);
  const updateDaily = useStore(state => state.updateDaily);
  
  const [dayType, setDayType] = useState('');
  const [energy, setEnergy] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const handleGenerate = async () => {
    if (!dayType || !energy || !wakeTime) return;
    setIsLoading(true);
    try {
      const activeHabits = habits.filter(h => !h.archived);
      const habitsDetails = activeHabits.map(h => `${h.name} (slot: ${h.timeslot}, diff: ${h.difficulty}/5)`).join('\n');
      
      const prompt = `PRE-SLEEP PLANNING FOR TOMORROW
Full habit list:
${habitsDetails}

Tomorrow type: '${dayType}'
Forecasted energy: '${energy}'
Wake time: '${wakeTime}'

Build tomorrow's optimized habit execution plan:

PRIORITY ORDER: Rank all habits 1 to N for tomorrow specifically.
SCHEDULE: Assign a specific time window to the top 5 habits. Format: [TIME] — [HABIT] — [why]
SKIP LIST: Habits to consciously skip. One sentence justification per skipped habit.
TOMORROW'S INTENTION: One sentence. What winning tomorrow looks like given the constraints.

Max 150 words. Practical. Schedulable.`;

      const response = await callGemini(prompt, 250, `plan_${tomorrow}`, true);
      
      // Parse skip list heuristically
      const skipListIds: string[] = [];
      const skipSectionMatch = response.match(/SKIP LIST[:]?\s*([\s\S]*?)(?=STREAK|TOMORROW|$)/i);
      if (skipSectionMatch) {
         const skipText = skipSectionMatch[1];
         for (const h of activeHabits) {
           if (skipText.toLowerCase().includes(h.name.toLowerCase())) {
             skipListIds.push(h.name); // Storing name so it's readable
           }
         }
      }

      updateDaily(tomorrow, { 
        gamePlan: {
          text: response,
          skipList: skipListIds
        } 
      });
      onClose();
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isReady = dayType && energy && wakeTime;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex flex-col justify-end">
      <div className="bg-app-surface rounded-t-2xl p-6 border-t border-app-border animate-slide-down" style={{ animationDirection: 'normal', animationFillMode: 'forwards', animationName: 'slideUp' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Plan Tomorrow</h2>
          <button onClick={onClose} className="text-app-text-muted text-2xl px-2">&times;</button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-app-text-muted mb-2">Tomorrow Type</p>
            <div className="flex flex-wrap gap-2">
              {['Normal Day', 'Hard/Busy', 'Travel', 'Rest Day', 'Social/Event', 'WFH'].map(t => (
                <button 
                  key={t}
                  onClick={() => setDayType(t)}
                  className={cn("px-3 py-2 text-xs font-bold rounded border", dayType === t ? "bg-app-primary border-app-primary text-white" : "bg-app-elevated border-app-border")}
                >{t}</button>
              ))}
            </div>
          </div>

          <div>
             <p className="text-sm text-app-text-muted mb-2">Energy Forecast</p>
             <div className="flex gap-2">
               {['Low', 'Medium', 'High'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setEnergy(t)}
                   className={cn("flex-1 py-2 text-xs font-bold rounded border", energy === t ? "bg-app-success border-app-success text-black" : "bg-app-elevated border-app-border")}
                 >{t}</button>
               ))}
             </div>
          </div>

          <div>
             <p className="text-sm text-app-text-muted mb-2">Wake Time</p>
             <div className="flex gap-2">
               {['Earlier', 'Normal', 'Later'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setWakeTime(t)}
                   className={cn("flex-1 py-2 text-xs font-bold rounded border", wakeTime === t ? "bg-app-info border-app-info text-black" : "bg-app-elevated border-app-border")}
                 >{t}</button>
               ))}
             </div>
          </div>

          <button 
             onClick={handleGenerate}
             disabled={isLoading || !isReady}
             className="w-full py-3 mt-4 bg-app-primary text-white font-bold rounded disabled:opacity-50"
          >
             {isLoading ? "Building Plan..." : "Build My Plan"}
          </button>
        </div>
      </div>
    </div>
  )
}
