import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';
import { getMomentumData, calculateForgeScore } from '../lib/momentum';
import { ResistanceModal } from './ResistanceModal';
import { GamePlanModal } from './GamePlanModal';

export function Arena() {
  const habits = useStore(state => state.habits);
  const logs = useStore(state => state.logs);
  const daily = useStore(state => state.daily) || {};
  const meta = useStore(state => state.meta);
  const toggleLog = useStore(state => state.toggleLog);
  const settings = useStore(state => state.settings);
  const updateDaily = useStore(state => state.updateDaily);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter(l => l.date === today);
  const todayData = daily[today] || {};
  const todayTasks = (useStore(state => state.dailyTasks) || []).filter(t => t.date === today);
  const todayWins = (useStore(state => state.growth) || []).filter(g => g.date.startsWith(today) && g.type === 'win');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

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
    if (!settings.geminiKey || !isSunday) return;
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsHardQLoading(false);
    }
  };

  const loadBrief = async () => {
    if (!settings.geminiKey || todayData.forgeBrief || isBriefLoading) return;
    
    setIsBriefLoading(true);
    try {
      const text = await callGemini(
        "Write a 2-sentence personalized morning brief for this warrior. Reference their actual habits and streaks. Be direct, motivating, coach-like. No fluff. End with one sharp action directive. Max 60 words.", 
        150, 
        `brief_${today}`
      );
      setAiBrief(text);
      updateDaily(today, { forgeBrief: text });
    } catch (err) {
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
      
The warrior is overwhelmed today and can only do 2-3 habits.
Select the 2-3 habits that matter MOST using this priority:
1. Highest streak at risk of breaking (streak × difficulty)
2. Highest XP yield
3. Most foundational to their identity/other habits

Output ONLY the exact habit names, one per line, then ONE sentence explanation of why these 3 protect the most momentum.
No intro. No padding. Max 60 words.`;

      const response = await callGemini(prompt, 150, `survival_${today}`);
      const lines = response.split('\n').map(l => l.trim()).filter(l => l);
      
      // Match lines to habit IDs
      const survivalIds: string[] = [];
      for (const line of lines) {
        const matchedHabit = activeHabits.find(h => line.toLowerCase().includes(h.name.toLowerCase()));
        if (matchedHabit && survivalIds.length < 3) {
          survivalIds.push(matchedHabit.id);
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
          <div className="mb-2 flex items-center justify-center lg:justify-start gap-2">
            <span className={cn("text-xs font-bold uppercase tracking-tighter", 
              todayData.gamePlan ? "text-app-info" : isSunday ? "text-app-orange" : settings.geminiKey ? "text-app-primary" : "text-app-text-muted"
            )}>
              {todayData.gamePlan ? "✦ Today's Game Plan" : isSunday ? "✦ The Hard Question" : settings.geminiKey ? "✦ Your Forge Brief" : "The Arena"}
            </span>
            <div className="h-px flex-1 bg-app-border hidden lg:block"></div>
          </div>
          
          {todayData.gamePlan ? (
            <div className="text-left">
               <p className="text-xs md:text-sm text-app-text-main font-sans leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                 {todayData.gamePlan.text}
               </p>
               {todayData.gamePlan.skipList?.length > 0 && (
                 <p className="text-[10px] text-app-orange mt-2 uppercase">Scheduled Skips: {todayData.gamePlan.skipList.join(', ')}</p>
               )}
            </div>
          ) : isSunday && settings.geminiKey ? (
             isHardQLoading ? (
                <p className="text-sm text-app-text-muted py-2 animate-pulse">✦ Analyzing uncomfortable truths...</p>
             ) : hardQuestion ? (
                <div>
                   <p className="text-sm md:text-base text-app-orange font-serif italic leading-relaxed">{hardQuestion}</p>
                </div>
             ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 py-2">
                   <p className="text-sm text-app-text-muted text-center lg:text-left">Ready to face today's hard question?</p>
                   <button 
                     onClick={loadHardQuestion}
                     className="px-4 py-1.5 bg-app-elevated text-app-orange border border-app-orange/30 text-xs font-bold uppercase rounded hover:bg-app-orange/10 transition-colors"
                   >
                     Generate Question
                   </button>
                </div>
             )
          ) : settings.geminiKey ? (
             isBriefLoading ? (
                <p className="text-sm text-app-text-muted py-2 animate-pulse">✦ Analyzing warrior data...</p>
             ) : aiBrief ? (
                <div>
                   <p className="text-sm md:text-base text-app-text-main font-sans leading-relaxed">{aiBrief}</p>
                   <p className="text-[9px] text-app-text-muted mt-2 uppercase tracking-widest">Powered by Gemini · Generated Today</p>
                </div>
             ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 py-2">
                   <p className="text-sm text-app-text-muted text-center lg:text-left">Start your day with an elite tactical brief.</p>
                   <button 
                     onClick={loadBrief}
                     className="px-4 py-1.5 bg-app-elevated text-app-primary border border-app-primary/30 text-xs font-bold uppercase rounded hover:bg-app-primary/10 transition-colors shrink-0"
                   >
                     Generate Brief
                   </button>
                </div>
             )
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-bold italic mb-2">"We suffer more in imagination than in reality."</h2>
              <p className="text-xs md:text-sm text-app-text-muted">— Seneca • Morning Intention: Focus on what I control.</p>
            </>
          )}

          {isEvening && !todayData.survivalMode && settings.geminiKey && (
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
             <h3 className="text-xs font-bold uppercase tracking-widest text-app-text-muted">Today's Targets</h3>
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
               <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-app-surface border border-app-border group">
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
                     <div className="flex items-center gap-3 overflow-hidden flex-1">
                       <button 
                         onClick={() => useStore.getState().toggleDailyTask(task.id)}
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
                     <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); }}
                         className="text-app-text-muted hover:text-app-info px-2 text-xs"
                         title="Edit"
                       >
                         ✎
                       </button>
                       <button 
                         onClick={() => useStore.getState().duplicateDailyTask(task.id)}
                         className="text-app-text-muted hover:text-app-primary px-2 text-xs"
                         title="Duplicate"
                       >
                         ⧉
                       </button>
                       <button 
                         onClick={() => useStore.getState().deleteDailyTask(task.id)}
                         className="text-app-text-muted hover:text-app-danger px-2 text-xl leading-none"
                         title="Delete"
                       >
                         ×
                       </button>
                     </div>
                   </>
                 )}
               </div>
             ))}
           </div>
        </section>

        {/* DAILY WINS */}
        <section className="space-y-3 lg:col-span-2">
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
                  const isSurvivalFiltered = todayData.survivalMode && todayData.survivalHabits && !todayData.survivalHabits.includes(habit.id);

                  return (
                    <div key={habit.id} className="relative">
                      {longPressMenu === habit.id && (
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
                      <button 
                        onTouchStart={() => handleStartPress(habit.id)}
                        onTouchEnd={handleCancelPress}
                        onMouseDown={() => handleStartPress(habit.id)}
                        onMouseUp={handleCancelPress}
                        onMouseLeave={handleCancelPress}
                        onClick={(e) => {
                          if (longPressMenu === habit.id) return;
                          if (!isSurvivalFiltered) toggleLog(habit.id, today, habit.difficulty * 10);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all relative overflow-hidden",
                          isSurvivalFiltered ? "opacity-30 grayscale cursor-not-allowed" :
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
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors",
                            isDone 
                              ? `${slot.color.replace('text-', 'bg-')} text-white` 
                              : "border-2 border-app-border text-transparent"
                          )}>
                            ✓
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", isDone ? "text-app-text-main" : "text-app-text-main")}>{habit.name}</p>
                            <p className={cn("text-[9px] uppercase font-bold", isDone ? slot.color : "text-app-text-muted")}>
                              {habit.difficulty * 10} XP
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end">
                          {Array.from({ length: 5 }).map((_, i) => (
                             <div key={i} className={cn(
                               "w-1.5 h-1.5 rounded-full",
                               i < habit.difficulty ? (isDone ? slot.color.replace('text-', 'bg-') : "bg-app-primary") : "bg-app-border"
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
