import { getProtocolPerformance } from '../lib/analytics';
import { cn } from '../lib/utils';

export function ProtocolAnalytics() {
    const perf = getProtocolPerformance();

    return (
        <div className="bg-app-surface p-4 rounded-xl border border-app-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-app-text-muted">Protocol Performance</h3>
            <div className="space-y-2">
                {perf.map(p => (
                    <div key={p.protocol} className="flex items-center gap-2">
                        <span className="text-xs w-20 truncate">{p.protocol}</span>
                        <div className="flex-1 h-3 bg-app-elevated rounded-full overflow-hidden">
                            <div className={cn("h-full", p.score > 70 ? "bg-app-success" : "bg-app-primary")} style={{width: `${p.score}%`}}/>
                        </div>
                        <span className="text-xs font-mono">{Math.round(p.score)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
