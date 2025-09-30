/**
 * Data Binding Utilities
 * Provides seamless integration between server data and front-end pivot components
 */

import { useState, useEffect, useCallback } from 'react';
import { PivotDataSet, PivotField, PivotConfiguration } from '../types';
import { serverDataService, DatasetInfo, DataQueryOptions, DataQueryResult } from './ServerDataService';

export interface DataBindingConfig {
  autoRefresh?: boolean;
  refreshInterval?: number;
  cacheEnabled?: boolean;
  defaultLimit?: number;
}

export interface PivotDataBinding {
  data: PivotDataSet;
  fields: PivotField[];
  datasets: DatasetInfo[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  executionTime: number;
  fromCache: boolean;
}

export interface DataBindingActions {
  loadDatasets: () => Promise<void>;
  selectDataset: (datasetId: string) => Promise<void>;
  queryData: (options?: DataQueryOptions) => Promise<void>;
  refreshData: () => Promise<void>;
  generateCustomDataset: (config: any, datasetId?: string) => Promise<string>;
  getFieldValues: (fieldName: string, limit?: number) => Promise<any[]>;
  getStatistics: () => Promise<any>;
  clearError: () => void;
}

/**
 * React hook for pivot data binding with server data
 */
export function usePivotDataBinding(config: DataBindingConfig = {}): [PivotDataBinding, DataBindingActions] {
  const [state, setState] = useState<PivotDataBinding>({
    data: [],
    fields: [],
    datasets: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    hasMore: false,
    executionTime: 0,
    fromCache: false
  });

  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [lastQueryOptions, setLastQueryOptions] = useState<DataQueryOptions>({});

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const datasets = await serverDataService.getAvailableDatasets();
      setState(prev => ({ ...prev, datasets, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets');
    }
  }, [setLoading, setError]);

  const selectDataset = useCallback(async (datasetId: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentDatasetId(datasetId);

      // Load fields and initial data
      const [fields, result] = await Promise.all([
        serverDataService.getDatasetFields(datasetId),
        serverDataService.queryDataset(datasetId, { limit: config.defaultLimit || 1000 })
      ]);

      setState(prev => ({
        ...prev,
        fields,
        data: result.data,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        executionTime: result.executionTime,
        fromCache: result.fromCache,
        isLoading: false
      }));

      setLastQueryOptions({ limit: config.defaultLimit || 1000 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select dataset');
    }
  }, [config.defaultLimit, setLoading, setError]);

  const queryData = useCallback(async (options: DataQueryOptions = {}) => {
    if (!currentDatasetId) {
      setError('No dataset selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mergedOptions = { ...lastQueryOptions, ...options };
      const result = await serverDataService.queryDataset(currentDatasetId, mergedOptions);

      setState(prev => ({
        ...prev,
        data: result.data,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        executionTime: result.executionTime,
        fromCache: result.fromCache,
        isLoading: false
      }));

      setLastQueryOptions(mergedOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query data');
    }
  }, [currentDatasetId, lastQueryOptions, setLoading, setError]);

  const refreshData = useCallback(async () => {
    if (currentDatasetId) {
      await queryData(lastQueryOptions);
    }
  }, [currentDatasetId, lastQueryOptions, queryData]);

  const generateCustomDataset = useCallback(async (config: any, datasetId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const newDatasetId = await serverDataService.generateCustomDataset(config, datasetId);

      // Refresh datasets list
      await loadDatasets();

      // Auto-select the new dataset
      await selectDataset(newDatasetId);

      return newDatasetId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate dataset');
      throw err;
    }
  }, [setLoading, setError, loadDatasets, selectDataset]);

  const getFieldValues = useCallback(async (fieldName: string, limit = 100) => {
    if (!currentDatasetId) {
      throw new Error('No dataset selected');
    }

    try {
      return await serverDataService.getFieldValues(currentDatasetId, fieldName, limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get field values');
      throw err;
    }
  }, [currentDatasetId, setError]);

  const getStatistics = useCallback(async () => {
    if (!currentDatasetId) {
      throw new Error('No dataset selected');
    }

    try {
      return await serverDataService.getDatasetStatistics(currentDatasetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get statistics');
      throw err;
    }
  }, [currentDatasetId, setError]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Auto-refresh functionality
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval && currentDatasetId) {
      const interval = setInterval(refreshData, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, currentDatasetId, refreshData]);

  // Initialize datasets on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await serverDataService.initializeDatasets();
        await loadDatasets();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize data');
      }
    };

    initializeData();
  }, [loadDatasets, setError]);

  const actions: DataBindingActions = {
    loadDatasets,
    selectDataset,
    queryData,
    refreshData,
    generateCustomDataset,
    getFieldValues,
    getStatistics,
    clearError
  };

  return [state, actions];
}

/**
 * Higher-order component for providing data binding context
 */
export function withPivotDataBinding<P extends object>(
  Component: React.ComponentType<P & { dataBinding: PivotDataBinding; dataActions: DataBindingActions }>
) {
  return function WrappedComponent(props: P) {
    const [dataBinding, dataActions] = usePivotDataBinding();

    return React.createElement(Component, {
      ...props,
      dataBinding,
      dataActions
    });
  };
}

/**
 * Utility function to convert server data to pivot configuration
 */
export function createPivotConfiguration(
  fields: PivotField[],
  options: {
    rows?: string[];
    columns?: string[];
    values?: Array<{ fieldName: string; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' }>;
    filters?: Array<{ fieldName: string; operator: string; value: any }>;
  } = {}
): PivotConfiguration {
  const findField = (name: string) => fields.find(f => f.name === name);

  return {
    rows: (options.rows || []).map(name => findField(name)).filter(Boolean) as PivotField[],
    columns: (options.columns || []).map(name => findField(name)).filter(Boolean) as PivotField[],
    values: (options.values || []).map(v => ({
      field: findField(v.fieldName),
      aggregation: v.aggregation
    })).filter(v => v.field) as Array<{ field: PivotField; aggregation: string }>,
    filters: (options.filters || []).map(f => ({
      field: findField(f.fieldName),
      operator: f.operator,
      value: f.value
    })).filter(f => f.field) as Array<{ field: PivotField; operator: string; value: any }>
  };
}

/**
 * Utility function to extract field suggestions from server data
 */
export async function getFieldSuggestions(
  datasetId: string,
  fieldName: string,
  searchTerm: string = '',
  limit: number = 50
): Promise<string[]> {
  try {
    const values = await serverDataService.getFieldValues(datasetId, fieldName, limit * 2);

    if (!searchTerm) {
      return values.slice(0, limit).map(String);
    }

    const filtered = values
      .filter(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, limit);

    return filtered.map(String);
  } catch (err) {
    console.error('Failed to get field suggestions:', err);
    return [];
  }
}

/**
 * Utility function to validate pivot configuration against available fields
 */
export function validatePivotConfiguration(
  config: PivotConfiguration,
  availableFields: PivotField[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldNames = availableFields.map(f => f.name);

  // Validate row fields
  config.rows.forEach(field => {
    if (!fieldNames.includes(field.name)) {
      errors.push(`Row field "${field.name}" not found in dataset`);
    }
  });

  // Validate column fields
  config.columns.forEach(field => {
    if (!fieldNames.includes(field.name)) {
      errors.push(`Column field "${field.name}" not found in dataset`);
    }
  });

  // Validate value fields
  config.values.forEach(valueField => {
    if (!fieldNames.includes(valueField.field.name)) {
      errors.push(`Value field "${valueField.field.name}" not found in dataset`);
    }
  });

  // Validate filter fields
  config.filters.forEach(filter => {
    if (!fieldNames.includes(filter.field.name)) {
      errors.push(`Filter field "${filter.field.name}" not found in dataset`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}