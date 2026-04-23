import { format, subDays, isSameDay } from 'date-fns';
import { calculateForgeScore } from '../lib/momentum';
import { cn } from '../lib/utils';

export function MetricsCalendar() {
    const days = Array.from({ length: 30 }).map((_, i) => subDays(new Date(), 29 - i));
    
    return (
        <div className="bg-app-surface p-4 rounded-xl border border-app-border">
            <h3 className="text-xs font-bold uppercase tracking-widest text-app-text-muted mb-4">30-Day Consistency</h3>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const score = calculateForgeScore(dateStr);
                    let color = 'bg-app-elevated';
                    if (score >= 80) color = 'bg-app-success';
                    else if (score >= 40) color = 'bg-app-primary';
                    else if (score > 0) color = 'bg-app-orange';
                    
                    return (
                        <div 
                            key={i} 
                            className={cn("w-6 h-6 rounded-sm", color)} 
                            title={`${format(day, 'MMM d')}: ${score}%`}
                        />
                    );
                })}
            </div>
            <div className="flex gap-2 text-[10px] text-app-text-muted mt-3">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-app-success rounded-sm"/>High</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-app-primary rounded-sm"/>Mid</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-app-orange rounded-sm"/>Low</span>
            </div>
        </div>
    );
}
