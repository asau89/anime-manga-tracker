/**
 * settings.js - localStorage persistence for user preferences.
 */
const SETTINGS_KEY = 'animind_settings_v1';

const DEFAULTS = {
  username:      'Player 1',
  aiModel:       null,          // null = auto-detect from Ollama
  scanlines:     true,
  theme:         'dark',        // future: 'dark' | 'light'
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(updates) {
  const current = getSettings();
  const merged  = { ...current, ...updates };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
  return { ...DEFAULTS };
}
