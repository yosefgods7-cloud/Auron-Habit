import { useState } from 'react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { callGemini } from '../lib/gemini';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function Intel() {
  const settings = useStore(state => state.settings);
  const longestStreak = useStore(state => state.meta.longestStreak);
  const [activeSubTab, setActiveSubTab] = useState<'metrics'|'dna'|'triggers'|'challenges'>('metrics');

  return (
    <div className="p-4 md:p-6 flex flex-col h-full max-w-4xl mx-auto w-full">
       <div className="flex justify-between items-center mb-6 border-b border-app-border pb-4">
         <h2 className="text-xl md:text-2xl font-bold tracking-tighter uppercase text-app-text-main">Intel & Strategy</h2>
         <div className="flex bg-app-surface border border-app-border rounded overflow-hidden">
           {['metrics', 'dna', 'triggers', 'challenges'].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveSubTab(tab as any)}
               className={cn("px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase", activeSubTab === tab ? "bg-app-primary text-white" : "text-app-text-muted hover:bg-app-elevated")}
             >
               {tab}
             </button>
           ))}
         </div>
       </div>

       {activeSubTab === 'metrics' && <AnalyticsDashboard />}
       {activeSubTab === 'dna' && <DnaView longestStreak={longestStreak} />}
       {activeSubTab === 'triggers' && <TriggersView />}
       {activeSubTab === 'challenges' && <ChallengesView />}
    </div>
  )
}

