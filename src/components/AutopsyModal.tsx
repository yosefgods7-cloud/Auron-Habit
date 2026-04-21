import { useState } from 'react';
import { useStore } from '../lib/store';
import { callGemini } from '../lib/gemini';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function AutopsyModal({ habitId, onClose }: { habitId: string, onClose: () => void }) {
  const habits = useStore(state => state.habits);
  const habit = habits.find(h => h.id === habitId);
  const [reason, setReason] = useState("");
  const [feeling, setFeeling] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  if (!habit) return null;

  const handleRun = async () => {
    if (!reason || !feeling) return;
    setIsLoading(true);
    try {
      const prompt = `HABIT AUTOPSY: '${habit.name}' (Difficulty: ${habit.difficulty}/5, Protocol: ${habit.protocol})
Completion rate < 40% over 14 days.

User says they are failing because: "${reason}"
User feels: "${feeling}"

Perform an autopsy. Output EXACTLY 3 sections:
VERDICT: (Must be exactly one of: KEEP, MODIFY, REPLACE, RETIRE)
DIAGNOSIS: (1-2 sentences on why it died. Direct, no sugar-coating, identify the root friction.)
PRESCRIPTION: (1 sentence of exact action to take today based on the verdict.)

Max 70 words total. Do not add any other formatting.`;
      
      const res = await callGemini(prompt, 150, null, true);
      setResult(res);
    } catch(e) {
      console.error(e);
      setResult("Error conducting autopsy.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex flex-col justify-end">
      <div className="bg-app-surface rounded-t-2xl p-6 border-t border-app-border animate-slide-down" style={{ animationDirection: 'normal', animationFillMode: 'forwards', animationName: 'slideUp' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold uppercase text-app-danger">Habit Autopsy</h2>
          <button onClick={onClose} className="text-app-text-muted text-2xl px-2">&times;</button>
        </div>

        {!result ? (
          <div className="space-y-4">
             <div className="bg-app-elevated p-3 rounded border border-app-border mb-6">
               <p className="text-xs text-app-text-muted uppercase tracking-wider mb-1">Subject</p>
               <p className="font-bold text-white">{habit.name}</p>
               <p className="text-[10px] text-app-orange mt-1">Status: Failing (under 40% completion)</p>
             </div>

             <p className="text-sm text-app-text-muted">Why is this habit failing?</p>
             <textarea 
               value={reason} onChange={e => setReason(e.target.value)}
               className="w-full bg-app-elevated border border-app-border rounded p-3 text-white outline-none focus:border-app-danger resize-none h-16"
               placeholder="e.g. Too exhausted after work. Takes too much setup time."
             />

             <p className="text-sm text-app-text-muted">How do you feel when you skip it?</p>
             <input 
               value={feeling} onChange={e => setFeeling(e.target.value)}
               className="w-full bg-app-elevated border border-app-border rounded p-3 text-white outline-none focus:border-app-danger"
               placeholder="e.g. Guilty, Relieved, Indifferent."
             />

             <button 
               onClick={handleRun}
               disabled={isLoading || !reason || !feeling}
               className="w-full py-3 bg-app-danger text-white font-bold rounded mt-4 disabled:opacity-50"
             >
               {isLoading ? "Conducting Autopsy..." : "Run Autopsy"}
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text-main bg-app-elevated p-4 rounded border border-app-danger">{result}</p>
            <button onClick={onClose} className="w-full py-3 bg-app-border hover:bg-app-elevated text-white font-bold rounded mt-4">Acknowledge</button>
          </div>
        )}
      </div>
    </div>
  )
}
