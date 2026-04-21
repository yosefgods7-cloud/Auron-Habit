import { useStore } from '../lib/store';

export function Habits() {
  const habits = useStore(state => state.habits);
  const archiveHabit = useStore(state => state.archiveHabit);

  const activeHabits = habits.filter(h => !h.archived);

  return (
    <div className="p-4 md:p-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tighter uppercase text-[#7c6aff]">Habits Protocol</h2>
        <span className="text-[#7a7a9a] text-xs font-bold uppercase">{activeHabits.length} ACTIVE</span>
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
    </div>
  )
}

