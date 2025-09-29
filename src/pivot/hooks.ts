import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  PivotRequest,
  PivotResponse,
  PivotDrillRequest,
  PivotField,
  PivotConfiguration,
  ExportConfig,
} from './types';
import { PivotApiClient } from './api-client';

/** Query keys for React Query */
export const QUERY_KEYS = {
  pivot: (request: PivotRequest) => ['pivot', request] as const,
  datasets: () => ['pivot-datasets'] as const,
  fields: (dataset: string) => ['pivot-fields', dataset] as const,
  fieldValues: (dataset: string, fieldId: string) => ['pivot-field-values', dataset, fieldId] as const,
  configurations: () => ['pivot-configurations'] as const,
  configuration: (id: string) => ['pivot-configuration', id] as const,
  health: () => ['pivot-health'] as const,
};

/** Context for providing API client */
let apiClientInstance: PivotApiClient | null = null;

export function setPivotApiClient(client: PivotApiClient): void {
  apiClientInstance = client;
}

export function getPivotApiClient(): PivotApiClient {
  if (!apiClientInstance) {
    throw new Error('Pivot API client not configured. Call setPivotApiClient() first.');
  }
  return apiClientInstance;
}

/** Hook for fetching pivot data */
export function usePivotData(
  request: PivotRequest | null,
  options?: Omit<UseQueryOptions<PivotResponse>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: request ? QUERY_KEYS.pivot(request) : [],
    queryFn: () => apiClient.computePivot(request!),
    enabled: !!request?.dataset && !!request?.configuration,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });
}

/** Hook for drill-down operations */
export function usePivotDrill(
  options?: Omit<UseMutationOptions<PivotResponse, Error, PivotDrillRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const apiClient = getPivotApiClient();

  return useMutation({
    mutationFn: (request: PivotDrillRequest) => apiClient.drillDown(request),
    onSuccess: (data, variables) => {
      // Update the cached pivot data with the new drill-down result
      queryClient.setQueryData(
        QUERY_KEYS.pivot({ dataset: '', configuration: {} as PivotConfiguration }),
        data
      );
    },
    onError: (error) => {
      console.error('Drill-down operation failed:', error);
    },
    ...options,
  });
}

