/**
 * Spreadsheet Configuration Settings
 * Manages API URLs, authentication settings, and other configuration options
 */

export interface SpreadsheetSettings {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  auth: {
    enabled: boolean;
    provider: 'google' | 'custom';
    clientId?: string;
    scopes: string[];
    autoRefreshToken: boolean;
  };
  pivot: {
    maxRows: number;
    maxColumns: number;
    cacheEnabled: boolean;
    cacheTtl: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    locale: string;
    dateFormat: string;
    numberFormat: string;
    showDebugInfo: boolean;
  };
  export: {
    defaultFormat: 'csv' | 'excel' | 'pdf' | 'json';
    includeHeaders: boolean;
    includeSubtotals: boolean;
    includeGrandTotals: boolean;
  };
}

export const DEFAULT_SETTINGS: SpreadsheetSettings = {
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  auth: {
    enabled: false, // Will be enabled when JWT authentication is implemented
    provider: 'google',
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
    autoRefreshToken: true
  },
  pivot: {
    maxRows: 10000,
    maxColumns: 100,
    cacheEnabled: true,
    cacheTtl: 1800000, // 30 minutes
    autoRefresh: false,
    refreshInterval: 300000 // 5 minutes
  },
  ui: {
    theme: 'auto',
    locale: 'en-US',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: '#,##0.00',
    showDebugInfo: process.env.NODE_ENV === 'development'
  },
  export: {
    defaultFormat: 'csv',
    includeHeaders: true,
    includeSubtotals: true,
    includeGrandTotals: true
  }
};

/**
 * Settings manager class
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: SpreadsheetSettings;
  private listeners: Array<(settings: SpreadsheetSettings) => void> = [];

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Load settings from localStorage or use defaults
   */
  private loadSettings(): SpreadsheetSettings {
    try {
      const stored = localStorage.getItem('spreadsheet_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Merge stored settings with defaults to handle new settings
   */
  private mergeWithDefaults(stored: Partial<SpreadsheetSettings>): SpreadsheetSettings {
    return {
      api: { ...DEFAULT_SETTINGS.api, ...stored.api },
      auth: { ...DEFAULT_SETTINGS.auth, ...stored.auth },
      pivot: { ...DEFAULT_SETTINGS.pivot, ...stored.pivot },
      ui: { ...DEFAULT_SETTINGS.ui, ...stored.ui },
      export: { ...DEFAULT_SETTINGS.export, ...stored.export }
    };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('spreadsheet_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): SpreadsheetSettings {
    return { ...this.settings };
  }

  /**
   * Update settings partially
   */
  updateSettings(updates: Partial<SpreadsheetSettings>): void {
    this.settings = {
      api: { ...this.settings.api, ...updates.api },
      auth: { ...this.settings.auth, ...updates.auth },
      pivot: { ...this.settings.pivot, ...updates.pivot },
      ui: { ...this.settings.ui, ...updates.ui },
      export: { ...this.settings.export, ...updates.export }
    };

    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: SpreadsheetSettings) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of settings changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSettings());
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }

  /**
   * Validate API URL format
   */
  validateApiUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Test API connection
   */
  async testApiConnection(url?: string): Promise<boolean> {
    const testUrl = url || this.settings.api.baseUrl;

    try {
      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Import settings from JSON
   */
  importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      const merged = this.mergeWithDefaults(imported);
      this.settings = merged;
      this.saveSettings();
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export settings to JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }
}

/**
 * React hook for using settings
 */
export function useSettings(): [SpreadsheetSettings, (updates: Partial<SpreadsheetSettings>) => void] {
  const [settings, setSettings] = React.useState(() =>
    SettingsManager.getInstance().getSettings()
  );

  React.useEffect(() => {
    const manager = SettingsManager.getInstance();

    const unsubscribe = manager.subscribe(setSettings);

    return unsubscribe;
  }, []);

  const updateSettings = React.useCallback((updates: Partial<SpreadsheetSettings>) => {
    SettingsManager.getInstance().updateSettings(updates);
  }, []);

  return [settings, updateSettings];
}

/**
 * React hook for API settings specifically
 */
export function useApiSettings(): {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  updateApiUrl: (url: string) => void;
  testConnection: () => Promise<boolean>;
} {
  const [settings, updateSettings] = useSettings();

  const updateApiUrl = React.useCallback((url: string) => {
    updateSettings({
      api: { ...settings.api, baseUrl: url }
    });
  }, [settings.api, updateSettings]);

  const testConnection = React.useCallback(async () => {
    const manager = SettingsManager.getInstance();
    return manager.testApiConnection();
  }, []);

  return {
    ...settings.api,
    updateApiUrl,
    testConnection
  };
}

/**
 * Get settings manager instance
 */
export function getSettingsManager(): SettingsManager {
  return SettingsManager.getInstance();
}