import { useState } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';

export function Settings() {
  const { settings, meta, updateSettings } = useStore();
  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'error'>('none');
  const [testMsg, setTestMsg] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const safeMeta = meta || {};
  const safeUsage = safeMeta.geminiUsage || {};
  const usageToday = safeUsage[today] || { requests: 0, tokensIn: 0, tokensOut: 0 };
  const reqPct = Math.min(100, Math.round((usageToday.requests / 15) * 100));
  const tokenPct = Math.min(100, Math.round((usageToday.tokensOut / 50000) * 100));

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsTesting(true);
    setTestResult('none');
    
    // Temporarily set it to test
    const prevKey = settings.geminiKey;
    updateSettings({ geminiKey: apiKeyInput.trim() });
    
    try {
      await callGemini('Say exactly "OK"', 10, null, true);
      setTestResult('success');
      setTestMsg('Key validated successfully!');
      setTimeout(() => setTestResult('none'), 3000);
    } catch (err: any) {
      setTestResult('error');
      setTestMsg(err.message);
      updateSettings({ geminiKey: prevKey }); // Revert
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveKey = () => {
    updateSettings({ geminiKey: null });
    setApiKeyInput('');
    setTestResult('none');
  };

  const handleExport = () => {
    const data = localStorage.getItem('auron-storage');
    const blob = new Blob([data || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auron_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result as string;
            JSON.parse(json); // Validate it is somewhat valid JSON
            localStorage.setItem('auron-storage', json);
            window.location.reload();
        } catch (err) {
            alert('Invalid backup file. Make sure it is an official AURON backup.');
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-[#7c6aff]">Identity Pipeline</h2>
        <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Codename</label>
              <input 
                value={settings.userName}
                onChange={e => updateSettings({ userName: e.target.value })}
                className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Avatar (Emoji)</label>
              <input 
                value={settings.avatarEmoji}
                onChange={e => updateSettings({ avatarEmoji: e.target.value })}
                className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#7a7a9a] uppercase mb-1">Core Identity Statement</label>
            <textarea 
              value={settings.identityStatement || ''}
              onChange={e => updateSettings({ identityStatement: e.target.value })}
              className="w-full bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff] h-20 resize-none font-italic"
              placeholder="E.g. I am someone who acts despite fear..."
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 flex items-center gap-2">
          <span className="text-[#7c6aff]">✦</span> AURON Intelligence
        </h2>
        <div className="bg-[#13131a] border-l-4 border-l-[#7c6aff] border-[#2a2a3a] rounded-xl p-4 md:p-6 space-y-6">
          <p className="text-sm text-[#7a7a9a]">
            Connect the free Gemini API to unlock advanced habit coaching, mindset analysis, and personalized daily briefings.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-[#e8e8f0] uppercase">Gemini API Key</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-[#7c6aff] hover:underline">
                Get free key →
              </a>
            </div>
            <div className="flex gap-2">
              <input 
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-[#1c1c27] border border-[#2a2a3a] rounded p-3 text-white focus:outline-none focus:border-[#7c6aff]"
              />
              {settings.geminiKey ? (
                <button 
                  onClick={handleRemoveKey}
                  className="px-4 bg-[#2a2a3a] text-[#ff6b6b] rounded font-bold hover:bg-[#ff6b6b] hover:text-white transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={handleTestKey}
                  disabled={isTesting || !apiKeyInput.trim()}
                  className="px-6 bg-[#7c6aff] text-white rounded font-bold hover:bg-[#6a58f0] transition-colors disabled:opacity-50"
                >
                  {isTesting ? '✦ Testing...' : 'Save & Test'}
                </button>
              )}
            </div>
            {testResult === 'success' && <p className="text-xs text-[#22d37a]">✓ {testMsg}</p>}
            {testResult === 'error' && <p className="text-xs text-[#ff6b6b]">✗ {testMsg}</p>}
          </div>

          {settings.geminiKey && (
            <div className="pt-4 border-t border-[#2a2a3a] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#e8e8f0]">Today's Usage</h3>
                <span className="text-[10px] text-[#7a7a9a] uppercase tracking-wider">Resets at midnight</span>
              </div>
              
              <div className="space-y-3 px-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#7a7a9a]">Requests</span>
                    <span className="font-mono">{usageToday.requests}/15</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1c1c27] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c6aff] transition-all" style={{ width: `${reqPct}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#7a7a9a]">Output Tokens</span>
                    <span className="font-mono">{usageToday.tokensOut}/50k</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1c1c27] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d4ff] transition-all" style={{ width: `${tokenPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-[#7c6aff]">System Data</h2>
        <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-4 md:p-6 space-y-4 text-sm">
          <p className="text-[#7a7a9a] mb-4">
            AURON is fully offline-first. All your data is stored locally on this device. Use these tools to back up your progress across devices.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={handleExport}
              className="flex-1 py-3 bg-[#1c1c27] border border-[#2a2a3a] rounded font-bold hover:bg-[#2a2a3a] transition-colors text-white"
            >
              Export Backup
            </button>
            <label className="flex-1 py-3 bg-[#1c1c27] border border-[#2a2a3a] rounded font-bold hover:bg-[#2a2a3a] transition-colors text-white text-center cursor-pointer">
              <span>Import Backup</span>
              <input 
                type="file" 
                accept="application/json" 
                className="hidden" 
                onChange={handleImport}
              />
            </label>
          </div>
          <p className="text-[10px] text-orange-500 uppercase font-bold text-center mt-2">Warning: Importing a backup will overwrite current data</p>
        </div>
      </div>
    </div>
  );
}
