import { useState } from 'react';
import { useStore, HabitCategory, Timeslot } from '../lib/store';
import { cn } from '../lib/utils';

interface AddHabitModalProps {
  onClose: () => void;
}

export function AddHabitModal({ onClose }: AddHabitModalProps) {
  const addHabit = useStore(state => state.addHabit);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💪');
  const [category, setCategory] = useState<HabitCategory>('Physical');
  const [timeslot, setTimeslot] = useState<Timeslot>('morning');
  const [difficulty, setDifficulty] = useState(1);
  const [protocol, setProtocol] = useState('General');
  const [reminderTime, setReminderTime] = useState('');

  const icons = ['💪', '🧠', '🏃', '💧', '🌅', '✍️', '🍎', '😴', '🙏', '💻'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addHabit({
      name: name.trim(),
      icon,
      category,
      protocol: protocol.trim() || 'General',
      frequency: { type: 'daily' },
      timeslot,
      color: '#7c6aff',
      difficulty,
      why: '',
      reminderTime: reminderTime || null,
      graceDay: false,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-[#2a2a3a] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold uppercase text-[#7c6aff]">New Habit</h2>
          <button onClick={onClose} className="text-[#7a7a9a] hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Habit Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
              placeholder="e.g. Read 10 Pages"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    "w-10 h-10 rounded text-xl border transition-colors flex items-center justify-center",
                    icon === i ? "bg-[#7c6aff] border-[#7c6aff]" : "bg-[#1c1c27] border-[#2a2a3a]"
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Timeslot</label>
            <div className="grid grid-cols-2 gap-2">
              {(['morning', 'afternoon', 'evening', 'anytime'] as Timeslot[]).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeslot(slot)}
                  className={cn(
                    "py-2 rounded text-sm font-bold uppercase border transition-colors",
                    timeslot === slot ? "bg-[#7c6aff] border-[#7c6aff] text-white" : "bg-[#1c1c27] border-[#2a2a3a] text-[#7a7a9a]"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Protocol Group</label>
            <input 
              type="text" 
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
              placeholder="e.g. Morning Routine, Work, Health"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Reminder Time (Optional)</label>
            <input 
              type="time" 
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Difficulty (XP: {difficulty * 10})</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    "w-10 h-10 rounded font-bold border transition-colors",
                    difficulty >= level ? "bg-[#00d4ff] text-[#0d0d14] border-[#00d4ff]" : "bg-[#1c1c27] border-[#2a2a3a] text-[#7a7a9a]"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full py-3 bg-[#7c6aff] text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
            >
              Add to Protocol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