/** Hook for fetching available datasets */
export function usePivotDatasets(
  options?: Omit<UseQueryOptions<Array<{ id: string; name: string; description?: string; rowCount?: number }>>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: QUERY_KEYS.datasets(),
    queryFn: () => apiClient.getDatasets(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/** Hook for fetching available fields for a dataset */
export function usePivotFields(
  dataset: string | null,
  options?: Omit<UseQueryOptions<PivotField[]>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: dataset ? QUERY_KEYS.fields(dataset) : [],
    queryFn: () => apiClient.getAvailableFields(dataset!),
    enabled: !!dataset,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/** Hook for fetching field values for filtering */
export function usePivotFieldValues(
  dataset: string | null,
  fieldId: string | null,
  limit?: number,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: dataset && fieldId ? QUERY_KEYS.fieldValues(dataset, fieldId) : [],
    queryFn: () => apiClient.getFieldValues(dataset!, fieldId!, limit),
    enabled: !!dataset && !!fieldId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/** Hook for exporting pivot table */
export function usePivotExport(
  options?: Omit<UseMutationOptions<Blob, Error, { request: PivotRequest; config: ExportConfig }>, 'mutationFn'>
) {
  const apiClient = getPivotApiClient();

  return useMutation({
    mutationFn: ({ request, config }) => apiClient.exportPivot(request, config),
    onSuccess: (blob, { config }) => {
      // Automatically download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = config.filename || `pivot-export.${config.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Export failed:', error);
    },
    ...options,
  });
}

/** Hook for saving pivot configuration */
export function useSavePivotConfiguration(
  options?: Omit<UseMutationOptions<{ id: string }, Error, { name: string; configuration: PivotConfiguration; dataset: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const apiClient = getPivotApiClient();

  return useMutation({
    mutationFn: ({ name, configuration, dataset }) =>
      apiClient.savePivotConfiguration(name, configuration, dataset),
    onSuccess: () => {
      // Invalidate configurations list to refresh it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configurations() });
    },
    ...options,
  });
}

/** Hook for loading pivot configuration */
export function usePivotConfiguration(
  id: string | null,
  options?: Omit<UseQueryOptions<{ name: string; configuration: PivotConfiguration; dataset: string }>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: id ? QUERY_KEYS.configuration(id) : [],
    queryFn: () => apiClient.loadPivotConfiguration(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/** Hook for fetching saved configurations */
export function usePivotConfigurations(
  options?: Omit<UseQueryOptions<Array<{ id: string; name: string; dataset: string; createdAt: string; updatedAt: string }>>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: QUERY_KEYS.configurations(),
    queryFn: () => apiClient.getPivotConfigurations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/** Hook for API health monitoring */
export function usePivotHealth(
  options?: Omit<UseQueryOptions<{ status: 'healthy' | 'unhealthy'; version?: string; uptime?: number }>, 'queryKey' | 'queryFn'>
) {
  const apiClient = getPivotApiClient();

  return useQuery({
    queryKey: QUERY_KEYS.health(),
    queryFn: () => apiClient.getHealthStatus(),
    refetchInterval: 30 * 1000, // Check every 30 seconds
    retry: false, // Don't retry health checks
    ...options,
  });
}

/** Hook for managing pivot configuration state with optimistic updates */
export function usePivotConfigurationManager(initialConfig?: PivotConfiguration) {
  const queryClient = useQueryClient();

  const updateConfiguration = useCallback(
    (updater: (prev: PivotConfiguration) => PivotConfiguration) => {
      // Optimistically update all pivot queries with the new configuration
      queryClient.setQueriesData(
        { queryKey: ['pivot'] },
        (oldData: PivotResponse | undefined) => {
          if (!oldData) return oldData;
          // Return updated data or trigger a refetch
          return oldData;
        }
      );
    },
    [queryClient]
  );

  const invalidateRelatedQueries = useCallback(
    (dataset?: string) => {
      // Invalidate all pivot-related queries when configuration changes significantly
      queryClient.invalidateQueries({ queryKey: ['pivot'] });
      if (dataset) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fields(dataset) });
      }
    },
    [queryClient]
  );

  return {
    updateConfiguration,
    invalidateRelatedQueries,
  };
}

/** Hook for managing expanded paths state */
export function useExpandedPaths(initialPaths: string[][] = []) {
  const queryClient = useQueryClient();

  const togglePath = useCallback(
    (path: string[], isExpanded: boolean) => {
      // Update expanded paths and trigger pivot recomputation
      queryClient.setQueriesData(
        { queryKey: ['pivot'] },
        (oldData: PivotResponse | undefined) => {
          if (!oldData) return oldData;
          // Update expanded paths in the data
          return oldData;
        }
      );
    },
    [queryClient]
  );

  return {
    togglePath,
  };
}

/** Hook for handling pivot errors with user-friendly messages */
export function usePivotErrorHandler() {
  const formatError = useCallback((error: any): string => {
    if (error.code) {
      switch (error.code) {
        case 'DATASET_NOT_FOUND':
          return 'The selected dataset could not be found.';
        case 'INVALID_CONFIGURATION':
          return 'The pivot configuration is invalid. Please check your field selections.';
        case 'COMPUTATION_TIMEOUT':
          return 'The pivot computation took too long. Try reducing the data size or complexity.';
        case 'INSUFFICIENT_MEMORY':
          return 'Not enough memory to compute this pivot table. Try filtering your data or reducing dimensions.';
        default:
          return error.message || 'An unknown error occurred.';
      }
    }

    if (error.status) {
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your configuration.';
        case 401:
          return 'Authentication required. Please log in.';
        case 403:
          return 'You do not have permission to access this data.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please wait and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return `Server error (${error.status}). Please try again.`;
      }
    }

    return error.message || 'An unexpected error occurred.';
  }, []);

  return { formatError };
}

/** Hook for optimistic pivot updates */
export function useOptimisticPivot() {
  const queryClient = useQueryClient();

  const optimisticallyUpdatePivot = useCallback(
    (updater: (prev: PivotResponse | undefined) => PivotResponse | undefined) => {
      queryClient.setQueriesData({ queryKey: ['pivot'] }, updater);
    },
    [queryClient]
  );

  const rollbackOptimisticUpdate = useCallback(
    (queryKey: any[]) => {
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  return {
    optimisticallyUpdatePivot,
    rollbackOptimisticUpdate,
  };
}

/** Hook for prefetching related data */
export function usePrefetchPivotData() {
  const queryClient = useQueryClient();
  const apiClient = getPivotApiClient();

  const prefetchFields = useCallback(
    (dataset: string) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.fields(dataset),
        queryFn: () => apiClient.getAvailableFields(dataset),
        staleTime: 10 * 60 * 1000,
      });
    },
    [queryClient, apiClient]
  );

  const prefetchFieldValues = useCallback(
    (dataset: string, fieldId: string) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.fieldValues(dataset, fieldId),
        queryFn: () => apiClient.getFieldValues(dataset, fieldId),
        staleTime: 15 * 60 * 1000,
      });
    },
    [queryClient, apiClient]
  );

  return {
    prefetchFields,
    prefetchFieldValues,
  };
}

/** Custom hook for combining multiple pivot-related operations */
export function usePivotOperations() {
  const { formatError } = usePivotErrorHandler();
  const { optimisticallyUpdatePivot } = useOptimisticPivot();
  const { prefetchFields, prefetchFieldValues } = usePrefetchPivotData();
  const drillMutation = usePivotDrill();
  const exportMutation = usePivotExport();

  return {
    formatError,
    optimisticallyUpdatePivot,
    prefetchFields,
    prefetchFieldValues,
    drillDown: drillMutation.mutate,
    exportData: exportMutation.mutate,
    isLoading: drillMutation.isPending || exportMutation.isPending,
  };
}