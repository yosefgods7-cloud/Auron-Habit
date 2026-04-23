import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { ShieldAlert } from 'lucide-react';
import { Vault } from '../lib/vault';

export function Onboarding() {
  const [step, setStep] = useState<1 | 2>(1);
  const [mainPass, setMainPass] = useState('');
  const [recoveryPass, setRecoveryPass] = useState('');
  const [error, setError] = useState('');

  const handleSecuritySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mainPass.length < 4 || recoveryPass.length < 4) {
      setError('Passwords must be at least 4 characters');
      return;
    }
    if (mainPass === recoveryPass) {
      setError('Main and recovery passwords must be different');
      return;
    }

    try {
      await Vault.setup(mainPass, recoveryPass);
      setStep(2);
    } catch (err) {
      setError('Failed to setup native vault. Please try again.');
    }
  };

  const handleFinish = () => {
    useStore.getState().completeOnboarding('Warrior', '🦁', [
      {
        name: 'Cold Shower',
        icon: '🧊',
        category: 'Physical',
        protocol: 'Morning Warrior',
        frequency: { type: 'daily' },
        timeslot: 'morning',
        color: 'var(--color-app-success)',
        difficulty: 4,
        why: 'Discipline',
        reminderTime: null,
        graceDay: false
      },
      {
        name: 'Deep Work (2h)',
        icon: '💻',
        category: 'Productivity',
        protocol: 'Work',
        frequency: { type: 'daily' },
        timeslot: 'afternoon',
        color: 'var(--color-app-info)',
        difficulty: 5,
        why: 'Focus',
        reminderTime: null,
        graceDay: false
      }
    ]);
  };

  return (
    <div className="w-full h-full bg-app-bg text-app-text-main font-sans flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
      <h1 className="text-4xl font-bold tracking-tighter uppercase text-app-primary mb-2">AURON</h1>
      <p className="text-app-text-muted mb-8 tracking-widest text-sm uppercase">Forge Who You Become</p>

      <div className="w-full max-w-sm">
        {step === 1 && (
          <div className="bg-app-surface border border-app-border rounded-xl p-6 text-left animate-slide-up shadow-xl shadow-black/50">
            <h2 className="text-xl font-bold uppercase mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-app-primary" />
              Secure Your Data
            </h2>
            <p className="text-app-text-muted text-sm mb-6">
              AURON stores all data locally. Setup a vault password to encrypt your progress and prevent unauthorized access.
            </p>
            
            <form onSubmit={handleSecuritySetup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Primary Password</label>
                <input 
                  type="password"
                  value={mainPass}
                  onChange={e => setMainPass(e.target.value)}
                  placeholder="Enter a secure code"
                  className="w-full bg-app-elevated border border-app-border rounded-lg p-3 text-white focus:outline-none focus:border-app-primary font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-app-text-muted uppercase mb-1">Recovery Password</label>
                <input 
                  type="password"
                  value={recoveryPass}
                  onChange={e => setRecoveryPass(e.target.value)}
                  placeholder="Fallback code if forgotten"
                  className="w-full bg-app-elevated border border-app-border rounded-lg p-3 text-white focus:outline-none focus:border-app-primary font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                />
              </div>

              {error && <p className="text-app-danger text-xs font-bold text-center">{error}</p>}
              
              <button 
                type="submit"
                className="w-full py-3 mt-4 bg-app-primary text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
              >
                ENGAGE SHIELD
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up flex flex-col items-center">
            <div className="w-20 h-20 bg-app-success/20 rounded-full flex items-center justify-center mb-6">
               <ShieldAlert className="w-10 h-10 text-app-success" />
            </div>
            <h2 className="text-2xl font-bold uppercase mb-2">Vault Secured</h2>
            <p className="text-app-text-muted mb-8">
              Your perimeter is safe. Ready to begin training.
            </p>
            <button 
              onClick={handleFinish}
              className="px-8 py-3 bg-app-primary text-white font-bold rounded-lg shadow-[0_4px_16px_rgba(124,106,255,0.4)]"
            >
              INITIALIZE PROTOCOL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
