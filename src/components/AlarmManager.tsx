import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export function AlarmManager() {
  const habits = useStore(state => state.habits);
  const [activeAlarm, setActiveAlarm] = useState<string | null>(null);
  
  // Track what we've already alerted today to prevent looping infinitely
  // Using simple session state - resets if user reloads but good enough for PWA standard
  const [alertedToday, setAlertedToday] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const interval = setInterval(() => {
      const activeHabits = habits.filter(h => !h.archived && h.reminderTime && h.alarmEnabled);
      const now = new Date();
      // Format current time HH:mm
      const currentTimeStr = format(now, 'HH:mm');

      // Check if any habit needs to alert
      for (const habit of activeHabits) {
        if (habit.reminderTime === currentTimeStr) {
           const alertKey = `${habit.id}-${format(now, 'yyyy-MM-dd')}`;
           if (!alertedToday[alertKey]) {
              // Trigger Alert
              triggerAlert(habit.name, habit.description || 'Time to complete your protocol.');
              setAlertedToday(prev => ({ ...prev, [alertKey]: true }));
              setActiveAlarm(habit.name);
           }
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [habits, alertedToday]);

  const triggerAlert = (title: string, body: string) => {
    // 1. Web Notification (Triggers Native Android push if PWA installed)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`AURON: ${title}`, {
         body,
         icon: '/icon.svg',
      });
    }
  };

  if (!activeAlarm) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] bg-[#1c1c27] border border-[#7c6aff] border-opacity-50 p-4 rounded-xl shadow-[0_4px_30px_rgba(124,106,255,0.3)] flex justify-between items-center animate-slide-down">
      <div>
        <h3 className="font-bold text-[#e8e8f0] flex items-center gap-2">
          <span className="text-[#00d4ff] animate-pulse">⏰</span> {activeAlarm}
        </h3>
        <p className="text-xs text-[#7a7a9a] uppercase tracking-wider mt-1">Scheduled task triggered</p>
      </div>
      <button 
        onClick={() => setActiveAlarm(null)}
        className="px-4 py-2 bg-[#7c6aff] text-white text-xs font-bold rounded"
      >
        Dismiss
      </button>
    </div>
  );
}
