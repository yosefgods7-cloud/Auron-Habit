import { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { getMomentumData } from '../lib/momentum';
import { callGemini } from '../lib/gemini';
import { cn } from '../lib/utils';

export function AnalyticsDashboard() {
  const habits = useStore(state => state.habits);
  const logs = useStore(state => state.logs);
  const daily = useStore(state => state.daily);
  const settings = useStore(state => state.settings);

  // 1. Radar Chart Data (Hexagonal category metrics)
  const categoryData = useMemo(() => {
    const categories: Record<string, { total: number, completed: number }> = {};
    const activeHabits = habits.filter(h => !h.archived);
    
    // Initialize
    activeHabits.forEach(h => {
      categories[h.category] = { total: 0, completed: 0 };
    });

    const now = new Date();
    const last30Days = eachDayOfInterval({ start: subDays(now, 30), end: now }).map(d => format(d, 'yyyy-MM-dd'));

    last30Days.forEach(date => {
      activeHabits.forEach(h => {
        if (!categories[h.category]) categories[h.category] = { total: 0, completed: 0 };
        categories[h.category].total += 1;
        
        const log = logs.find(l => l.habitId === h.id && l.date === date);
        if (log && log.completed) {
          categories[h.category].completed += 1;
        }
      });
    });

    return Object.entries(categories).map(([category, stats]) => ({
      category,
      score: stats.total > 0 ? Math.round((stats.completed / (stats.total || 1)) * 100) : 0,
      fullMark: 100
    }));
  }, [habits, logs]);

  // 2. Emotional Regulation Graph (Mood / ForgeScore)
  const timeRange = 14;
  const moodData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, timeRange - 1), end: now }).map(d => format(d, 'yyyy-MM-dd'));
    
    return days.map(day => {
      const dData = daily[day];
      return {
        date: format(parseISO(day), 'MMM d'),
        mood: dData?.mood || null, // Out of 10
        forgeScore: dData?.forgeScore || null
      };
    });
  }, [daily, timeRange]);

  // 3. Calendar Contribution Graph Data
  const calendarData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 89), end: now }).map(d => format(d, 'yyyy-MM-dd'));
    
    const activeHabits = habits.filter(h => !h.archived);
    
    return days.map(day => {
      let completed = 0;
      let total = activeHabits.length;
      
      activeHabits.forEach(h => {
        const log = logs.find(l => l.habitId === h.id && l.date === day);
        if (log && log.completed) completed++;
      });

      const rate = total > 0 ? completed / total : 0;
      return {
        date: day,
        rate,
        level: rate === 0 ? 0 : rate <= 0.4 ? 1 : rate <= 0.7 ? 2 : rate < 1 ? 3 : 4
      };
    });
  }, [habits, logs]);

  // 4. Inter-Analysis System (Correlations)
  const correlations = useMemo(() => {
    const activeHabits = habits.filter(h => !h.archived);
    const categoryLog: Record<string, { [date: string]: number }> = {};
    
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 30), end: now }).map(d => format(d, 'yyyy-MM-dd'));

    // Compute daily rates per category
    days.forEach(day => {
      const cats: Record<string, {c:number, t:number}> = {};
      activeHabits.forEach(h => {
        if (!cats[h.category]) cats[h.category] = {c:0, t:0};
        cats[h.category].t++;
        const log = logs.find(l => l.habitId === h.id && l.date === day);
        if (log && log.completed) cats[h.category].c++;
      });
      
      Object.entries(cats).forEach(([cat, stats]) => {
        if (!categoryLog[cat]) categoryLog[cat] = {};
        categoryLog[cat][day] = stats.t > 0 ? stats.c / stats.t : 0;
      });
    });

    const categories = Object.keys(categoryLog);
    const insights: string[] = [];

    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        if (i === j) continue;
        const catA = categories[i];
        const catB = categories[j];
        
        let lowADays = 0;
        let bAlsoLow = 0;

        days.forEach(day => {
          if (categoryLog[catA][day] < 0.5) {
            lowADays++;
            if (categoryLog[catB][day] < 0.5) bAlsoLow++;
          }
        });

        if (lowADays >= 3 && (bAlsoLow / lowADays) > 0.7) {
          insights.push(`When your **${catA}** habits fail, your **${catB}** habits fail ${Math.round((bAlsoLow / lowADays) * 100)}% of the time.`);
        }
      }
    }
    
    return Array.from(new Set(insights)).slice(0, 3); // Top 3 correls
  }, [habits, logs]);

  // Momentum Stats
  const { momentum, last7Avg, prior7Avg } = getMomentumData();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    const key = process.env.GEMINI_API_KEY || settings.geminiKey;
    if (!key) {
      alert("Please configure your free Gemini API key in Settings -> AI");
      return;
    }
    setIsLoading(true);
    try {
      const dataPayload = {
        momentum: { last7Avg, prior7Avg, trajectory: momentum },
        categoryStrengths: categoryData.map(c => `${c.category}: ${c.score}%`),
        cascadingFailures: correlations
      };

      const text = await callGemini(
        `Act as an elite behavioral analyst. Look at my exact metrics:
${JSON.stringify(dataPayload, null, 2)}

Provide EXACTLY three distinct paragraphs:
**ARCHETYPE PERFORMANCE**: Brutally analyze what category forms my strongest vector and which category is dragging my entire system down. Use specific percentages.
**CASCADING VECTORS**: Find the correlation. Explain exactly why failing at one specific group is causing a negative chain reaction to another group. Name the groups.
**TACTICAL PROTOCOL DRAFT**: Supply one intensely specific new daily challenge/rule I must enforce starting immediately to patch the weakest link. Limit to concise tactical output. Max 200 words total.`,
        350,
        `deep_analytics_${new Date().toISOString().split('T')[0]}`
      );
      setAnalysis(text);
    } catch (e: any) {
      alert(e.message || "Analysis failed");
      console.error(e);
    }
    setIsLoading(false);
  };

  const getCellColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-app-elevated border border-app-border';
      case 1: return 'bg-app-danger/30 border border-app-danger/50';
      case 2: return 'bg-app-orange/40 border border-app-orange/50';
      case 3: return 'bg-app-success/60 border border-app-success/50';
      case 4: return 'bg-app-success border border-app-success shadow-[0_0_8px_rgba(0,255,0,0.5)]';
      default: return 'bg-app-elevated border border-app-border';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Momentum Score (Existing feature integrated) */}
      <div className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-app-text-muted mb-4 md:mb-6">Momentum Score</h3>
        <div className="flex items-center gap-2 md:gap-6">
          <div className="flex-1 text-center">
            <p className="text-app-text-main text-2xl md:text-3xl font-mono font-bold">{prior7Avg}%</p>
            <p className="text-[9px] md:text-[10px] text-app-text-muted uppercase mt-1">Prev 7 Days</p>
          </div>
          <div className="flex-1 text-center flex flex-col items-center">
            <span className={cn("text-xl md:text-2xl font-bold px-2 md:px-4 py-1 rounded", 
               momentum > 0 ? "text-app-success bg-app-success bg-opacity-10" : momentum < 0 ? "text-app-danger bg-app-danger bg-opacity-10" : "text-app-orange bg-app-orange bg-opacity-10"
            )}>
               {momentum > 0 ? '+' : ''}{momentum}%
            </span>
            <p className="text-[9px] md:text-[10px] text-app-text-muted uppercase mt-2">Trajectory</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-app-text-main text-2xl md:text-3xl font-mono font-bold">{last7Avg}%</p>
            <p className="text-[9px] md:text-[10px] text-app-text-muted uppercase mt-1">Last 7 Days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Hexagonal Metric (Category Radar) */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-app-primary mb-2">Category Mastery (30d)</h3>
          <div className="w-full h-64 md:h-72 center flex items-center justify-center -ml-4">
            {categoryData.length >= 3 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#888', fontSize: 10, textTransform: 'uppercase' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Completion %" dataKey="score" stroke="#00FFE0" fill="#00FFE0" fillOpacity={0.2} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }}
                    itemStyle={{ color: '#00FFE0' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
               <p className="text-xs text-app-text-muted">Not enough active categories to map radar.</p>
            )}
          </div>
        </div>

        {/* 3. Operational Calendar (Heatmap) */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 flex flex-col justify-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-app-primary mb-4">90-Day Operational Matrix</h3>
          <div className="flex flex-wrap gap-1 mx-auto justify-center max-w-[200px] md:max-w-[400px]">
            {calendarData.map((d, i) => (
              <div 
                key={d.date} 
                title={`${d.date}: ${Math.round(d.rate * 100)}% completion`}
                className={cn("w-3 h-3 md:w-3.5 md:h-3.5 rounded-[2px] transition-all", getCellColor(d.level))}
              />
            ))}
          </div>
          <div className="flex justify-between items-center mt-6 text-[10px] text-app-text-muted px-2">
            <span>Older</span>
            <div className="flex gap-1 items-center">
              <span>Low</span>
              <div className="w-2 h-2 bg-app-danger/30 rounded-sm"></div>
              <div className="w-2 h-2 bg-app-orange/40 rounded-sm"></div>
              <div className="w-2 h-2 bg-app-success/60 rounded-sm"></div>
              <div className="w-2 h-2 bg-app-success rounded-sm"></div>
              <span>High</span>
            </div>
            <span>Newer</span>
          </div>
        </div>
      </div>

      {/* 4. Emotional Regulation Graph */}
      <div className="bg-app-surface border border-app-border rounded-xl p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-app-primary mb-4">Emotional Regulation (14d Map)</h3>
        <p className="text-xs text-app-text-muted md:px-2 mb-6">Tracking your logged Mindset mood against your daily Forge XP score.</p>
        <div className="w-full h-48 md:h-64">
           <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" fontSize={10} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#666" fontSize={10} domain={[0, 10]} hide />
                <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={10} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }}
                  labelStyle={{ color: '#888' }}
                />
                <Line yAxisId="left" type="monotone" name="Mood (0-10)" dataKey="mood" stroke="#FFC107" strokeWidth={2} dot={{ r: 3, fill: '#FFC107' }} connectNulls />
                <Line yAxisId="right" type="monotone" name="Forge Score" dataKey="forgeScore" stroke="#00FFE0" strokeWidth={2} dot={false} connectNulls opacity={0.5} />
              </LineChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Inter-Analysis Correlation & Gemini Analysis */}
      <div className="bg-app-surface border border-app-border rounded-xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-app-primary mb-2">Inter-Analysis & Deep Metrics</h3>
        
        {correlations.length > 0 && (
          <div className="bg-app-danger/10 border border-app-danger/30 rounded p-4 mb-6 mt-4">
            <span className="text-[10px] font-bold uppercase text-app-danger mb-2 block">Cascading Failure Detected</span>
            <ul className="text-xs text-app-text-main space-y-2 list-disc pl-4">
              {correlations.map((c, i) => (
                 <li key={i} dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<span class="text-app-danger font-bold">$1</span>') }} />
              ))}
            </ul>
          </div>
        )}

        {analysis ? (
          <div className="text-sm text-app-text-main font-sans leading-relaxed mt-4 space-y-4">
            {analysis.split('\n').filter(p => p.trim()).map((paragraph, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-app-primary">$1</strong>') }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 mt-2">
            <p className="text-xs text-app-text-muted mb-4 md:px-12 leading-relaxed">
              Run a complete Gemini deep-scan on your category performance, momentum trajectories, and failure correlations. Identifies weaknesses and generates a recovery protocol.
            </p>
            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="px-6 py-2 bg-app-white text-app-black font-bold uppercase text-xs rounded hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Scanning Data Vectors...' : 'Run Deep Analytics Scan'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
