import { format, subDays } from 'date-fns';
import { useStore } from './store';

export function calculateForgeScore(date: string): number {
  const state = useStore.getState();
  const logs = state.logs.filter(l => l.date === date);
  const dailyData = state.daily[date] || {};
  const currentHabits = state.habits.filter(h => !h.archived);

  let eligibleHabits = currentHabits;

  if (dailyData.gamePlan && dailyData.gamePlan.skipList) {
    const skipList = dailyData.gamePlan.skipList as string[];
    eligibleHabits = currentHabits.filter(h => !skipList.includes(h.name));
  }

  let denominator = eligibleHabits.length;
  let numerator = 0;

  if (dailyData.survivalMode && dailyData.survivalHabits && dailyData.survivalHabits.length > 0) {
    denominator = dailyData.survivalHabits.length;
    numerator = dailyData.survivalHabits.filter(id => logs.find(l => l.habitId === id && l.completed)).length;
  } else {
    numerator = eligibleHabits.filter(h => logs.find(l => l.habitId === h.id && l.completed)).length;
  }

  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export function getMomentumData() {
  const last7 = [];
  const prior7 = [];
  
  for(let i=0; i<7; i++) {
    last7.push(calculateForgeScore(format(subDays(new Date(), i), 'yyyy-MM-dd')));
    prior7.push(calculateForgeScore(format(subDays(new Date(), i + 7), 'yyyy-MM-dd')));
  }

  const last7Avg = last7.reduce((a, b) => a + b, 0) / 7;
  const prior7Avg = prior7.reduce((a, b) => a + b, 0) / 7;

  let momentum = 0;
  if (prior7Avg > 0) {
    momentum = ((last7Avg - prior7Avg) / prior7Avg) * 100;
  } else if (last7Avg > 0) {
    momentum = 100;
  }

  return { momentum: Math.round(momentum), last7Avg: Math.round(last7Avg), prior7Avg: Math.round(prior7Avg) };
}
