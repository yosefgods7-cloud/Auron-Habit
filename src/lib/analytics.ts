import { useStore } from './store';

export function getProtocolPerformance() {
    const state = useStore.getState();
    const habits = state.habits;
    const logs = state.logs;

    const protocols = Array.from(new Set(habits.map(h => h.protocol)));
    
    // Group habits by protocol
    const habitMap = habits.reduce((acc, h) => {
        if (!acc[h.protocol]) acc[h.protocol] = [];
        acc[h.protocol].push(h);
        return acc;
    }, {} as Record<string, typeof habits>);

    const performance = protocols.map(protocol => {
        const pHabits = habitMap[protocol];
        const totalPossible = pHabits.length * 30; // Last 30 days
        const completed = logs.filter(l => 
            pHabits.find(h => h.id === l.habitId) && 
            l.completed &&
            new Date(l.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length;
        
        return {
            protocol,
            score: (completed / totalPossible) * 100
        };
    });

    return performance;
}

export function getProtocolInteraction() {
    // This requires cross-referencing logs for different protocols on the same day
    const state = useStore.getState();
    // ... logic to calculate correlation ...
    return [];
}