function ChallengesView() {
  const challenges = useStore(state => state.challenges) || [];
  const startChallenge = useStore(state => state.startChallenge);
  const progressChallenge = useStore(state => state.progressChallenge);

  return (
    <div className="space-y-6">
      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#FFC107] mb-2">Tactical Challenges</h3>
        <p className="text-xs text-app-text-muted mb-6">Opt-in to time-bound, intense protocols to earn badges.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(challenge => {
            const isActive = challenge.startDate !== null && !challenge.completed;
            const progressPct = (challenge.progressDays / challenge.durationDays) * 100;

            return (
              <div key={challenge.id} className="border border-app-border rounded-lg bg-app-elevated p-4 flex flex-col justify-between group relative overflow-hidden">
                {challenge.completed && (
                  <div className="absolute inset-0 bg-app-success bg-opacity-10 z-0 pointer-events-none"></div>
                )}
                <div className="z-10">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{challenge.icon}</span>
                      <h4 className="font-bold text-sm text-app-text-main">{challenge.name}</h4>
                    </div>
                    {challenge.completed && <span className="text-[#FFC107] text-xl" title={challenge.rewardBadge}>🏅</span>}
                  </div>
                  <p className="text-xs text-app-text-muted mb-4 h-8">{challenge.description}</p>
                </div>

                <div className="z-10 mt-auto">
                  {!challenge.startDate && !challenge.completed ? (
                    <button 
                      onClick={() => startChallenge(challenge.id)}
                      className="w-full py-2 bg-app-primary text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-opacity-90"
                    >
                      Accept Protocol
                    </button>
                  ) : isActive ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-app-text-muted">
                        <span>Progress</span>
                        <span>{challenge.progressDays} / {challenge.durationDays} Days</span>
                      </div>
                      <div className="w-full h-1.5 bg-app-border rounded-full overflow-hidden">
                        <div className="h-full bg-[#FFC107] transition-all" style={{ width: `${progressPct}%` }}></div>
                      </div>
                      <button 
                        onClick={() => progressChallenge(challenge.id)}
                        className="w-full py-2 bg-[#FFC107] text-black text-xs font-bold rounded uppercase tracking-wider hover:bg-opacity-90"
                      >
                        Log Daily Rep
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-2 border border-app-success text-app-success text-center text-xs font-bold rounded uppercase tracking-wider">
                      Protocol Mastered
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



function DnaView({ longestStreak }: { longestStreak: number }) {
  const [dnaResult, setDnaResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const habits = useStore(state => state.habits);
  const logs = useStore(state => state.logs);

  const isUnlocked = longestStreak >= 30;

  const handleRunProfiler = async () => {
    if (!isUnlocked) return;
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsLoading(true);
    try {
      const activeHabits = habits.filter(h => !h.archived);
      let contextStr = "Habits and performance:\n";
      for (const h of activeHabits) {
        const habitLogs = logs.filter(l => l.habitId === h.id);
        const totalDone = habitLogs.filter(l => l.completed).length;
        contextStr += `- ${h.name} (Diff: ${h.difficulty}, Total Completed: ${totalDone})\n`;
      }

      const prompt = `Based on this habit history, identify the user's "Behavioral Archetype".
Data: ${contextStr}

Assign one of these types: "SPRINTER", "STEADY BUILDER", "ALL-OR-NOTHING", or "MOMENTUM RIDER".
Then provide exactly 3 bullet points of targeted advice for optimizing their cues, rewards, and friction based on their type.

Format exactly as:
ARCHETYPE: [Name]
- Cue: [Advice]
- Reward: [Advice]
- Friction: [Advice]

Max 80 words. Speak like an elite coach.`;

      const res = await callGemini(prompt, 200, 'dna_profile', true);
      setDnaResult(res);
    } catch (e: any) {
      alert(e.message || "DNA profiling failed");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="bg-app-surface border border-app-border rounded-xl p-8 text-center flex flex-col items-center justify-center">
        <span className="text-4xl mb-4 grayscale">🧬</span>
        <h3 className="text-lg font-bold mb-2 text-app-text-muted">Habit DNA Profiler Locked</h3>
        <p className="text-sm text-app-text-muted">Hit a 30-day streak on any habit to unlock your behavioral archetype and optimize your systems.</p>
        <p className="text-2xl font-mono text-white mt-4">{longestStreak} / 30</p>
      </div>
    );
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-app-primary mb-4">Habit DNA Profiler</h3>
      {!dnaResult ? (
        <div className="text-center py-6">
          <p className="text-app-text-main text-sm mb-6">Analyzing your long-term success patterns to determine your behavioral archetype.</p>
          <button 
            onClick={handleRunProfiler}
            disabled={isLoading}
            className="px-6 py-3 bg-app-primary text-white font-bold rounded"
          >
            {isLoading ? "Sequencing DNA..." : "Sequence Habit DNA"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text-main">{dnaResult}</p>
        </div>
      )}
    </div>
  );
}

function TriggersView() {
  const [failures, setFailures] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMap = async () => {
    if (!failures) return;
    const key = process.env.GEMINI_API_KEY || useStore.getState().settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `User's stated failure points/triggers: "${failures}"
      
Build an If/Then Trigger Map. For each failure point, map out an exact "If [Trigger], Then [Minimal Recovery Action]" protocol.
      
Format exactly like this, using bullet points for each pair:
- **IF**: [Trigger]
- **THEN MICO-ACTION**: [A strictly 2-minute or less recovery action]

The micro-action must be incredibly specific and effortless to start. No vague advice. Max 100 words.`;

      const res = await callGemini(prompt, 200, 'trigger_map', true);
      setResult(res);
    } catch(e: any) {
      alert(e.message || "Failed to generate triggers");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-app-info mb-4">Trigger & Cue Mapper</h3>
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-app-text-muted">What usually knocks you off track? (List 1-2 major failure points)</p>
          <textarea 
            value={failures}
            onChange={e => setFailures(e.target.value)}
            className="w-full bg-app-elevated border border-app-border rounded p-3 text-white outline-none focus:border-app-info resize-none h-24"
            placeholder="e.g. Rough day at work makes me skip the gym. Poor sleep makes me skip deep work."
          />
          <button 
            onClick={handleMap}
            disabled={isLoading || !failures}
            className="w-full py-3 bg-app-info text-black font-bold rounded"
          >
            {isLoading ? "Mapping Protocols..." : "Generate Recovery Protocols"}
          </button>
        </div>
      ) : (
         <div className="space-y-4">
           <div className="p-4 bg-app-elevated rounded border border-app-info/30">
               <h4 className="text-[10px] font-bold uppercase text-app-info mb-2">Your If/Then Protocols</h4>
               <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text-main">{result}</p>
           </div>
           <button onClick={() => setResult(null)} className="text-xs text-app-text-muted uppercase underline">Map New Triggers</button>
         </div>
      )}
    </div>
  );
}
