import { cn } from '../lib/utils';
import { useStore } from '../lib/store';

export function Navigation({ activeTab, setActiveTab, onAddClick }: { activeTab: string, setActiveTab: (t: any) => void, onAddClick: () => void }) {
  const addHabitBtn = activeTab === 'habits' || activeTab === 'arena';

  const navItems = [
    { id: 'arena', icon: '🏟', label: 'Arena' },
    { id: 'habits', icon: '⚡', label: 'Habits' },
    { id: 'intel', icon: '📊', label: 'Intel' },
    { id: 'mindset', icon: '🧠', label: 'Mindset' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#0d0d14] border-t border-[#2a2a3a] px-4 md:px-8 flex items-center justify-between z-50">
      {navItems.slice(0, 2).map((item) => (
        <button 
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === item.id ? "text-[#7c6aff]" : "text-[#7a7a9a]"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center text-xl">{item.icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
        </button>
      ))}

      <div className="relative -top-6">
         <button 
           className="w-14 h-14 bg-[#7c6aff] rounded-xl shadow-[0_0_20px_rgba(124,106,255,0.4)] flex items-center justify-center text-white text-3xl font-light border-2 border-[#0d0d14] active:scale-95 transition-transform"
           onClick={onAddClick}
         >
           +
         </button>
      </div>

      {navItems.slice(2).map((item) => (
        <button 
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === item.id ? "text-[#7c6aff]" : "text-[#7a7a9a]"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center text-xl">{item.icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
