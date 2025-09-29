import * as React from 'react';
import classNames from 'classnames';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Spreadsheet from '../Spreadsheet';
import { CellBase } from '../types';
import { Point } from '../point';
import { Selection } from '../selection';
import {
  PivotDataSet,
  PivotConfiguration,
  PivotStructure,
  PivotCell as PivotCellData,
  PivotHeader,
  PivotEventHandlers,
  PivotDisplayOptions,
  ExportConfig,
  PivotField,
} from './types';
import { PivotEngine } from './engine';
import { PivotApiClient } from './api-client';
import {
  usePivotData,
  usePivotDrill,
  usePivotExport,
  usePivotFields,
  setPivotApiClient,
  usePivotOperations,
} from './hooks';
import { PivotCell, PivotCellBase } from './PivotCell';
import { PivotHeadersContainer } from './PivotHeaders';
import { PivotFieldSelector } from './PivotFieldSelector';
import { PivotConfigurationProvider, usePivotConfiguration } from './PivotConfigurationManager';
import { ConfigurationToolbar, ConfigurationBrowser, SaveConfigurationDialog, ImportConfigurationDialog } from './PivotConfigurationUI';
import { ExportButton, QuickExportButtons } from './ExportUI';
import './PivotTable.css';

/** Configuration for PivotTable computation mode */
export type PivotComputationMode = 'client' | 'server' | 'hybrid';

/** Main PivotTable component props */
export interface PivotTableProps {
  // Data Configuration
  /** Dataset identifier for server-side computation */
  dataset?: string;
  /** Raw data for client-side computation */
  data?: PivotDataSet;
  /** Pivot configuration */
  configuration: PivotConfiguration;
  /** Callback when configuration changes */
  onConfigurationChange: (config: PivotConfiguration) => void;

  // Computation Mode
  /** Computation mode: client, server, or hybrid */
  mode?: PivotComputationMode;
  /** API client for server-side operations */
  apiClient?: PivotApiClient;
  /** Query client for React Query (optional, will create default if not provided) */
  queryClient?: QueryClient;

  // UI Configuration
  /** Whether to show the field selector */
  showFieldSelector?: boolean;
  /** Whether to show export controls */
  showExportControls?: boolean;
  /** Whether to enable drill-down functionality */
  enableDrillDown?: boolean;
  /** Whether to show configuration management toolbar */
  showConfigurationToolbar?: boolean;
  /** Display options */
  displayOptions?: PivotDisplayOptions;

  // Layout & Styling
  /** Custom CSS class */
  className?: string;
  /** Maximum height for the pivot table */
  maxHeight?: number;
  /** Maximum width for the pivot table */
  maxWidth?: number;
  /** Whether the table should fill available space */
  fillContainer?: boolean;

  // Event Handlers
  /** Pivot-specific event handlers */
  pivotHandlers?: PivotEventHandlers;
  /** Called when a cell is selected */
  onCellSelect?: (cell: PivotCellData, coordinates: Point) => void;
  /** Called when an export is initiated */
  onExport?: (config: ExportConfig) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;

  // Advanced Options
  /** Currently expanded paths for drill-down */
  expandedPaths?: string[][];
  /** Loading state override */
  loading?: boolean;
  /** Error state override */
  error?: string | null;
}

/** Internal state for the PivotTable component */
interface PivotTableState {
  expandedPaths: string[][];
  selectedCells: Set<string>;
  hoveredCell: Point | null;
  isConfiguring: boolean;
  lastComputationTime: number;
}

