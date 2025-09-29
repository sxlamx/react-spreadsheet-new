import * as React from 'react';
import { PivotConfiguration, PivotField, AggregationFunction } from './types';

/** Configuration storage options */
export interface PivotConfigurationStorage {
  /** Storage type */
  type: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory' | 'custom';
  /** Custom storage implementation */
  customStorage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  /** Storage key prefix */
  keyPrefix?: string;
}

/** Saved pivot configuration */
export interface SavedPivotConfiguration {
  /** Unique identifier */
  id: string;
  /** Configuration name */
  name: string;
  /** Description */
  description?: string;
  /** Pivot configuration */
  configuration: PivotConfiguration;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Tags for categorization */
  tags?: string[];
  /** Whether this is a favorite */
  isFavorite?: boolean;
  /** Sharing settings */
  isShared?: boolean;
  /** Creator information */
  createdBy?: string;
}

/** Configuration validation result */
export interface ConfigurationValidation {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/** Configuration manager state */
export interface PivotConfigurationState {
  /** Current active configuration */
  activeConfiguration: PivotConfiguration | null;
  /** All saved configurations */
  savedConfigurations: SavedPivotConfiguration[];
  /** Configuration history for undo/redo */
  history: PivotConfiguration[];
  /** Current position in history */
  historyIndex: number;
  /** Whether configurations are loading */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Dirty state (unsaved changes) */
  isDirty: boolean;
  /** Auto-save enabled */
  autoSave: boolean;
}

/** Configuration change event */
export interface ConfigurationChangeEvent {
  /** Previous configuration */
  previous: PivotConfiguration | null;
  /** New configuration */
  current: PivotConfiguration;
  /** Change type */
  type: 'field-added' | 'field-removed' | 'field-moved' | 'field-modified' | 'filters-changed' | 'complete-replace';
  /** Timestamp */
  timestamp: number;
}

/** Hook for managing pivot configurations */
export function usePivotConfigurationManager(
  storage: PivotConfigurationStorage = { type: 'localStorage' },
  options: {
    maxHistorySize?: number;
    autoSave?: boolean;
    autoSaveDelay?: number;
    validateOnChange?: boolean;
  } = {}
): {
  state: PivotConfigurationState;
  setActiveConfiguration: (config: PivotConfiguration) => void;
  updateConfiguration: (updates: Partial<PivotConfiguration>) => void;
  saveConfiguration: (name: string, description?: string, tags?: string[]) => Promise<string>;
  loadConfiguration: (id: string) => Promise<void>;
  deleteConfiguration: (id: string) => Promise<void>;
  duplicateConfiguration: (id: string, newName: string) => Promise<string>;
  exportConfiguration: (id: string) => string;
  importConfiguration: (configJson: string) => Promise<string>;
  validateConfiguration: (config: PivotConfiguration) => ConfigurationValidation;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  resetToDefault: () => void;
  toggleFavorite: (id: string) => Promise<void>;
  searchConfigurations: (query: string, tags?: string[]) => SavedPivotConfiguration[];
} {
  const {
    maxHistorySize = 50,
    autoSave = false,
    autoSaveDelay = 2000,
    validateOnChange = true,
  } = options;

  const [state, setState] = React.useState<PivotConfigurationState>({
    activeConfiguration: null,
    savedConfigurations: [],
    history: [],
    historyIndex: -1,
    isLoading: false,
    error: null,
    isDirty: false,
    autoSave,
  });

  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const storageManager = React.useMemo(() => createStorageManager(storage), [storage]);

  // Load saved configurations on mount
  React.useEffect(() => {
    loadSavedConfigurations();
  }, []);

  // Auto-save when configuration changes
  React.useEffect(() => {
    if (autoSave && state.isDirty && state.activeConfiguration) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveConfiguration();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.activeConfiguration, autoSave, autoSaveDelay]);

  // Load saved configurations from storage
  const loadSavedConfigurations = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const saved = await storageManager.getAllConfigurations();
      setState(prev => ({
        ...prev,
        savedConfigurations: saved,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load configurations',
        isLoading: false,
      }));
    }
  };

  // Auto-save current configuration
  const autoSaveConfiguration = async () => {
    if (!state.activeConfiguration) return;

    try {
      const autoSaveId = 'auto-save';
      const existing = state.savedConfigurations.find(c => c.id === autoSaveId);

      if (existing) {
        await storageManager.updateConfiguration(autoSaveId, {
          ...existing,
          configuration: state.activeConfiguration,
          modifiedAt: Date.now(),
        });
      } else {
        await storageManager.saveConfiguration({
          id: autoSaveId,
          name: 'Auto-saved Configuration',
          description: 'Automatically saved configuration',
          configuration: state.activeConfiguration,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          tags: ['auto-save'],
        });
      }

      setState(prev => ({ ...prev, isDirty: false }));
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Add configuration to history
  const addToHistory = React.useCallback((config: PivotConfiguration) => {
    setState(prev => {
      const newHistory = [
        ...prev.history.slice(0, prev.historyIndex + 1),
        config,
      ].slice(-maxHistorySize);

      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, [maxHistorySize]);

  // Set active configuration
  const setActiveConfiguration = React.useCallback((config: PivotConfiguration) => {
    if (validateOnChange) {
      const validation = validateConfiguration(config);
      if (!validation.isValid) {
        setState(prev => ({
          ...prev,
          error: `Invalid configuration: ${validation.errors.join(', ')}`,
        }));
        return;
      }
    }

    setState(prev => ({
      ...prev,
      activeConfiguration: config,
      isDirty: true,
      error: null,
    }));

    addToHistory(config);
  }, [validateOnChange, addToHistory]);

  // Update configuration
  const updateConfiguration = React.useCallback((updates: Partial<PivotConfiguration>) => {
    if (!state.activeConfiguration) return;

    const newConfig = { ...state.activeConfiguration, ...updates };
    setActiveConfiguration(newConfig);
  }, [state.activeConfiguration, setActiveConfiguration]);

  // Save configuration
  const saveConfiguration = React.useCallback(async (
    name: string,
    description?: string,
    tags?: string[]
  ): Promise<string> => {
    if (!state.activeConfiguration) {
      throw new Error('No active configuration to save');
    }

    const validation = validateConfiguration(state.activeConfiguration);
    if (!validation.isValid) {
      throw new Error(`Cannot save invalid configuration: ${validation.errors.join(', ')}`);
    }

    const id = generateId();
    const savedConfig: SavedPivotConfiguration = {
      id,
      name,
      description,
      configuration: state.activeConfiguration,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags,
    };

    try {
      await storageManager.saveConfiguration(savedConfig);

      setState(prev => ({
        ...prev,
        savedConfigurations: [...prev.savedConfigurations, savedConfig],
        isDirty: false,
        error: null,
      }));

      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration';
      setState(prev => ({ ...prev, error: message }));
      throw error;
    }
  }, [state.activeConfiguration]);

  // Load configuration
  const loadConfiguration = React.useCallback(async (id: string) => {
    try {
      const config = await storageManager.getConfiguration(id);
      if (config) {
        setActiveConfiguration(config.configuration);
        setState(prev => ({ ...prev, isDirty: false, error: null }));
      } else {
        throw new Error('Configuration not found');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load configuration';
      setState(prev => ({ ...prev, error: message }));
      throw error;
    }
  }, [setActiveConfiguration]);

  // Delete configuration
  const deleteConfiguration = React.useCallback(async (id: string) => {
    try {
      await storageManager.deleteConfiguration(id);

      setState(prev => ({
        ...prev,
        savedConfigurations: prev.savedConfigurations.filter(c => c.id !== id),
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete configuration';
      setState(prev => ({ ...prev, error: message }));
      throw error;
    }
  }, []);

  // Duplicate configuration
  const duplicateConfiguration = React.useCallback(async (
    id: string,
    newName: string
  ): Promise<string> => {
    const original = state.savedConfigurations.find(c => c.id === id);
    if (!original) {
      throw new Error('Configuration not found');
    }

    const newId = generateId();
    const duplicated: SavedPivotConfiguration = {
      ...original,
      id: newId,
      name: newName,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    try {
      await storageManager.saveConfiguration(duplicated);

      setState(prev => ({
        ...prev,
        savedConfigurations: [...prev.savedConfigurations, duplicated],
        error: null,
      }));

      return newId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate configuration';
      setState(prev => ({ ...prev, error: message }));
      throw error;
    }
  }, [state.savedConfigurations]);

  // Export configuration
  const exportConfiguration = React.useCallback((id: string): string => {
    const config = state.savedConfigurations.find(c => c.id === id);
    if (!config) {
      throw new Error('Configuration not found');
    }

    return JSON.stringify(config, null, 2);
  }, [state.savedConfigurations]);

  // Import configuration
  const importConfiguration = React.useCallback(async (configJson: string): Promise<string> => {
    try {
      const config: SavedPivotConfiguration = JSON.parse(configJson);

      // Validate imported configuration
      const validation = validateConfiguration(config.configuration);
      if (!validation.isValid) {
        throw new Error(`Invalid imported configuration: ${validation.errors.join(', ')}`);
      }

      // Generate new ID to avoid conflicts
      const newId = generateId();
      const importedConfig = {
        ...config,
        id: newId,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      await storageManager.saveConfiguration(importedConfig);

      setState(prev => ({
        ...prev,
        savedConfigurations: [...prev.savedConfigurations, importedConfig],
        error: null,
      }));

      return newId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import configuration';
      setState(prev => ({ ...prev, error: message }));
      throw error;
    }
  }, []);

  // Validate configuration
  const validateConfiguration = React.useCallback((config: PivotConfiguration): ConfigurationValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.rows.length && !config.columns.length) {
      errors.push('At least one row or column field is required');
    }

    if (!config.values.length) {
      errors.push('At least one value field is required');
    }

    // Validate field references
    const allFields = [...config.rows, ...config.columns, ...config.values, ...config.filters];
    for (const field of allFields) {
      if (!field.name || typeof field.name !== 'string') {
        errors.push(`Invalid field name: ${field.name}`);
      }

      if (field.aggregation && !isValidAggregation(field.aggregation)) {
        errors.push(`Invalid aggregation function: ${field.aggregation}`);
      }
    }

    // Check for duplicate fields
    const fieldNames = allFields.map(f => f.name);
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate fields detected: ${duplicates.join(', ')}`);
    }

    // Validate filters
    for (const filter of config.filters) {
      if (filter.operator && !isValidFilterOperator(filter.operator)) {
        errors.push(`Invalid filter operator: ${filter.operator}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  // Undo
  const undo = React.useCallback(() => {
    if (state.historyIndex > 0) {
      const previousConfig = state.history[state.historyIndex - 1];
      setState(prev => ({
        ...prev,
        activeConfiguration: previousConfig,
        historyIndex: prev.historyIndex - 1,
        isDirty: true,
      }));
    }
  }, [state.historyIndex, state.history]);

  // Redo
  const redo = React.useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      const nextConfig = state.history[state.historyIndex + 1];
      setState(prev => ({
        ...prev,
        activeConfiguration: nextConfig,
        historyIndex: prev.historyIndex + 1,
        isDirty: true,
      }));
    }
  }, [state.historyIndex, state.history]);

  // Clear history
  const clearHistory = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      history: prev.activeConfiguration ? [prev.activeConfiguration] : [],
      historyIndex: prev.activeConfiguration ? 0 : -1,
    }));
  }, [state.activeConfiguration]);

  // Reset to default
  const resetToDefault = React.useCallback(() => {
    const defaultConfig: PivotConfiguration = {
      rows: [],
      columns: [],
      values: [],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    };

    setActiveConfiguration(defaultConfig);
  }, [setActiveConfiguration]);

  // Toggle favorite
  const toggleFavorite = React.useCallback(async (id: string) => {
    const config = state.savedConfigurations.find(c => c.id === id);
    if (!config) return;

    const updated = { ...config, isFavorite: !config.isFavorite, modifiedAt: Date.now() };

    try {
      await storageManager.updateConfiguration(id, updated);

      setState(prev => ({
        ...prev,
        savedConfigurations: prev.savedConfigurations.map(c =>
          c.id === id ? updated : c
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [state.savedConfigurations]);

  // Search configurations
  const searchConfigurations = React.useCallback((
    query: string,
    tags?: string[]
  ): SavedPivotConfiguration[] => {
    const normalizedQuery = query.toLowerCase();

    return state.savedConfigurations.filter(config => {
      // Text search
      const matchesText = !query ||
        config.name.toLowerCase().includes(normalizedQuery) ||
        (config.description?.toLowerCase().includes(normalizedQuery)) ||
        (config.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery)));

      // Tag filter
      const matchesTags = !tags || tags.length === 0 ||
        tags.every(tag => config.tags?.includes(tag));

      return matchesText && matchesTags;
    });
  }, [state.savedConfigurations]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    setActiveConfiguration,
    updateConfiguration,
    saveConfiguration,
    loadConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    exportConfiguration,
    importConfiguration,
    validateConfiguration,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    resetToDefault,
    toggleFavorite,
    searchConfigurations,
  };
}

// Storage manager implementation
function createStorageManager(storage: PivotConfigurationStorage) {
  const keyPrefix = storage.keyPrefix || 'pivot-config-';

  const getStorageKey = (id: string) => `${keyPrefix}${id}`;
  const getIndexKey = () => `${keyPrefix}index`;

  return {
    async saveConfiguration(config: SavedPivotConfiguration): Promise<void> {
      const key = getStorageKey(config.id);

      if (storage.type === 'custom' && storage.customStorage) {
        await storage.customStorage.setItem(key, JSON.stringify(config));
      } else {
        const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
        storageAPI.setItem(key, JSON.stringify(config));
      }

      // Update index
      await this.updateIndex(config.id);
    },

    async getConfiguration(id: string): Promise<SavedPivotConfiguration | null> {
      const key = getStorageKey(id);

      try {
        let data: string | null;

        if (storage.type === 'custom' && storage.customStorage) {
          data = await storage.customStorage.getItem(key);
        } else {
          const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
          data = storageAPI.getItem(key);
        }

        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },

    async deleteConfiguration(id: string): Promise<void> {
      const key = getStorageKey(id);

      if (storage.type === 'custom' && storage.customStorage) {
        await storage.customStorage.removeItem(key);
      } else {
        const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
        storageAPI.removeItem(key);
      }

      // Update index
      await this.removeFromIndex(id);
    },

    async updateConfiguration(id: string, config: SavedPivotConfiguration): Promise<void> {
      await this.saveConfiguration(config);
    },

    async getAllConfigurations(): Promise<SavedPivotConfiguration[]> {
      const index = await this.getIndex();
      const configs: SavedPivotConfiguration[] = [];

      for (const id of index) {
        const config = await this.getConfiguration(id);
        if (config) {
          configs.push(config);
        }
      }

      return configs.sort((a, b) => b.modifiedAt - a.modifiedAt);
    },

    async getIndex(): Promise<string[]> {
      const indexKey = getIndexKey();

      try {
        let data: string | null;

        if (storage.type === 'custom' && storage.customStorage) {
          data = await storage.customStorage.getItem(indexKey);
        } else {
          const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
          data = storageAPI.getItem(indexKey);
        }

        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    async updateIndex(id: string): Promise<void> {
      const index = await this.getIndex();
      if (!index.includes(id)) {
        index.push(id);
      }

      const indexKey = getIndexKey();

      if (storage.type === 'custom' && storage.customStorage) {
        await storage.customStorage.setItem(indexKey, JSON.stringify(index));
      } else {
        const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
        storageAPI.setItem(indexKey, JSON.stringify(index));
      }
    },

    async removeFromIndex(id: string): Promise<void> {
      const index = await this.getIndex();
      const filtered = index.filter(item => item !== id);

      const indexKey = getIndexKey();

      if (storage.type === 'custom' && storage.customStorage) {
        await storage.customStorage.setItem(indexKey, JSON.stringify(filtered));
      } else {
        const storageAPI = storage.type === 'sessionStorage' ? sessionStorage : localStorage;
        storageAPI.setItem(indexKey, JSON.stringify(filtered));
      }
    },
  };
}

// Utility functions
function generateId(): string {
  return `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidAggregation(aggregation: string): boolean {
  const validAggregations: AggregationFunction[] = [
    'sum', 'count', 'avg', 'min', 'max', 'countDistinct'
  ];
  return validAggregations.includes(aggregation as AggregationFunction);
}

function isValidFilterOperator(operator: string): boolean {
  const validOperators = ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between', 'in', 'notIn'];
  return validOperators.includes(operator);
}

/** Context for sharing configuration state */
export const PivotConfigurationContext = React.createContext<{
  configurationManager: ReturnType<typeof usePivotConfigurationManager> | null;
}>({
  configurationManager: null,
});

/** Provider component for pivot configuration context */
export const PivotConfigurationProvider: React.FC<{
  children: React.ReactNode;
  storage?: PivotConfigurationStorage;
  options?: Parameters<typeof usePivotConfigurationManager>[1];
}> = ({ children, storage, options }) => {
  const configurationManager = usePivotConfigurationManager(storage, options);

  return (
    <PivotConfigurationContext.Provider value={{ configurationManager }}>
      {children}
    </PivotConfigurationContext.Provider>
  );
};

/** Hook to access configuration context */
export function usePivotConfiguration() {
  const context = React.useContext(PivotConfigurationContext);
  if (!context.configurationManager) {
    throw new Error('usePivotConfiguration must be used within PivotConfigurationProvider');
  }
  return context.configurationManager;
}

export default usePivotConfigurationManager;