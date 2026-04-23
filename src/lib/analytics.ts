import { useStore } from './store';

export function getKeystoneHabits() {
    const state = useStore.getState();
    const habits = state.habits;
    const logs = state.logs;

    if (habits.length === 0) return [];

    // Calculate correlation between each habit and overall success (ForgeScore)
    // A keystone habit is one whose completion correlates highest with overall daily success.
    
    return habits.map(h => {
        const habitLogs = logs.filter(l => l.habitId === h.id);
        // Simplified correlation: (days completed AND day successful) / (days completed)
        // This is a placeholder for a more complex correlation matrix
        return {
            name: h.name,
            impact: Math.random() // Placeholder for actual correlation logic
        };
    }).sort((a, b) => b.impact - a.impact).slice(0, 3);
}

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
