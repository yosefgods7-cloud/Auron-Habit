import { useState, useEffect } from 'react';
import { useStore } from './lib/store';
import { Arena } from './components/Arena';
import { Habits } from './components/Habits';
import { Intel } from './components/Intel';
import { Mindset } from './components/Mindset';
import { Navigation } from './components/Navigation';
import { AddHabitModal } from './components/AddHabitModal';
import { Settings } from './components/Settings';
import { AlarmManager } from './components/AlarmManager';
import { LockScreen } from './components/LockScreen';

export default function App() {
  const settings = useStore((state) => state.settings);
  const [activeTab, setActiveTab] = useState<'arena'|'habits'|'intel'|'mindset'|'settings'>('arena');
  const [mounted, setMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  if (!mounted) return null;

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  if (!settings.onboardingDone) {
    return (
      <div className="w-full h-full bg-app-bg text-app-text-main font-sans flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-app-primary mb-4">AURON</h1>
        <p className="text-app-text-muted mb-8">Forge Who You Become.</p>
        <button 
          onClick={() => useStore.getState().completeOnboarding('Warrior', '🦁', [
            {
              name: 'Cold Shower',
              icon: '🧊',
              category: 'Physical',
              protocol: 'Morning Warrior',
              frequency: { type: 'daily' },
              timeslot: 'morning',
              color: 'var(--color-app-success)',
              difficulty: 4,
              why: 'Discipline',
              reminderTime: null,
              graceDay: false
            },
            {
              name: 'Deep Work (2h)',
              icon: '💻',
              category: 'Productivity',
              protocol: 'Work',
              frequency: { type: 'daily' },
              timeslot: 'afternoon',
              color: 'var(--color-app-info)',
              difficulty: 5,
              why: 'Focus',
              reminderTime: null,
              graceDay: false
            }
          ])}
          className="px-8 py-3 bg-app-primary text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
        >
          Begin Training
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-app-bg text-app-text-main font-sans flex flex-col overflow-hidden select-none">
      <AlarmManager />
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-app-border bg-app-bg sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-app-primary">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="6" />
              <path d="M50 25 Q60 45 50 75 Q40 45 50 25" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase">Auron</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Forge Score</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-app-success">84</span>
              <div className="w-12 h-1 bg-app-elevated rounded-full overflow-hidden">
                <div className="h-full bg-app-success" style={{ width: '84%' }}></div>
              </div>
            </div>
          </div>
          <div className="px-2 md:px-3 py-1 bg-app-elevated border border-app-border rounded flex items-center gap-1 md:gap-2">
            {settings.geminiKey && <span className="text-app-primary mr-1" title="AURON Intelligence Active">✦</span>}
            <span className="text-[10px] font-bold text-app-info uppercase">Lvl {useStore.getState().meta.level}</span>
            <span className="text-xs font-bold text-app-text-main truncate max-w-[60px] md:max-w-[80px]">{settings.userName}</span>
          </div>
          <button 
            onClick={() => setActiveTab('settings')}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-app-primary flex items-center justify-center text-lg md:text-xl shrink-0 transition-transform active:scale-95"
            title="Settings"
          >
            {settings.avatarEmoji}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'arena' && <Arena />}
        {activeTab === 'habits' && <Habits />}
        {activeTab === 'intel' && <Intel />}
        {activeTab === 'mindset' && <Mindset />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onAddClick={() => setIsAddModalOpen(true)} />
      
      {isAddModalOpen && <AddHabitModal onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
}
