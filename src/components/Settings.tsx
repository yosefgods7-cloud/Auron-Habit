import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { callGemini } from '../lib/gemini';
import { Vault } from '../lib/vault';
import { Shield, ShieldCheck } from 'lucide-react';

export function Settings() {
  const { settings, meta, updateSettings } = useStore();
  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'error'>('none');
  const [testMsg, setTestMsg] = useState('');
  
  // Security State
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [isSettingUpVault, setIsSettingUpVault] = useState(false);
  const [vaultMain, setVaultMain] = useState('');
  const [vaultRecovery, setVaultRecovery] = useState('');
  const [vaultError, setVaultError] = useState('');

  useEffect(() => {
    Vault.isEnabled().then(setVaultEnabled);
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const safeMeta = meta || {};
  const safeUsage = (safeMeta as any).geminiUsage || {};
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

  const handleSetupVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultMain.length < 4 || vaultRecovery.length < 4) {
      setVaultError('Passwords must be at least 4 characters');
      return;
    }
    if (vaultMain === vaultRecovery) {
      setVaultError('Main and Recovery must be different');
      return;
    }
    
    await Vault.setup(vaultMain, vaultRecovery);
    setVaultEnabled(true);
    setIsSettingUpVault(false);
    setVaultMain('');
    setVaultRecovery('');
    setVaultError('');
  };

  const handleDisableVault = async () => {
    const confirmPass = prompt('Enter your main password to disable security:');
    if (!confirmPass) return;
    
    const result = await Vault.verify(confirmPass);
    if (result === 'main' || result === 'recovery') {
      await Vault.disable();
      setVaultEnabled(false);
    } else {
      alert('Incorrect password. Security remains active.');
    }
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

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
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
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-app-primary">Identity Pipeline</h2>
        <div className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Codename</label>
              <input 
                value={settings.userName}
                onChange={e => updateSettings({ userName: e.target.value })}
                className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Avatar (Emoji)</label>
              <input 
                value={settings.avatarEmoji}
                onChange={e => updateSettings({ avatarEmoji: e.target.value })}
                className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Core Identity Statement</label>
            <textarea 
              value={settings.identityStatement || ''}
              onChange={e => updateSettings({ identityStatement: e.target.value })}
              className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary h-20 resize-none font-italic"
              placeholder="E.g. I am someone who acts despite fear..."
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-app-primary">Interface Theme</h2>
        <div className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {[
               { id: 'obsidian', name: 'Obsidian', icon: '🌑' },
               { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌃' },
               { id: 'sakura', name: 'Sakura', icon: '🌸' },
               { id: 'ivory', name: 'Ivory', icon: '🕊️' }
             ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => updateSettings({ theme: theme.id })}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    settings.theme === theme.id 
                    ? 'border-app-primary bg-app-elevated' 
                    : 'border-app-border bg-app-bg hover:border-app-text-muted hover:bg-app-elevated'
                  }`}
                >
                  <span className="text-2xl">{theme.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-app-text-main">{theme.name}</span>
                </button>
             ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-app-primary flex items-center gap-2">
          <Shield className="w-5 h-5" /> Base Security
        </h2>
        <div className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-app-text-main flex items-center gap-2">
                Launch Shield
                {vaultEnabled && <ShieldCheck className="w-4 h-4 text-app-success" />}
              </p>
              <p className="text-xs text-app-text-muted mt-1">
                Require a password to open AURON. Protected by a fallback recovery key.
              </p>
            </div>
            {!vaultEnabled && !isSettingUpVault && (
              <button 
                onClick={() => setIsSettingUpVault(true)}
                className="px-4 py-2 bg-app-primary text-white rounded font-bold hover:bg-[#6a58f0] transition-colors whitespace-nowrap text-xs"
              >
                Enable Shield
              </button>
            )}
            {vaultEnabled && (
              <button 
                onClick={handleDisableVault}
                className="px-4 py-2 bg-app-elevated border border-app-border text-app-danger rounded font-bold hover:bg-app-danger hover:text-white transition-colors whitespace-nowrap text-xs"
              >
                Disable
              </button>
            )}
          </div>

          {isSettingUpVault && !vaultEnabled && (
            <form onSubmit={handleSetupVault} className="pt-4 border-t border-app-border space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Primary Password</label>
                  <input 
                    type="password"
                    value={vaultMain}
                    onChange={e => setVaultMain(e.target.value)}
                    placeholder="Enter main code"
                    className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-app-text-muted uppercase mb-1 flex justify-between">
                    Recovery Password
                    <span className="text-app-orange">Keep this safe</span>
                  </label>
                  <input 
                    type="password"
                    value={vaultRecovery}
                    onChange={e => setVaultRecovery(e.target.value)}
                    placeholder="Enter backup code"
                    className="w-full bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  />
                </div>
              </div>
              {vaultError && <p className="text-app-danger text-xs font-bold">{vaultError}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsSettingUpVault(false); setVaultError(''); }}
                  className="px-4 py-2 text-app-text-muted text-xs font-bold uppercase transition-colors hover:text-app-text-main"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-app-primary text-white rounded font-bold hover:bg-[#6a58f0] transition-colors"
                >
                  Engage Security
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 flex items-center gap-2">
          <span className="text-app-primary">✦</span> AURON Intelligence
        </h2>
        <div className="bg-app-surface border-l-4 border-l-[var(--color-app-primary)] border-app-border rounded-xl p-4 md:p-6 space-y-6">
          <p className="text-sm text-app-text-muted">
            Connect the free Gemini API to unlock advanced habit coaching, mindset analysis, and personalized daily briefings.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-app-text-main uppercase">Gemini API Key</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-app-primary hover:underline">
                Get free key →
              </a>
            </div>
            <div className="flex gap-2">
              <input 
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-app-elevated border border-app-border rounded p-3 text-white focus:outline-none focus:border-app-primary"
              />
              {settings.geminiKey ? (
                <button 
                  onClick={handleRemoveKey}
                  className="px-4 bg-app-border text-app-danger rounded font-bold hover:bg-app-danger hover:text-white transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={handleTestKey}
                  disabled={isTesting || !apiKeyInput.trim()}
                  className="px-6 bg-app-primary text-white rounded font-bold hover:bg-[#6a58f0] transition-colors disabled:opacity-50"
                >
                  {isTesting ? '✦ Testing...' : 'Save & Test'}
                </button>
              )}
            </div>
            {testResult === 'success' && <p className="text-xs text-app-success">✓ {testMsg}</p>}
            {testResult === 'error' && <p className="text-xs text-app-danger">✗ {testMsg}</p>}
          </div>

          {settings.geminiKey && (
            <div className="pt-4 border-t border-app-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-app-text-main">Today's Usage</h3>
                <span className="text-[10px] text-app-text-muted uppercase tracking-wider">Resets at midnight</span>
              </div>
              
              <div className="space-y-3 px-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-app-text-muted">Requests</span>
                    <span className="font-mono">{usageToday.requests}/15</span>
                  </div>
                  <div className="w-full h-1.5 bg-app-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-app-primary transition-all" style={{ width: `${reqPct}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-app-text-muted">Output Tokens</span>
                    <span className="font-mono">{usageToday.tokensOut}/50k</span>
                  </div>
                  <div className="w-full h-1.5 bg-app-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-app-info transition-all" style={{ width: `${tokenPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-app-primary">System Data</h2>
        <div className="bg-app-surface border border-app-border rounded-xl p-4 md:p-6 space-y-4 text-sm">
          <p className="text-app-text-muted mb-4">
            AURON is fully offline-first. All your data is stored locally on this device. Use these tools to back up your progress across devices.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={handleExport}
              className="flex-1 py-3 bg-app-elevated border border-app-border rounded font-bold hover:bg-app-border transition-colors text-white"
            >
              Export Backup
            </button>
            <label className="flex-1 py-3 bg-app-elevated border border-app-border rounded font-bold hover:bg-app-border transition-colors text-white text-center cursor-pointer">
              <span>Import Backup</span>
              <input 
                type="file" 
                accept="application/json" 
                className="hidden" 
                onChange={handleImport}
              />
            </label>
          </div>
          <p className="text-[10px] text-app-orange uppercase font-bold text-center mt-2">Warning: Importing a backup will overwrite current data</p>
        </div>
      </div>
    </div>
  );
}
