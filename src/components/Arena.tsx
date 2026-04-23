import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';
import { getMomentumData, calculateForgeScore } from '../lib/momentum';
import { ResistanceModal } from './ResistanceModal';
import { GamePlanModal } from './GamePlanModal';
import { MetricsCalendar } from './MetricsCalendar';
import { getStaticDailyQuote } from '../lib/quotes';

export function Arena() {
  const habits = useStore(state => state.habits);
  const logs = useStore(state => state.logs);
  const daily = useStore(state => state.daily) || {};
  const meta = useStore(state => state.meta);
  const toggleLog = useStore(state => state.toggleLog);
  const settings = useStore(state => state.settings);
  const updateDaily = useStore(state => state.updateDaily);
  const clearSkip = useStore(state => state.clearSkip);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter(l => l.date === today);
  const todayData = daily[today] || {};
  const todayTasks = (useStore(state => state.dailyTasks) || []).filter(t => t.date === today);
  const todayWins = (useStore(state => state.growth) || []).filter(g => g.date.startsWith(today) && g.type === 'win');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const [newWinText, setNewWinText] = useState('');
  const [isAddingWin, setIsAddingWin] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    useStore.getState().addDailyTask({ title: newTaskTitle.trim(), date: today, completed: false });
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleAddWin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinText.trim()) return;
    useStore.getState().addGrowthLog({ type: 'win', text: newWinText.trim() });
    setNewWinText('');
    setIsAddingWin(false);
  };

  const saveTaskEdit = (id: string) => {
    if (editingTaskTitle.trim()) {
      useStore.getState().updateDailyTask(id, { title: editingTaskTitle.trim() });
    }
    setEditingTaskId(null);
  };

  const [aiBrief, setAiBrief] = useState<string | null>(todayData.forgeBrief || null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isSurvivalLoading, setIsSurvivalLoading] = useState(false);
  
  const [skipHabitModal, setSkipHabitModal] = useState<string | null>(null);
  const [longPressMenu, setLongPressMenu] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const [quote, setQuote] = useState<{text: string, author: string} | null>(todayData.quote || null);

  const hour = new Date().getHours();
  const isEvening = hour >= 19;

  const handleStartPress = (id: string) => {
    (window as any).pressTimer = setTimeout(() => {
      setLongPressMenu(id);
    }, 500);
  };
  const handleCancelPress = () => {
    clearTimeout((window as any).pressTimer);
  };

