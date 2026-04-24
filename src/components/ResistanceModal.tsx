import { useState } from 'react';
import { useStore } from '../lib/store';
import { callGemini } from '../lib/gemini';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function ResistanceModal({ habitId, onClose }: { habitId: string, onClose: () => void }) {
  const habits = useStore(state => state.habits);
  const skipHabit = useStore(state => state.skipHabit);
  const toggleLog = useStore(state => state.toggleLog);
  const habit = habits.find(h => h.id === habitId);
  
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<'GENUINE' | 'RESISTANCE' | null>(null);

  if (!habit) return null;

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleReasonSelect = (r: string) => {
    if (r !== 'Other') {
      setReason(r);
    } else {
      setReason('Other');
    }
  };

  const submitReason = async () => {
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) return;
    
    setIsClassifying(true);
    try {
      const prompt = `Habit: '${habit.name}' | Difficulty: ${habit.difficulty}/5
User wants to skip. Reason given: '${finalReason}'

Classify this as: GENUINE (real constraints like sickness/emergency) or RESISTANCE (avoidance/excuse).

If GENUINE: Give 1 sentence of permission.
If RESISTANCE: Name the resistance directly in 1 sharp sentence. Then offer the absolute minimum viable version of this habit (e.g. 'Just 2 minutes.'). 

Output EXACTLY this format, nothing else:
CLASSIFICATION: [GENUINE or RESISTANCE]
RESPONSE: [Your 1-2 sentence response. Max 40 words.]`;

      const res = await callGemini(prompt, 120, null, true); // No cache
      
      const isGenuine = res.includes('CLASSIFICATION: GENUINE');
      setClassification(isGenuine ? 'GENUINE' : 'RESISTANCE');
      setAiResponse(res.replace(/CLASSIFICATION:.*?\n/i, '').replace(/RESPONSE:/i, '').trim());
      
    } catch (e) {
      console.error(e);
      // Fallback
      setClassification('RESISTANCE');
      setAiResponse("Unable to connect to coach. Will you push through, or skip?");
    } finally {
      setIsClassifying(false);
    }
  };

  const finalReason = reason === 'Other' ? customReason : reason;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex flex-col justify-end">
      <div className="bg-app-surface rounded-t-2xl p-6 border-t border-app-border animate-slide-down" style={{ animationDirection: 'normal', animationFillMode: 'forwards', animationName: 'slideUp' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Skip "{habit.name}"?</h2>
          <button onClick={onClose} className="text-app-text-muted text-2xl px-2">&times;</button>
        </div>

        {!aiResponse ? (
          <div className="space-y-4">
            <p className="text-sm text-app-text-muted">Why do you want to skip?</p>
            <div className="grid grid-cols-2 gap-2">
              {['Too tired', 'No time', "Just don't feel like it", 'Genuinely sick/injured', 'Other'].map(r => (
                <button
                  key={r}
                  onClick={() => handleReasonSelect(r)}
                  className={cn("p-3 rounded text-sm text-left border", 
                    reason === r ? "bg-app-primary border-white text-white" : "bg-app-elevated border-app-border text-app-text-main"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            
            {reason === 'Other' && (
              <input 
                autoFocus
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full bg-app-elevated border border-app-border rounded p-3 mt-2 text-white outline-none focus:border-app-primary"
              />
            )}

            <button 
              onClick={submitReason}
              disabled={isClassifying || !finalReason}
              className="w-full py-3 bg-app-border text-white font-bold rounded mt-4 disabled:opacity-50"
            >
              {isClassifying ? "Consulting AI Coach..." : "Continue"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={cn("p-4 rounded border-l-4", classification === 'GENUINE' ? "bg-app-success/10 border-app-success" : "bg-app-orange/10 border-app-orange")}>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", classification === 'GENUINE' ? "text-app-success" : "text-app-orange")}>
                {classification}
              </span>
              <p className="text-sm mt-2 leading-relaxed">{aiResponse}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  onClose();
                }}
                className="w-full py-3 bg-app-primary text-white font-bold rounded"
              >
                I'll Do the Full Protocol
              </button>
              
              {classification === 'RESISTANCE' && habit.nanoGoal && (
                 <button 
                   onClick={() => {
                     // Log as completed with note showing it was Nano
                     toggleLog(habit.id, today, Math.floor(habit.difficulty * 5), `Done as Nano Goal: ${habit.nanoGoal}`);
                     onClose();
                   }}
                   className="w-full py-3 bg-app-orange text-black font-bold rounded"
                 >
                   Do Nano-Goal: {habit.nanoGoal}
                 </button>
              )}

              <button 
                onClick={() => {
                  skipHabit(habit.id, today, finalReason);
                  onClose();
                }}
                className="w-full py-3 bg-transparent border border-app-border text-app-text-muted hover:text-app-danger font-bold rounded"
              >
                Skip Entirely
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
