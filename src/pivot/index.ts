// Core types and interfaces
export * from './types';

// Data processing
export { PivotEngine } from './engine';
export * from './aggregations';

// API integration
export { PivotApiClient, MockPivotApiClient } from './api-client';
export * from './hooks';

// Components
export { PivotTable } from './PivotTable';
export { PivotTableWithConfiguration } from './PivotTableWithConfiguration';
export { PivotCell, PivotCellBase } from './PivotCell';
export { PivotHeadersContainer, PivotRowHeaders, PivotColumnHeaders } from './PivotHeaders';
export { PivotFieldSelector } from './PivotFieldSelector';

// Drill-down functionality
export * from './DrillDownManager';

// Configuration management
export * from './PivotConfigurationManager';
export * from './PivotConfigurationUI';

// Export functionality
export * from './ExportManager';
export * from './ExportUI';
export { AdvancedExportManager, useAdvancedExportManager } from './AdvancedExportManager';

// Performance and optimization
export * from './PerformanceManager';
export { OptimizedPivotEngine, useOptimizedPivotEngine } from './OptimizedPivotEngine';
export { VirtualizedPivotTable } from './VirtualizedPivotTable';
export { PerformanceMonitor, usePerformanceMonitoring } from './PerformanceMonitor';

// Utilities
export { getExpandablePaths, getAllPossiblePaths } from './DrillDownManager';