import * as React from 'react';

type SoundSettingsContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  chaChingEnabled: boolean;
  setChaChingEnabled: (enabled: boolean) => void;
};

const SoundSettingsContext = React.createContext<SoundSettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'dashboard-sounds-enabled';
const CHA_CHING_KEY = 'dashboard-cha-ching-enabled';

export function SoundSettingsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return false;
  });

  const [chaChingEnabled, setChaChingEnabledState] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(CHA_CHING_KEY);
    if (stored === 'false') return false;
    return true;
  });

  const setEnabled = React.useCallback((next: boolean) => {
    setEnabledState(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const setChaChingEnabled = React.useCallback((next: boolean) => {
    setChaChingEnabledState(next);
    localStorage.setItem(CHA_CHING_KEY, String(next));
  }, []);

  const value = React.useMemo(() => ({ enabled, setEnabled, chaChingEnabled, setChaChingEnabled }), [enabled, setEnabled, chaChingEnabled, setChaChingEnabled]);

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
}

export function useSoundSettings() {
  const ctx = React.useContext(SoundSettingsContext);
  if (!ctx) throw new Error('useSoundSettings must be used within SoundSettingsProvider');
  return ctx;
}

