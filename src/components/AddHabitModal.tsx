import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useStore, HabitCategory, Timeslot } from '../lib/store';
import { cn } from '../lib/utils';
import { callGemini } from '../lib/gemini';

interface AddHabitModalProps {
  onClose: () => void;
  editHabitId?: string;
}

export function AddHabitModal({ onClose, editHabitId }: AddHabitModalProps) {
  const addHabit = useStore(state => state.addHabit);
  const updateHabit = useStore(state => state.updateHabit);
  const settings = useStore(state => state.settings);
  const habits = useStore(state => state.habits);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💪');
  const [category, setCategory] = useState<HabitCategory>('Physical');
  const [timeslot, setTimeslot] = useState<Timeslot>('morning');
  const [difficulty, setDifficulty] = useState(1);
  const [protocol, setProtocol] = useState('General');
  const [reminderTime, setReminderTime] = useState('');
  const [description, setDescription] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  useEffect(() => {
    if (editHabitId) {
      const h = habits.find(h => h.id === editHabitId);
      if (h) {
         setName(h.name);
         setIcon(h.icon);
         setCategory(h.category);
         setTimeslot(h.timeslot);
         setDifficulty(h.difficulty);
         setProtocol(h.protocol);
         setReminderTime(h.reminderTime || '');
         setDescription(h.description || '');
         setAlarmEnabled(h.alarmEnabled || false);
      }
    }
  }, [editHabitId, habits]);

  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const icons = ['💪', '🧠', '🏃', '💧', '🌅', '✍️', '🍎', '😴', '🙏', '💻'];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editHabitId) {
      updateHabit(editHabitId, {
        name: name.trim(),
        icon,
        category,
        protocol: protocol.trim() || 'General',
        timeslot,
        difficulty,
        description: description.trim(),
        alarmEnabled,
        reminderTime: reminderTime || null,
      });
    } else {
      addHabit({
        name: name.trim(),
        icon,
        category,
        protocol: protocol.trim() || 'General',
        frequency: { type: 'daily' },
        timeslot,
        color: 'var(--color-app-primary)',
        difficulty,
        why: '',
        description: description.trim(),
        alarmEnabled,
        reminderTime: reminderTime || null,
        graceDay: false,
      });
    }
    
    onClose();
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const activeIds = habits.filter(h => !h.archived).map(h => h.name).join(', ');
      const text = await callGemini(
        `Based on this warrior's current active habits (${activeIds || 'None yet'}) and identity statement (${settings.identityStatement || 'Growth focused'}), suggest 3 NEW habits they DON'T already have.
Make them highly effective, specific, and actionable. They must complement their existing schedule.
Output EXACTLY valid JSON with no markdown wrapping, structured like this:
[
  {
    "icon": "📝",
    "name": "Evening Brain Dump",
    "category": "Mental",
    "difficulty": 2,
    "description": "Write down all thoughts to clear the mind before sleeping."
  }
]
Categories allowed: Physical, Mental, Social, Recovery, Creative, Spiritual, Productivity.`,
        800
      );

      let suggestions: any[] = [];
      try {
        let rawJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = rawJson.indexOf('[');
        const endIdx = rawJson.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
          rawJson = rawJson.substring(startIdx, endIdx + 1);
        }
        suggestions = JSON.parse(rawJson);
      } catch(e: any) {
        console.error("JSON parse error:", e.message, text);
      }

      setAiSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleUseSuggestion = (s: any) => {
    setIcon(s.icon || '💪');
    setName(s.name || '');
    setCategory((s.category as HabitCategory) || 'Physical');
    setDifficulty(s.difficulty || 2);
    setDescription(s.description || '');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-app-bg border border-app-border rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-app-border pb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold uppercase text-app-primary">{editHabitId ? 'Edit Habit' : 'New Habit'}</h2>
            {!editHabitId && (
              <button 
                type="button"
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="text-[10px] font-bold uppercase tracking-widest text-app-primary border border-app-primary border-opacity-50 px-2 py-1 rounded hover:bg-app-primary hover:bg-opacity-10 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span>✦</span> {isSuggesting ? 'Thinking...' : 'Suggest'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-app-text-muted hover:text-white">✕</button>
        </div>

        {aiSuggestions.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-app-text-muted uppercase">✦ AI Suggestions</span>
               <button onClick={() => setAiSuggestions([])} className="text-xs text-app-primary">Clear</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {aiSuggestions.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleUseSuggestion(s)}
                  className="flex flex-col gap-2 p-3 bg-app-elevated border border-app-primary border-opacity-30 rounded-lg hover:bg-app-border text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-2xl">{s.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-app-text-main">{s.name}</p>
                      <p className="text-[10px] text-app-text-muted uppercase">{s.category} • {s.difficulty * 10} XP</p>
                    </div>
                    <span className="text-app-primary text-xs font-bold shrink-0">USE →</span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-app-text-muted italic border-t border-app-border pt-2 w-full">{s.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Habit Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              placeholder="e.g. Read 10 Pages"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    "w-10 h-10 rounded text-xl border transition-colors flex items-center justify-center",
                    icon === i ? "bg-app-primary border-app-primary" : "bg-app-elevated border-app-border"
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Timeslot</label>
            <div className="grid grid-cols-2 gap-2">
              {(['morning', 'afternoon', 'evening', 'anytime'] as Timeslot[]).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeslot(slot)}
                  className={cn(
                    "py-2 rounded text-sm font-bold uppercase border transition-colors",
                    timeslot === slot ? "bg-app-primary border-app-primary text-white" : "bg-app-elevated border-app-border text-app-text-muted"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Protocol Group</label>
            <input 
              type="text" 
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              placeholder="e.g. Morning Routine, Work, Health"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Description / Task Notes</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary resize-none h-20"
              placeholder="Provide more specific instructions or why you are doing this..."
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Reminder Time (Optional)</label>
              <input 
                type="time" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              />
            </div>
            
            <div className="flex flex-col items-center">
               <label className="block text-xs font-bold text-app-text-muted uppercase mb-2">Enable Alarm</label>
               <input 
                 type="checkbox"
                 checked={alarmEnabled}
                 onChange={(e) => setAlarmEnabled(e.target.checked)}
                 className="w-6 h-6 rounded border-app-border bg-app-elevated text-app-primary focus:ring-[var(--color-app-primary)]"
               />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Difficulty (XP: {difficulty * 10})</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    "w-10 h-10 rounded font-bold border transition-colors",
                    difficulty >= level ? "bg-app-info text-[#0d0d14] border-app-info" : "bg-app-elevated border-app-border text-app-text-muted"
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
              className="w-full py-3 bg-app-primary text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
            >
              {editHabitId ? 'Update Habit' : 'Add to Protocol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
