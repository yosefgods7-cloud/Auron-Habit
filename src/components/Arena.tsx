import { useStore } from '../lib/store';
import { cn, generateId } from '../lib/utils';
import { format } from 'date-fns';

export function Arena() {
  const habits = useStore(state => state.habits);
  const logs = useStore(state => state.logs);
  const daily = useStore(state => state.daily);
  const toggleLog = useStore(state => state.toggleLog);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter(l => l.date === today);
  const todayData = daily[today] || {};

  const completedCount = habits.length > 0 
    ? habits.filter(h => todayLogs.find(l => l.habitId === h.id && l.completed)).length
    : 0;
  const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const circumference = 2 * Math.PI * 58;
  const dashoffset = circumference - (pct / 100) * circumference;

  const currentStreak = useStore(state => state.meta.currentStreak);

  const timeslots = [
    { id: 'morning', label: '☀️ Morning Protocol', color: 'text-[#22d37a]', border: 'border-[#22d37a]' },
    { id: 'afternoon', label: '🌤 Afternoon Protocol', color: 'text-[#00d4ff]', border: 'border-[#00d4ff]' },
    { id: 'evening', label: '🌙 Evening Protocol', color: 'text-[#7c6aff]', border: 'border-[#7c6aff]' },
    { id: 'anytime', label: '⚡ Anytime', color: 'text-orange-500', border: 'border-orange-500' },
  ];

  return (
    <div className="flex flex-col p-4 md:p-6 gap-6">
      <section className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-center bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 md:p-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center w-full">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="#1c1c27" strokeWidth="8" fill="transparent" />
              <circle 
                cx="64" 
                cy="64" 
                r="58" 
                stroke="#7c6aff" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray={circumference} 
                strokeDashoffset={dashoffset} 
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold">{pct}%</span>
              <span className="text-[9px] uppercase tracking-wider text-[#7a7a9a]">Today</span>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-6 border-y lg:border-y-0 lg:border-x border-[#2a2a3a] py-4 lg:py-0 lg:px-6 w-full text-center lg:text-left">
          <div className="mb-2 flex items-center justify-center lg:justify-start gap-2">
            <span className="text-xs font-bold text-[#7c6aff] uppercase tracking-tighter">The Arena</span>
            <div className="h-px flex-1 bg-[#2a2a3a] hidden lg:block"></div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold italic mb-2">"We suffer more in imagination than in reality."</h2>
          <p className="text-xs md:text-sm text-[#7a7a9a]">— Seneca • Morning Intention: Focus on what I control.</p>
        </div>

        <div className="lg:col-span-3 space-y-4 w-full">
          <div className="flex justify-between items-end border-b border-[#2a2a3a] pb-2">
            <span className="text-[10px] uppercase text-[#7a7a9a]">Current Streak</span>
            <span className="text-xl font-mono text-orange-500 font-bold">{currentStreak} <small className="text-xs">days</small></span>
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
                       isActive ? "bg-[#7c6aff] border-white z-20" : "bg-[#1c1c27] border-[#2a2a3a] hover:bg-[#2a2a3a]"
                     )}
                   >
                     {icons[mood-1]}
                   </button>
                 );
              })}
            </div>
            <span className="text-[10px] uppercase text-[#7a7a9a]">Logged Mood</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {timeslots.map((slot) => {
          const slotHabits = habits.filter(h => !h.archived && h.timeslot === slot.id);
          if (slotHabits.length === 0) return null;

          const slotDone = slotHabits.filter(h => todayLogs.find(l => l.habitId === h.id && l.completed)).length;

          return (
            <section key={slot.id} className="space-y-3">
              <div className="flex justify-between items-end border-b border-[#2a2a3a] pb-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#7a7a9a]">{slot.label}</h3>
                <span className={cn("text-[10px] font-mono", slot.color)}>
                  {slotDone} / {slotHabits.length} REPS
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {slotHabits.map(habit => {
                  const log = todayLogs.find(l => l.habitId === habit.id);
                  const isDone = log?.completed;

                  return (
                    <button 
                      key={habit.id}
                      onClick={() => toggleLog(habit.id, today, habit.difficulty * 10)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg text-left transition-all",
                        isDone 
                          ? `bg-[#1c1c27] border ${slot.border} border-opacity-50 relative overflow-hidden` 
                          : "bg-[#13131a] border border-[#2a2a3a] hover:border-[#7c6aff] hover:border-opacity-50"
                      )}
                    >
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
                            : "border-2 border-[#2a2a3a] text-transparent"
                        )}>
                          ✓
                        </div>
                        <div>
                          <p className={cn("text-sm font-bold", isDone ? "text-[#e8e8f0]" : "text-[#e8e8f0]")}>{habit.name}</p>
                          <p className={cn("text-[9px] uppercase font-bold", isDone ? slot.color : "text-[#7a7a9a]")}>
                            {habit.difficulty * 10} XP
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 justify-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                           <div key={i} className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             i < habit.difficulty ? (isDone ? slot.color.replace('text-', 'bg-') : "bg-[#7c6aff]") : "bg-[#2a2a3a]"
                           )} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  );
}