const isSunday = format(new Date(), 'EEEE') === 'Sunday';
  const currentWeek = format(new Date(), 'w');
  const [hardQuestion, setHardQuestion] = useState<string | null>(null);
  const [isHardQLoading, setIsHardQLoading] = useState(false);

  const loadHardQuestion = async () => {
    if (!(process.env.GEMINI_API_KEY || settings.geminiKey) || !isSunday) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    const cacheKey = `hardq_${currentWeek}`;
    const cached = useStore.getState().aiCache['ai_' + cacheKey];
    if (cached) {
      setHardQuestion(cached.text);
      return;
    }
    
    setIsHardQLoading(true);
    try {
      const prompt = `Generate ONE genuinely uncomfortable question for this warrior.
Rules:
- Based on something SPECIFIC in their data
- A question they might be avoiding
- Not motivational or positive-framed
- Challenge an assumption or avoidance pattern
- No easy answer
- 2-3 sentences max

Output ONLY the question. No intro. No context. Max 40 words.`;
      const res = await callGemini(prompt, 120, cacheKey);
      setHardQuestion(res);
    } catch (e: any) {
      alert(e.message || "Failed to load question");
      console.error(e);
    } finally {
      setIsHardQLoading(false);
    }
  };

  const loadBrief = async () => {
    if (!(process.env.GEMINI_API_KEY || settings.geminiKey)) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    if (todayData.forgeBrief || isBriefLoading) return;
    
    setIsBriefLoading(true);
    try {
      const text = await callGemini(
        `Write a highly personalized, tactical morning brief for this warrior. Reference their actual habits, streaks, and recent forge score momentum. 
Output format:
- STATUS: (1 sentence brutal summary of their current momentum)
- STRENGTH: (1 sentence identifying their best performing habit/category)
- WEAKNESS: (1 sentence calling out exactly what routine they skip most or need to protect today)
- DIRECTIVE: (1 sharp, non-negotiable action for today).
Be direct, coach-like. No fluff. Max 100 words.`, 
        200, 
        `brief_${today}`
      );
      setAiBrief(text);
      updateDaily(today, { forgeBrief: text });
    } catch (err: any) {
      alert(err.message || "Failed to load brief");
      console.error("Failed to load brief", err);
    } finally {
      setIsBriefLoading(false);
    }
  };

  useEffect(() => {
    if (todayData.forgeBrief) {
       setAiBrief(todayData.forgeBrief);
    }
    if (isSunday) {
       const cacheKey = `hardq_${currentWeek}`;
       const cached = useStore.getState().aiCache['ai_' + cacheKey];
       if (cached) {
         setHardQuestion(cached.text);
       }
    }
  }, [todayData.forgeBrief, isSunday, currentWeek]);

  useEffect(() => {
    if (todayData.quote) {
      setQuote(todayData.quote);
      return;
    }

    let isSubscribed = true;

    const fetchQuote = async () => {
      try {
        const res = await callGemini(
          `Provide ONE incredibly powerful, discipline-focused "warrior" quote. New and rare, not cliché. Max 15 words. Output ONLY a valid JSON object with {"text": "...", "author": "..."}.`,
          100,
          `quote_${today}`,
          false,
          true // expectJson
        );
        if (!isSubscribed) return;
        let cleanStr = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = cleanStr.indexOf('{');
        const endIdx = cleanStr.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          cleanStr = cleanStr.substring(startIdx, endIdx + 1);
        }
        const parsed = JSON.parse(cleanStr);
        setQuote(parsed);
        useStore.getState().updateDaily(today, { quote: parsed });
      } catch (e) {
        if (!isSubscribed) return;
        const fallback = getStaticDailyQuote(today);
        setQuote(fallback);
        useStore.getState().updateDaily(today, { quote: fallback });
      }
    };

    fetchQuote();

    return () => {
      isSubscribed = false;
    };
  }, [today, todayData.quote, settings.geminiKey]);

  const { momentum } = getMomentumData();
  const pct = calculateForgeScore(today);

  const circumference = 2 * Math.PI * 58;
  const dashoffset = circumference - (pct / 100) * circumference;

  const currentStreak = useStore(state => state.meta.currentStreak);

  const handleSurvivalMode = async () => {
    if (todayData.survivalMode) {
      updateDaily(today, { survivalMode: false, survivalHabits: [] });
      return;
    }
    
    setIsSurvivalLoading(true);
    try {
      const activeHabits = habits.filter(h => !h.archived);
      let contextStr = "Full habit list with streaks and XP weights:\n";
      for (const h of activeHabits) {
        let streak = 0;
        let count = 0;
        // Approximation of streak for context
        for (let i = 0; i < 30; i++) {
          const d = format(new Date(Date.now() - i * 86400000), 'yyyy-MM-dd');
          if (logs.find(l => l.habitId === h.id && l.date === d && l.completed)) { streak++; count++; }
          else if (count > 0) break; // simplistic
        }
        contextStr += `${h.name}: streak ${streak}d, difficulty ${h.difficulty}, XP/rep: ${h.difficulty * 10}\n`;
      }
      
      const prompt = `${contextStr}
      
The warrior is in a state of failure/overwhelm today. They can only execute 2 or 3 baseline habits total to survive the day.
Select the absolute most critical habits to protect their momentum.

Output EXACTLY this format, with nothing else:
Habit: [Exact Habit Name from list]
Habit: [Exact Habit Name from list]
Reasoning: [One ruthless sentence on why this bare-minimum protocol keeps them strictly in the game.]`;

      const response = await callGemini(prompt, 150, `survival_${today}`);
      const lines = response.split('\n').map(l => l.trim()).filter(l => l);
      
      // Match lines to habit IDs
      const survivalIds: string[] = [];
      for (const line of lines) {
        if (line.startsWith('Habit:')) {
           const namePart = line.replace('Habit:', '').trim().toLowerCase();
           const matchedHabit = activeHabits.find(h => h.name.toLowerCase() === namePart || namePart.includes(h.name.toLowerCase()));
           if (matchedHabit && survivalIds.length < 3) {
             survivalIds.push(matchedHabit.id);
           }
        } else {
           const matchedHabit = activeHabits.find(h => line.toLowerCase().includes(h.name.toLowerCase()));
           if (matchedHabit && survivalIds.length < 3 && !line.startsWith('Reasoning:')) {
             survivalIds.push(matchedHabit.id);
           }
        }
      }
      
      updateDaily(today, { survivalMode: true, survivalHabits: survivalIds });
    } catch (e) {
      console.error("Survival mode failed", e);
    } finally {
      setIsSurvivalLoading(false);
    }
  };

  const timeslots = [
    { id: 'morning', label: '☀️ Morning Protocol', color: 'text-app-success', border: 'border-app-success' },
    { id: 'afternoon', label: '🌤 Afternoon Protocol', color: 'text-app-info', border: 'border-app-info' },
    { id: 'evening', label: '🌙 Evening Protocol', color: 'text-app-primary', border: 'border-app-primary' },
    { id: 'anytime', label: '⚡ Anytime', color: 'text-app-orange', border: 'border-app-orange' },
  ];

  return (
    <div className="flex flex-col p-4 md:p-6 gap-6">
      <section className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-center bg-app-surface border border-app-border rounded-xl p-4 md:p-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center w-full relative">
          <div className="absolute top-0 right-0">
            {momentum > 10 ? <span className="text-xs font-bold text-app-success bg-app-elevated px-2 py-1 rounded">↑↑ +{momentum}%</span> :
             momentum >= 3 ? <span className="text-xs font-bold text-app-success bg-app-elevated px-2 py-1 rounded">↑ +{momentum}%</span> :
             momentum > -3 ? <span className="text-xs font-bold text-app-orange bg-app-elevated px-2 py-1 rounded">→ {momentum}%</span> :
             momentum >= -10 ? <span className="text-xs font-bold text-app-orange bg-app-elevated px-2 py-1 rounded">↓ {momentum}%</span> :
             <span className="text-xs font-bold text-app-danger bg-app-elevated px-2 py-1 rounded">↓↓ {momentum}%</span>}
          </div>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="var(--color-app-elevated)" strokeWidth="8" fill="transparent" />
              <circle 
                cx="64" 
                cy="64" 
                r="58" 
                stroke="var(--color-app-primary)" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray={circumference} 
                strokeDashoffset={dashoffset} 
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold">{pct}%</span>
              <span className="text-[9px] uppercase tracking-wider text-app-text-muted">Today</span>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-6 border-y lg:border-y-0 lg:border-x border-app-border py-4 lg:py-0 lg:px-6 w-full text-center lg:text-left relative min-h-[100px] flex flex-col justify-center">

          {quote ? (
            <div className="mb-4">
              <h2 className="text-xl md:text-2xl font-bold italic text-app-text-main leading-snug break-words">
                "{quote.text}"
              </h2>
              <p className="text-xs md:text-sm text-app-text-muted uppercase tracking-widest mt-2 font-bold">— {quote.author}</p>
            </div>
          ) : (
            <div className="animate-pulse flex flex-col gap-2 mb-4 w-full">
               <div className="h-6 bg-app-elevated rounded w-3/4 mx-auto lg:mx-0"></div>
               <div className="h-6 bg-app-elevated rounded w-1/2 mx-auto lg:mx-0"></div>
               <div className="h-4 bg-app-elevated rounded w-1/4 mt-2 mx-auto lg:mx-0"></div>
            </div>
          )}

          {(todayData.gamePlan || isSunday || process.env.GEMINI_API_KEY || settings.geminiKey) && (
            <div className="border-t border-app-border pt-3 mt-1">
              {todayData.gamePlan ? (
                <div className="text-left">
                   <div className="mb-1 flex items-center justify-start gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-tighter text-app-info">✦ Today's Game Plan</span>
                   </div>
                   <p className="text-xs md:text-sm text-app-text-main font-sans leading-relaxed whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                     {todayData.gamePlan.text}
                   </p>
                   {todayData.gamePlan.skipList?.length > 0 && (
                     <p className="text-[10px] text-app-orange mt-2 uppercase">Scheduled Skips: {todayData.gamePlan.skipList.join(', ')}</p>
                   )}
                </div>
              ) : isSunday ? (
                 isHardQLoading ? (
                    <p className="text-[10px] uppercase font-bold text-app-text-muted py-1 animate-pulse">✦ Analyzing uncomfortable truths...</p>
                 ) : hardQuestion ? (
                    <div className="text-left">
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-app-orange mb-1 block">✦ The Hard Question</span>
                       <p className="text-sm text-app-orange font-serif italic py-1 leading-relaxed">{hardQuestion}</p>
                    </div>
                 ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 py-1">
                       <p className="text-xs text-app-text-muted text-center lg:text-left">Ready to face today's hard question?</p>
                       <button 
                         onClick={loadHardQuestion}
                         className="px-3 py-1 bg-app-elevated text-app-orange border border-app-orange/30 text-[10px] font-bold uppercase rounded hover:bg-app-orange/10 transition-colors"
                       >
                         Generate Question
                       </button>
                    </div>
                 )
              ) : (
                 isBriefLoading ? (
                    <p className="text-[10px] uppercase font-bold text-app-text-muted py-1 animate-pulse">✦ Analyzing warrior data...</p>
                 ) : aiBrief ? (
                    <div className="text-left">
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-app-primary mb-1 block">✦ Forge Brief</span>
                        <p className="text-xs text-app-text-main font-sans leading-relaxed whitespace-pre-wrap">{aiBrief}</p>
                    </div>
                 ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 py-1">
                       <p className="text-xs text-app-text-muted text-center lg:text-left">Start your day with an elite tactical brief.</p>
                       <button 
                         onClick={loadBrief}
                         className="px-3 py-1 bg-app-elevated text-app-primary border border-app-primary/30 text-[10px] font-bold uppercase rounded hover:bg-app-primary/10 transition-colors shrink-0"
                       >
                         Generate Brief
                       </button>
                    </div>
                 )
              )}
            </div>
          )}

          {isEvening && !todayData.survivalMode && (
            <div className="absolute bottom-4 right-[120px] lg:bottom-0 lg:right-[150px]">
              <button 
                onClick={() => setIsPlanModalOpen(true)}
                className="text-[10px] font-bold uppercase px-3 py-1.5 rounded transition-all border border-app-info text-app-info hover:bg-app-info hover:bg-opacity-10"
              >
                ✦ Plan Tomorrow
              </button>
            </div>
          )}

          <div className="absolute bottom-4 right-4 lg:bottom-0 lg:right-6">
            <button 
              onClick={handleSurvivalMode}
              disabled={isSurvivalLoading}
              className={cn("text-[10px] font-bold uppercase px-3 py-1.5 rounded transition-all",
                todayData.survivalMode ? "bg-app-orange text-white" : "border border-app-orange text-app-orange hover:bg-app-orange hover:bg-opacity-10"
              )}
            >
              {isSurvivalLoading ? "⚡ Analyzing..." : todayData.survivalMode ? "⚡ Exit Survival Mode" : "⚡ Survival Mode"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4 w-full">
          <div className="flex justify-between items-end border-b border-app-border pb-2">
            <span className="text-[10px] uppercase text-app-text-muted">Current Streak</span>
            <span className="text-xl font-mono text-app-orange font-bold">{currentStreak} <small className="text-xs">days</small></span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex -space-x-1">
              {[1, 2, 3, 4, 5].map((mood) => {
                 const isActive = todayData.mood === mood;
                 const icons = ['😞', '😕', '😐', '🙂', '🔥'];
                 return (
                   <button 
                     key={mood}
                     onClick={() => useStore.getState().updateDaily(today, { mood })}
                     className={cn(
                       "w-7 h-7 rounded-full flex items-center justify-center text-xs border z-10 transition-colors",
                       isActive ? "bg-app-primary border-white z-20" : "bg-app-elevated border-app-border hover:bg-app-border"
                     )}
                   >
                     {icons[mood-1]}
                   </button>
                 );
              })}
            </div>
            <span className="text-[10px] uppercase text-app-text-muted">Logged Mood</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* DAILY ONCE-OFF TASKS */}
        <section className="space-y-3 lg:col-span-2">
           <div className="flex justify-between items-end border-b border-app-border pb-1">
             <div className="flex items-center gap-3">
               <h3 className="text-xs font-bold uppercase tracking-widest text-app-text-muted">Today's Targets</h3>
               {(process.env.GEMINI_API_KEY || settings.geminiKey) && (
                 <button 
                   type="button"
                   onClick={async (e) => {
                     const btn = e.currentTarget;
                     const oldText = btn.innerHTML;
                     btn.innerHTML = "✦ Analyzing...";
                     btn.disabled = true;
                     try {
                        const res = await callGemini(`Review the user's active habits and momentum. Suggest ONE highly difficult, outside-the-box one-off "Daily Challenge" task they can complete today to step out of their comfort zone or improve their life setup. Do not repeat their regular habits. Max 10 words. Output ONLY the raw task name, no quotes, no markdown.`);
                        setNewTaskTitle(res.trim());
                        setIsAddingTask(true);
                     } catch(e) {
                        alert("Could not generate target.");
                     } finally {
                        btn.innerHTML = oldText;
                        btn.disabled = false;
                     }
                   }}
                   className="text-[10px] bg-app-elevated text-app-primary border border-app-primary/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider hover:bg-app-primary hover:text-white transition-colors disabled:opacity-50"
                 >
                   ✦ AI Challenge
                 </button>
               )}
             </div>
             <button onClick={() => setIsAddingTask(!isAddingTask)} className="text-[10px] font-bold uppercase text-app-primary">
               + Add Target
             </button>
           </div>
           
           {isAddingTask && (
             <form onSubmit={handleAddTask} className="flex gap-2">
               <input 
                 type="text" 
                 autoFocus
                 value={newTaskTitle}
                 onChange={(e) => setNewTaskTitle(e.target.value)}
                 placeholder="What must be done today?" 
                 className="flex-1 bg-app-elevated border border-app-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-app-primary"
               />
               <button type="submit" className="bg-app-primary text-white px-3 py-2 rounded text-sm font-bold">Add</button>
             </form>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
             {todayTasks.length === 0 && !isAddingTask && (
                <p className="text-xs text-app-text-muted italic py-2 md:col-span-2 lg:col-span-3">No one-off targets set for today.</p>
             )}
             {todayTasks.map(task => (
               <div key={task.id} className="flex flex-col p-2 rounded-lg bg-app-surface border border-app-border transition-colors">
                 {editingTaskId === task.id ? (
                   <form 
                     className="flex-1 flex gap-2"
                     onSubmit={(e) => { e.preventDefault(); saveTaskEdit(task.id); }}
                   >
                     <input 
                       autoFocus
                       className="flex-1 bg-app-elevated border border-app-primary px-2 py-1 text-sm text-white focus:outline-none rounded"
                       value={editingTaskTitle}
                       onChange={(e) => setEditingTaskTitle(e.target.value)}
                       onBlur={() => saveTaskEdit(task.id)}
                     />
                   </form>
                 ) : (
                   <>
                     <div 
                       className="flex items-center justify-between cursor-pointer"
                       onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                     >
                       <div className="flex items-center gap-3 overflow-hidden flex-1">
                         <button 
                           onClick={(e) => { e.stopPropagation(); useStore.getState().toggleDailyTask(task.id); }}
                           className={cn(
                             "w-5 h-5 rounded border flex justify-center items-center shrink-0 transition-colors",
                             task.completed ? "bg-app-primary border-app-primary text-white" : "border-app-text-muted text-transparent"
                           )}
                         >
                           <span className="text-[10px]">✓</span>
                         </button>
                         <span className={cn("text-sm truncate", task.completed ? "line-through text-app-text-muted" : "text-app-text-main")}>
                           {task.title}
                         </span>
                       </div>
                       <div className="text-app-text-muted text-xs ml-2 px-2">
                         {expandedTaskId === task.id ? '▲' : '▼'}
                       </div>
                     </div>
                     {expandedTaskId === task.id && (
                       <div className="flex items-center justify-end mt-2 pt-2 border-t border-app-border gap-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskTitle(task.title); }}
                           className="flex items-center gap-1 text-app-text-muted hover:text-app-info px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-app-elevated rounded transition-colors"
                           title="Edit"
                         >
                           <span className="text-sm">✎</span> Edit
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); useStore.getState().duplicateDailyTask(task.id); setExpandedTaskId(null); }}
                           className="flex items-center gap-1 text-app-text-muted hover:text-app-primary px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-app-elevated rounded transition-colors"
                           title="Duplicate"
                         >
                           <span className="text-sm">⧉</span> Duplicate
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); useStore.getState().deleteDailyTask(task.id); }}
                           className="flex items-center gap-1 text-app-text-muted hover:text-app-danger px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-app-elevated rounded transition-colors"
                           title="Delete"
                         >
                           <span className="text-sm leading-none">✕</span> Delete
                         </button>
                       </div>
                     )}
                   </>
                 )}
               </div>
             ))}
           </div>
        </section>

        {/* DAILY WINS */}
        <section className="space-y-3 lg:col-span-2">
           <MetricsCalendar />
           <div className="flex justify-between items-end border-b border-app-border pb-1">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">Daily Wins</h3>
             <button onClick={() => setIsAddingWin(!isAddingWin)} className="text-[10px] font-bold uppercase text-[#FFC107]">
               + Add Win
             </button>
           </div>
           
           {isAddingWin && (
             <form onSubmit={handleAddWin} className="flex gap-2">
               <input 
                 type="text" 
                 autoFocus
                 value={newWinText}
                 onChange={(e) => setNewWinText(e.target.value)}
                 placeholder="What small achievement or positive moment happened?" 
                 className="flex-1 bg-app-elevated border border-app-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFC107]"
               />
               <button type="submit" className="bg-[#FFC107] text-black px-3 py-2 rounded text-sm font-bold">Add</button>
             </form>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
             {todayWins.length === 0 && !isAddingWin && (
                <p className="text-xs text-app-text-muted italic py-2 md:col-span-2">No wins noted yet. Seize a small victory.</p>
             )}
             {todayWins.map(win => (
               <div key={win.id} className="flex items-center justify-between p-3 rounded-lg bg-app-surface border border-[#FFC107] border-opacity-30 group">
                 <div className="flex items-center gap-3">
                   <div className="text-[#FFC107]">🏆</div>
                   <span className="text-sm text-app-text-main">{win.text}</span>
                 </div>
                 <button 
                   onClick={() => useStore.getState().deleteGrowthLog(win.id)}
                   className="text-app-text-muted hover:text-app-danger opacity-0 group-hover:opacity-100 transition-opacity px-2 text-xl leading-none"
                 >
                   ×
                 </button>
               </div>
             ))}
           </div>
        </section>

        {timeslots.map((slot) => {
          let slotHabits = habits.filter(h => !h.archived && h.timeslot === slot.id);
          
          if (todayData.gamePlan && todayData.gamePlan.skipList) {
             const skips = todayData.gamePlan.skipList as string[];
             slotHabits = slotHabits.filter(h => !skips.includes(h.name));
          }

          if (slotHabits.length === 0) return null;

          const slotDone = slotHabits.filter(h => todayLogs.find(l => l.habitId === h.id && l.completed)).length;

          return (
            <section key={slot.id} className="space-y-3">
              <div className="flex justify-between items-end border-b border-app-border pb-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-app-text-muted">{slot.label}</h3>
                <span className={cn("text-[10px] font-mono", slot.color)}>
                  {slotDone} / {slotHabits.length} REPS
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {slotHabits.map(habit => {
                  const log = todayLogs.find(l => l.habitId === habit.id);
                  const isDone = log?.completed;
                  const isSkipped = !!log?.skipReason && !isDone;
                  const isSurvivalFiltered = todayData.survivalMode && todayData.survivalHabits && !todayData.survivalHabits.includes(habit.id);

                  return (
                    <div key={habit.id} className="relative">
                      {longPressMenu === habit.id && !isSkipped && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setLongPressMenu(null)} />
                          <div className="absolute top-14 right-4 bg-app-elevated border border-app-border rounded shadow-2xl z-50 p-1 min-w-[150px] animate-fade-in">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setLongPressMenu(null);
                                setSkipHabitModal(habit.id);
                              }}
                              className="w-full text-left p-3 hover:bg-app-border rounded text-sm text-white font-bold"
                            >
                              I want to skip
                            </button>
                          </div>
                        </>
                      )}
                      {longPressMenu === habit.id && isSkipped && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setLongPressMenu(null)} />
                           <div className="absolute top-14 right-4 bg-app-elevated border border-app-border rounded shadow-2xl z-50 p-2 min-w-[150px] animate-fade-in">
                             <p className="text-xs text-app-text-muted italic mb-2 px-1">Skipped: {log?.skipReason}</p>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setLongPressMenu(null);
                                 clearSkip(habit.id, today);
                               }}
                               className="w-full text-left p-2 hover:bg-app-border rounded text-sm text-app-success font-bold flex items-center justify-between"
                             >
                               <span>Undo Skip</span>
                               <span className="text-[10px]">↻</span>
                             </button>
                           </div>
                        </>
                      )}
                      <button 
                        onTouchStart={() => handleStartPress(habit.id)}
                        onTouchEnd={handleCancelPress}
                        onMouseDown={() => handleStartPress(habit.id)}
                        onMouseUp={handleCancelPress}
                        onMouseLeave={handleCancelPress}
                        onClick={(e) => {
                          if (longPressMenu === habit.id) return;
                          if (!isSurvivalFiltered && !isSkipped) toggleLog(habit.id, today, habit.difficulty * 10);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all relative overflow-hidden",
                          isSurvivalFiltered ? "opacity-30 grayscale cursor-not-allowed" :
                          isSkipped ? "bg-app-surface border border-app-danger opacity-50 grayscale" :
                          isDone 
                            ? `bg-app-elevated border ${slot.border} border-opacity-50` 
                            : "bg-app-surface border border-app-border hover:border-app-primary hover:border-opacity-50"
                        )}
                      >
                        {isSurvivalFiltered && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10 pointer-events-none">
                            <div className="w-full h-[1px] bg-white opacity-50 absolute"></div>
                          </div>
                        )}
                        {isDone && (
                          <div className="absolute top-0 right-0 p-1">
                             <div className={cn("text-[8px] text-white px-1 rounded italic bg-opacity-80", slot.color.replace('text-', 'bg-'))}>COMPLETED</div>
                          </div>
                        )}
                        {isSkipped && (
                          <div className="absolute top-0 right-0 p-1">
                             <div className="text-[8px] text-white px-1 rounded italic bg-app-danger bg-opacity-80">SKIPPED</div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors",
                            isSkipped ? "border-2 border-app-danger text-app-danger" :
                            isDone 
                              ? `${slot.color.replace('text-', 'bg-')} text-white` 
                              : "border-2 border-app-border text-transparent"
                          )}>
                            {isSkipped ? "✕" : "✓"}
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", isDone ? "text-app-text-main" : isSkipped ? "text-app-danger line-through" : "text-app-text-main")}>{habit.name}</p>
                            <p className={cn("text-[9px] uppercase font-bold", isDone ? slot.color : isSkipped ? "text-app-danger" : "text-app-text-muted")}>
                              {habit.difficulty * 10} XP
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end">
                          {Array.from({ length: 5 }).map((_, i) => (
                             <div key={i} className={cn(
                               "w-1.5 h-1.5 rounded-full",
                               i < habit.difficulty ? (isDone ? slot.color.replace('text-', 'bg-') : isSkipped ? "bg-app-danger" : "bg-app-primary") : "bg-app-border"
                             )} />
                          ))}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        })}
      </div>
      
      {skipHabitModal && <ResistanceModal habitId={skipHabitModal} onClose={() => setSkipHabitModal(null)} />}
      {isPlanModalOpen && <GamePlanModal onClose={() => setIsPlanModalOpen(false)} />}
    </div>
  );
}