/** Main PivotTable component */
export const PivotTable: React.FC<PivotTableProps> = ({
  dataset,
  data,
  configuration,
  onConfigurationChange,
  mode = 'client',
  apiClient,
  queryClient,
  showFieldSelector = true,
  showExportControls = true,
  enableDrillDown = true,
  showConfigurationToolbar = true,
  displayOptions = {},
  className,
  maxHeight,
  maxWidth,
  fillContainer = false,
  pivotHandlers,
  onCellSelect,
  onExport,
  onError,
  expandedPaths: controlledExpandedPaths,
  loading: controlledLoading,
  error: controlledError,
}) => {
  // Internal state
  const [internalState, setInternalState] = React.useState<PivotTableState>({
    expandedPaths: controlledExpandedPaths || [],
    selectedCells: new Set(),
    hoveredCell: null,
    isConfiguring: false,
    lastComputationTime: 0,
  });

  // Create query client if not provided
  const defaultQueryClient = React.useMemo(
    () => queryClient || new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: 2,
        },
      },
    }),
    [queryClient]
  );

  // Set up API client for hooks
  React.useEffect(() => {
    if (mode !== 'client' && apiClient) {
      setPivotApiClient(apiClient);
    }
  }, [mode, apiClient]);

  // Client-side pivot engine
  const pivotEngine = React.useMemo(() => {
    if ((mode === 'client' || mode === 'hybrid') && data) {
      return new PivotEngine(data, configuration);
    }
    return null;
  }, [mode, data, configuration]);

  // Server-side data fetching
  const serverRequest = React.useMemo(() => {
    if (mode !== 'client' && dataset) {
      return {
        dataset,
        configuration,
        expandedPaths: internalState.expandedPaths,
      };
    }
    return null;
  }, [mode, dataset, configuration, internalState.expandedPaths]);

  const {
    data: serverData,
    isLoading: serverLoading,
    error: serverError,
  } = usePivotData(serverRequest, {
    enabled: mode !== 'client' && !!dataset,
  });

  // Get available fields for field selector
  const {
    data: availableFields = [],
    isLoading: fieldsLoading,
  } = usePivotFields(mode !== 'client' ? dataset : null, {
    enabled: showFieldSelector && mode !== 'client' && !!dataset,
  });

  // Drill-down mutation
  const drillMutation = usePivotDrill({
    onSuccess: () => {
      // Handle successful drill-down
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  // Export mutation
  const exportMutation = usePivotExport({
    onSuccess: () => {
      // Handle successful export
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  // Pivot operations helper
  const { formatError } = usePivotOperations();

  // Compute pivot data
  const pivotData = React.useMemo(() => {
    const startTime = performance.now();

    try {
      if (mode === 'client' && pivotEngine) {
        const result = pivotEngine.computePivot(internalState.expandedPaths);
        setInternalState(prev => ({
          ...prev,
          lastComputationTime: performance.now() - startTime,
        }));
        return result;
      } else if (mode !== 'client' && serverData) {
        return serverData.structure;
      }
      return null;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [mode, pivotEngine, internalState.expandedPaths, serverData, onError]);

  // Handle drill-down operations
  const handleDrillDown = React.useCallback(
    async (path: string[], action: 'expand' | 'collapse') => {
      if (!enableDrillDown) return;

      try {
        if (mode === 'client' && pivotEngine) {
          // Client-side drill-down
          const newExpandedPaths = action === 'expand'
            ? [...internalState.expandedPaths, path]
            : internalState.expandedPaths.filter(p => !arraysEqual(p, path));

          setInternalState(prev => ({
            ...prev,
            expandedPaths: newExpandedPaths,
          }));
        } else if (mode !== 'client' && serverData?.metadata?.cacheKey) {
          // Server-side drill-down
          await drillMutation.mutateAsync({
            cacheKey: serverData.metadata.cacheKey,
            path,
            action,
          });

          const newExpandedPaths = action === 'expand'
            ? [...internalState.expandedPaths, path]
            : internalState.expandedPaths.filter(p => !arraysEqual(p, path));

          setInternalState(prev => ({
            ...prev,
            expandedPaths: newExpandedPaths,
          }));
        }

        pivotHandlers?.onDrillDown?.(path, action);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [
      enableDrillDown,
      mode,
      pivotEngine,
      internalState.expandedPaths,
      serverData,
      drillMutation,
      pivotHandlers,
      onError,
    ]
  );

  // Handle cell interactions
  const handleCellClick = React.useCallback(
    (cell: PivotCellData, coordinates: Point) => {
      // Handle drill-down on expandable cells
      if (cell.isExpandable && enableDrillDown) {
        const action = cell.isExpanded ? 'collapse' : 'expand';
        handleDrillDown(cell.path || [], action);
      }

      // Update selection
      const cellKey = `${coordinates.row}-${coordinates.column}`;
      setInternalState(prev => ({
        ...prev,
        selectedCells: new Set([cellKey]),
      }));

      // Call event handlers
      pivotHandlers?.onCellClick?.(cell, coordinates);
      onCellSelect?.(cell, coordinates);
    },
    [enableDrillDown, handleDrillDown, pivotHandlers, onCellSelect]
  );

  // Handle header clicks
  const handleHeaderClick = React.useCallback(
    (header: PivotHeader) => {
      if (header.isExpandable && enableDrillDown) {
        const action = header.isExpanded ? 'collapse' : 'expand';
        handleDrillDown(header.path, action);
      }

      pivotHandlers?.onHeaderClick?.(header);
    },
    [enableDrillDown, handleDrillDown, pivotHandlers]
  );

  // Handle export
  const handleExport = React.useCallback(
    (exportConfig: ExportConfig) => {
      if (!serverRequest) return;

      exportMutation.mutate({
        request: serverRequest,
        config: exportConfig,
      });

      onExport?.(exportConfig);
    },
    [serverRequest, exportMutation, onExport]
  );

  // Convert pivot data to spreadsheet format
  const spreadsheetData = React.useMemo(() => {
    if (!pivotData) return [];

    return pivotData.matrix.map((row) =>
      row.map((cell) => ({
        value: cell.formattedValue,
        pivotCell: cell,
        readOnly: true,
        className: getPivotCellClassName(cell),
      } as PivotCellBase))
    );
  }, [pivotData]);

  // Determine loading state
  const isLoading = controlledLoading ?? (
    (mode !== 'client' && serverLoading) ||
    (showFieldSelector && fieldsLoading) ||
    drillMutation.isPending ||
    exportMutation.isPending
  );

  // Determine error state
  const errorMessage = controlledError ?? (
    serverError ? formatError(serverError) : null
  );

  // Render field selector
  const renderFieldSelector = () => {
    if (!showFieldSelector) return null;

    const fields = mode === 'client'
      ? extractFieldsFromData(data || [])
      : availableFields;

    return (
      <div className="PivotTable__field-selector">
        <PivotFieldSelector
          availableFields={fields}
          configuration={configuration}
          onChange={onConfigurationChange}
          readOnly={isLoading}
        />
      </div>
    );
  };

  // Render export controls
  const renderExportControls = () => {
    if (!showExportControls || !pivotData) return null;

    return (
      <div className="PivotTable__export-controls">
        <QuickExportButtons
          pivotData={pivotData}
          configuration={configuration}
          onExport={onExport}
        />
        <ExportButton
          pivotData={pivotData}
          configuration={configuration}
          onExport={onExport}
          className="PivotTable__export-button"
        >
          📤 Export Options
        </ExportButton>
      </div>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={classNames('PivotTable', 'PivotTable--loading', className)}>
        <div className="PivotTable__loading-content">
          <div className="PivotTable__spinner" />
          <span className="PivotTable__loading-text">
            {mode === 'client' ? 'Computing pivot table...' : 'Loading data...'}
          </span>
        </div>
      </div>
    );
  }

  // Render error state
  if (errorMessage) {
    return (
      <div className={classNames('PivotTable', 'PivotTable--error', className)}>
        <div className="PivotTable__error-content">
          <h3 className="PivotTable__error-title">Error</h3>
          <p className="PivotTable__error-message">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="PivotTable__retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!pivotData || pivotData.rowCount === 0) {
    return (
      <div className={classNames('PivotTable', 'PivotTable--empty', className)}>
        {renderFieldSelector()}
        <div className="PivotTable__empty-content">
          <h3 className="PivotTable__empty-title">No data to display</h3>
          <p className="PivotTable__empty-message">
            {configuration.values.length === 0
              ? 'Add at least one value field to generate the pivot table.'
              : 'The current configuration returned no data. Try adjusting your filters or field selection.'}
          </p>
        </div>
      </div>
    );
  }

  // Render main pivot table
  const containerStyle: React.CSSProperties = {
    maxHeight,
    maxWidth,
    height: fillContainer ? '100%' : undefined,
    width: fillContainer ? '100%' : undefined,
  };

  return (
    <QueryClientProvider client={defaultQueryClient}>
      <div
        className={classNames('PivotTable', className, {
          'PivotTable--fill-container': fillContainer,
          'PivotTable--configuring': internalState.isConfiguring,
        })}
        style={containerStyle}
      >
        {renderFieldSelector()}

        <div className="PivotTable__controls">
          {renderExportControls()}

          <div className="PivotTable__info">
            <span className="PivotTable__dimensions">
              {pivotData.rowCount} × {pivotData.columnCount}
            </span>
            {internalState.lastComputationTime > 0 && (
              <span className="PivotTable__computation-time">
                ({internalState.lastComputationTime.toFixed(1)}ms)
              </span>
            )}
          </div>
        </div>

        <div className="PivotTable__content">
          {/* Headers Container */}
          <PivotHeadersContainer
            rowHeaders={pivotData.rowHeaders}
            columnHeaders={pivotData.columnHeaders}
            onHeaderClick={handleHeaderClick}
            enableDrillDown={enableDrillDown}
            showTooltips={displayOptions.showTooltips}
            className="PivotTable__headers"
          />

          {/* Main Spreadsheet */}
          <div className="PivotTable__spreadsheet">
            <Spreadsheet
              data={spreadsheetData}
              Cell={PivotCell}
              onCellClick={(point) => {
                const cell = spreadsheetData[point.row]?.[point.column];
                if (cell?.pivotCell) {
                  handleCellClick(cell.pivotCell, point);
                }
              }}
              className="PivotTable__spreadsheet-component"
              hideRowIndicators={!displayOptions.showRowNumbers}
              hideColumnIndicators={!displayOptions.showColumnLetters}
              darkMode={displayOptions.customClasses?.table?.includes('dark')}
            />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
};

// Utility functions

/** Compare two arrays for equality */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

/** Get CSS class for a pivot cell based on its type */
function getPivotCellClassName(cell: PivotCellData): string {
  const baseClass = 'PivotTable__cell';
  const typeClass = `${baseClass}--${cell.type}`;

  const classes = [baseClass, typeClass];

  if (cell.isExpandable) {
    classes.push(`${baseClass}--expandable`);
  }

  if (cell.isExpanded) {
    classes.push(`${baseClass}--expanded`);
  }

  if (cell.level !== undefined) {
    classes.push(`${baseClass}--level-${cell.level}`);
  }

  return classes.join(' ');
}

/** Extract field definitions from raw data */
function extractFieldsFromData(data: PivotDataSet): PivotField[] {
  if (data.length === 0) return [];

  const firstRow = data[0];
  return Object.keys(firstRow).map(key => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    dataType: inferDataType(firstRow[key]),
  }));
}

/** Infer data type from a sample value */
function inferDataType(value: any): PivotField['dataType'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
  return 'string';
}

export default PivotTable;