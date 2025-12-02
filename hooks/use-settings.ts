
"use client";

import { useCallback } from 'react';

const SETTINGS_KEY = 'factusolApiSettings';

export type ApiSettings = {
  codfab: string;
  codcli: string;
  basedatos: string;
  password?: string;
};

const defaultSettings: ApiSettings = {
  codfab: '',
  codcli: '',
  basedatos: '',
  password: '',
};

export function useSettings() {
  // Use hardcoded credentials from environment variables
  const settings: ApiSettings = {
    codfab: process.env.NEXT_PUBLIC_FACTUSOL_CODFAB || '1078',
    codcli: process.env.NEXT_PUBLIC_FACTUSOL_CODCLI || '57237',
    basedatos: process.env.NEXT_PUBLIC_FACTUSOL_BASEDATOS || 'FS150',
    password: process.env.NEXT_PUBLIC_FACTUSOL_PASSWORD || 'AiQe4HeWrj6Q',
  };

  const isSettingsLoaded = true;
  const areSettingsSet = true;

  // No-op functions since settings are hardcoded
  const saveSettings = useCallback(() => { }, []);
  const reloadSettings = useCallback(() => { }, []);

  return { settings, saveSettings, isSettingsLoaded, reloadSettings, areSettingsSet };
}


