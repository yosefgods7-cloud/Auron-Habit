import { useState, useEffect } from 'react';
import { Vault } from '../lib/vault';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Setup state
  const [setupMain, setSetupMain] = useState('');
  const [setupRecovery, setSetupRecovery] = useState('');
  
  // Login state
  const [inputPass, setInputPass] = useState('');
  const [error, setError] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    Vault.isEnabled().then(enabled => {
      setIsSetup(enabled);
      setLoading(false);
      // Immediately unlock if not enabled
      if (!enabled) onUnlock();
    });
  }, [onUnlock]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupMain.length < 4 || setupRecovery.length < 4) {
      setError('Passwords must be at least 4 characters');
      return;
    }
    if (setupMain === setupRecovery) {
      setError('Main and Recovery passwords must be different');
      return;
    }
    
    await Vault.setup(setupMain, setupRecovery);
    onUnlock();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await Vault.verify(inputPass);
    if (result === 'main') {
      onUnlock();
    } else if (result === 'recovery') {
      Vault.disable(); // Disable the vault if recovery is used so they can set new passwords
      alert('Recovery password used. Please setup your security vault again in settings.');
      onUnlock();
    } else {
      setError('Incorrect password');
      setInputPass('');
    }
  };

  if (loading || !isSetup) return null; // Wait for initial check

  return (
    <div className="fixed inset-0 z-[100] bg-app-bg flex flex-col items-center justify-center p-6 select-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
      <div className="w-full max-w-sm">
        
        <div className="flex flex-col items-center justify-center mb-10">
           {error ? <ShieldAlert className="w-16 h-16 text-app-danger mb-4" /> : <Shield className="w-16 h-16 text-app-primary mb-4" />}
           <h1 className="text-3xl font-bold tracking-tighter uppercase text-app-text-main text-center">
             {isRecoveryMode ? 'Recovery Mode' : 'Vault Locked'}
           </h1>
           <p className="text-app-text-muted text-center mt-2">
             {isRecoveryMode ? 'Enter your secondary recovery password.' : 'Enter your primary password to continue.'}
           </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="password"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
            placeholder={isRecoveryMode ? "Recovery Password" : "Main Password"}
            className="w-full bg-app-elevated border border-app-border rounded-lg p-4 text-center text-xl tracking-[0.3em] font-mono text-app-text-main focus:outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary placeholder:tracking-normal placeholder:font-sans placeholder:text-app-text-muted"
            autoFocus
          />
          {error && <p className="text-app-danger text-sm font-bold text-center mt-1">{error}</p>}
          
          <button 
            type="submit"
            className="w-full py-4 mt-2 bg-app-primary text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
          >
            DECRYPT
          </button>
        </form>

        {!isRecoveryMode && (
          <button 
            onClick={() => { setIsRecoveryMode(true); setError(''); setInputPass(''); }}
            className="w-full mt-6 text-app-text-muted text-sm font-bold uppercase transition-colors hover:text-app-text-main"
          >
            Use Recovery Password
          </button>
        )}
        {isRecoveryMode && (
          <button 
            onClick={() => { setIsRecoveryMode(false); setError(''); setInputPass(''); }}
            className="w-full mt-6 text-app-text-muted text-sm font-bold uppercase transition-colors hover:text-app-text-main"
          >
            Back to Main Password
          </button>
        )}
      </div>
    </div>
  );
}
