import { Preferences } from '@capacitor/preferences';

// Web Crypto API based SHA-256 hach because it's native and zero-dependency
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const MAIN_KEY = 'auron_vault_main';
const RECOVERY_KEY = 'auron_vault_recovery';
const ENABLED_KEY = 'auron_vault_enabled';

export const Vault = {
  async setup(mainPass: string, recoveryPass: string) {
    const mainHash = await hashPassword(mainPass);
    const recoveryHash = await hashPassword(recoveryPass);
    
    await Preferences.set({ key: MAIN_KEY, value: mainHash });
    await Preferences.set({ key: RECOVERY_KEY, value: recoveryHash });
    await Preferences.set({ key: ENABLED_KEY, value: 'true' });
  },

  async verify(password: string): Promise<'main' | 'recovery' | 'fail'> {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) return 'main'; // If not setup, let them through

    const inputHash = await hashPassword(password);
    
    const { value: mainHash } = await Preferences.get({ key: MAIN_KEY });
    if (mainHash === inputHash) return 'main';
    
    const { value: recoveryHash } = await Preferences.get({ key: RECOVERY_KEY });
    if (recoveryHash === inputHash) return 'recovery';
    
    return 'fail';
  },

  async isEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: ENABLED_KEY });
    return value === 'true';
  },

  async disable() {
    await Preferences.remove({ key: MAIN_KEY });
    await Preferences.remove({ key: RECOVERY_KEY });
    await Preferences.remove({ key: ENABLED_KEY });
  }
};
