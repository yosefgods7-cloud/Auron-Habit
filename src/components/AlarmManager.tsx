import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { LocalNotifications } from '@capacitor/local-notifications';

export function AlarmManager() {
  const habits = useStore(state => state.habits);
  const [activeAlarm, setActiveAlarm] = useState<string | null>(null);
  const [alertedToday, setAlertedToday] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Ask for Native Permissions
    const setupNativeNotifications = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
           await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.log('Not running in native capacitor wrapper for notifications');
      }
    };
    setupNativeNotifications();
    
    // 2. Schedule native notifications immediately if habits update
    const scheduleNativeBackground = async () => {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] }); // Quick clear
        
        const activeHabits = habits.filter(h => !h.archived && h.reminderTime && h.alarmEnabled);
        
        let idCounter = 1;
        const pending = activeHabits.map((h) => {
          const [hours, mins] = h.reminderTime!.split(':').map(Number);
          return {
            id: idCounter++,
            title: `AURON: ${h.name}`,
            body: h.description || 'Time to complete your protocol.',
            schedule: {
              on: { hour: hours, minute: mins },
              allowWhileIdle: true
            },
            smallIcon: 'ic_stat_icon_default', 
          };
        });

        if (pending.length > 0) {
          await LocalNotifications.schedule({ notifications: pending });
        }
      } catch (e) {
        // Failing silently if not in native env
      }
    };
    scheduleNativeBackground();

    // 3. Fallback Web Interval (for web mode or foreground custom UI popups)
    const interval = setInterval(() => {
      const activeHabits = habits.filter(h => !h.archived && h.reminderTime && h.alarmEnabled);
      const now = new Date();
      const currentTimeStr = format(now, 'HH:mm');

      for (const habit of activeHabits) {
        if (habit.reminderTime === currentTimeStr) {
           const alertKey = `${habit.id}-${format(now, 'yyyy-MM-dd')}`;
           if (!alertedToday[alertKey]) {
              triggerWebAlert(habit.name, habit.description || 'Time to complete your protocol.');
              setAlertedToday(prev => ({ ...prev, [alertKey]: true }));
              setActiveAlarm(habit.name);
           }
        }
      }
    }, 15000); 

    return () => clearInterval(interval);
  }, [habits, alertedToday]);

  const triggerWebAlert = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`AURON: ${title}`, {
         body,
         icon: '/icon.svg',
      });
    }
  };

  if (!activeAlarm) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] bg-app-elevated border border-app-primary border-opacity-50 p-4 rounded-xl shadow-[0_4px_30px_rgba(124,106,255,0.3)] flex justify-between items-center animate-slide-down">
      <div>
        <h3 className="font-bold text-app-text-main flex items-center gap-2">
          <span className="text-app-info animate-pulse">⏰</span> {activeAlarm}
        </h3>
        <p className="text-xs text-app-text-muted uppercase tracking-wider mt-1">Scheduled task triggered</p>
      </div>
      <button 
        onClick={() => setActiveAlarm(null)}
        className="px-4 py-2 bg-app-primary text-white text-xs font-bold rounded"
      >
        Dismiss
      </button>
    </div>
  );
}
