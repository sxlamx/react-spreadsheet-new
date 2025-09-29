import * as React from 'react';
import { PivotEngine } from './engine';
import { PerformanceManager, usePerformanceManager } from './PerformanceManager';
import {
  PivotDataSet,
  PivotConfiguration,
  PivotStructure,
  PivotCell,
  PivotHeader,
} from './types';

/** Optimized computation options */
interface OptimizedComputationOptions {
  /** Enable incremental updates */
  enableIncremental?: boolean;
  /** Enable web workers for computation */
  useWebWorkers?: boolean;
  /** Batch size for large datasets */
  batchSize?: number;
  /** Enable parallel processing */
  enableParallel?: boolean;
  /** Cache intermediate results */
  cacheIntermediates?: boolean;
}

/** Incremental update operation */
interface IncrementalUpdate {
  type: 'add' | 'remove' | 'update';
  indices: number[];
  data?: any[];
}

/** Optimized pivot engine with performance enhancements */
export class OptimizedPivotEngine extends PivotEngine {
  private performanceManager: PerformanceManager;
  private lastDataHash: string = '';
  private lastConfigHash: string = '';
  private incrementalData: Map<string, any> = new Map();

  constructor(
    data: PivotDataSet,
    configuration: PivotConfiguration,
    performanceManager?: PerformanceManager
  ) {
    super(data, configuration);
    this.performanceManager = performanceManager || PerformanceManager.getInstance();
  }

  /** Optimized pivot computation with caching and performance monitoring */
  computeOptimized(options: OptimizedComputationOptions = {}): PivotStructure {
    const {
      enableIncremental = true,
      useWebWorkers = false,
      batchSize = 1000,
      enableParallel = true,
      cacheIntermediates = true,
    } = options;

    // Generate cache key
    const cacheKey = this.performanceManager.generateCacheKey(this.data, this.configuration);

    // Try to get from cache first
    const cached = this.performanceManager.getCachedStructure(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute with performance monitoring
    const result = this.performanceManager.measureComputation(() => {
      if (useWebWorkers && window.Worker) {
        return this.computeWithWebWorker(options);
      } else if (enableParallel && this.data.length > batchSize) {
        return this.computeInParallel(options);
      } else if (enableIncremental && this.canUseIncremental()) {
        return this.computeIncremental(options);
      } else {
        return this.computeStandard();
      }
    }, 'Optimized pivot computation');

    // Cache the result
    this.performanceManager.cacheStructure(cacheKey, result);

    return result;
  }

  /** Compute using web workers (placeholder implementation) */
  private async computeWithWebWorker(options: OptimizedComputationOptions): Promise<PivotStructure> {
    // In a real implementation, this would use web workers
    // For now, fall back to standard computation
    return this.computeStandard();
  }

  /** Compute in parallel batches */
  private async computeInParallel(options: OptimizedComputationOptions): Promise<PivotStructure> {
    const { batchSize = 1000 } = options;

    // Split data into batches
    const batches: PivotDataSet[] = [];
    for (let i = 0; i < this.data.length; i += batchSize) {
      batches.push(this.data.slice(i, i + batchSize));
    }

    // Process batches in parallel
    const batchResults = await Promise.all(
      batches.map(async (batch, index) => {
        return new Promise<Partial<PivotStructure>>((resolve) => {
          // Simulate async processing
          setTimeout(() => {
            const batchEngine = new PivotEngine(batch, this.configuration);
            const result = batchEngine.computePivot();
            resolve(result);
          }, 0);
        });
      })
    );

    // Merge batch results
    return this.mergeBatchResults(batchResults);
  }

  /** Incremental computation for small data changes */
  private computeIncremental(options: OptimizedComputationOptions): PivotStructure {
    // This would implement incremental updates based on data changes
    // For now, fall back to standard computation
    return this.computeStandard();
  }

  /** Standard computation (from base class) */
  private computeStandard(): PivotStructure {
    return this.computePivot();
  }

  /** Check if incremental computation is possible */
  private canUseIncremental(): boolean {
    // Check if we have previous computation state and minimal changes
    const currentDataHash = this.hashData(this.data);
    const currentConfigHash = this.hashConfiguration(this.configuration);

    const canUse = this.lastDataHash &&
                   this.lastConfigHash === currentConfigHash &&
                   this.calculateDataChanges(currentDataHash) < 0.1; // Less than 10% change

    this.lastDataHash = currentDataHash;
    this.lastConfigHash = currentConfigHash;

    return canUse;
  }

  /** Merge results from parallel batch processing */
  private mergeBatchResults(batchResults: Partial<PivotStructure>[]): PivotStructure {
    // This is a simplified merge - a real implementation would need
    // sophisticated aggregation logic
    const merged: PivotStructure = {
      rowCount: 0,
      columnCount: 0,
      rowHeaders: [],
      columnHeaders: [],
      matrix: [],
    };

    for (const batch of batchResults) {
      if (batch.matrix) {
        merged.matrix.push(...batch.matrix);
        merged.rowCount += batch.rowCount || 0;
      }
    }

    // Merge headers (simplified)
    if (batchResults.length > 0 && batchResults[0].columnHeaders) {
      merged.columnHeaders = batchResults[0].columnHeaders;
      merged.columnCount = batchResults[0].columnCount || 0;
    }

    // Merge row headers
    for (const batch of batchResults) {
      if (batch.rowHeaders) {
        merged.rowHeaders.push(...batch.rowHeaders);
      }
    }

    return merged;
  }

  /** Calculate percentage of data changes */
  private calculateDataChanges(newHash: string): number {
    if (!this.lastDataHash) return 1; // 100% change if no previous hash

    // Simple hash comparison - in reality you'd want more sophisticated change detection
    return this.lastDataHash === newHash ? 0 : 1;
  }

  /** Hash the dataset for change detection */
  private hashData(data: PivotDataSet): string {
    // Simple hash based on length and first/last elements
    if (data.length === 0) return 'empty';

    const first = JSON.stringify(data[0]);
    const last = JSON.stringify(data[data.length - 1]);
    return `${data.length}_${this.simpleHash(first + last)}`;
  }

  /** Hash the configuration */
  private hashConfiguration(config: PivotConfiguration): string {
    return this.simpleHash(JSON.stringify(config));
  }

  /** Simple string hash function */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /** Update data incrementally */
  updateDataIncremental(updates: IncrementalUpdate[]): PivotStructure {
    return this.performanceManager.measureComputation(() => {
      // Apply incremental updates
      for (const update of updates) {
        this.applyIncrementalUpdate(update);
      }

      // Recompute affected portions
      return this.computeOptimized({ enableIncremental: true });
    }, 'Incremental data update');
  }

  /** Apply a single incremental update */
  private applyIncrementalUpdate(update: IncrementalUpdate): void {
    switch (update.type) {
      case 'add':
        if (update.data) {
          this.data.push(...update.data);
        }
        break;
      case 'remove':
        update.indices.sort((a, b) => b - a); // Sort descending
        for (const index of update.indices) {
          this.data.splice(index, 1);
        }
        break;
      case 'update':
        if (update.data) {
          update.indices.forEach((index, i) => {
            if (update.data && update.data[i]) {
              this.data[index] = { ...this.data[index], ...update.data[i] };
            }
          });
        }
        break;
    }
  }
}

/** Hook for optimized pivot computation */
export function useOptimizedPivotEngine(
  data: PivotDataSet,
  configuration: PivotConfiguration,
  options: OptimizedComputationOptions = {}
) {
  const { performanceManager, measureComputation } = usePerformanceManager();

  const [pivotStructure, setPivotStructure] = React.useState<PivotStructure | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);
  const [computationError, setComputationError] = React.useState<string | null>(null);

  // Create optimized engine instance
  const optimizedEngine = React.useMemo(() => {
    return new OptimizedPivotEngine(data, configuration, performanceManager);
  }, [data, configuration, performanceManager]);

  // Debounced computation
  const debouncedCompute = React.useMemo(
    () => performanceManager.debounce(async () => {
      setIsComputing(true);
      setComputationError(null);

      try {
        const result = await measureComputation(
          () => optimizedEngine.computeOptimized(options),
          'Optimized pivot computation'
        );
        setPivotStructure(result);
      } catch (error) {
        setComputationError(error instanceof Error ? error.message : 'Computation failed');
        console.error('Pivot computation error:', error);
      } finally {
        setIsComputing(false);
      }
    }, options.batchSize ? 500 : 300),
    [optimizedEngine, options, measureComputation, performanceManager]
  );

  // Trigger computation when dependencies change
  React.useEffect(() => {
    debouncedCompute();
  }, [debouncedCompute]);

  // Incremental update function
  const updateDataIncremental = React.useCallback(
    (updates: IncrementalUpdate[]) => {
      setIsComputing(true);
      try {
        const result = optimizedEngine.updateDataIncremental(updates);
        setPivotStructure(result);
      } catch (error) {
        setComputationError(error instanceof Error ? error.message : 'Update failed');
      } finally {
        setIsComputing(false);
      }
    },
    [optimizedEngine]
  );

  return {
    pivotStructure,
    isComputing,
    computationError,
    optimizedEngine,
    updateDataIncremental,
    recompute: debouncedCompute,
  };
}

/** Worker script for pivot computation (would be in a separate file) */
export const PivotWorkerScript = `
self.onmessage = function(e) {
  const { data, configuration, options } = e.data;

  try {
    // Import pivot engine (would need to be bundled for worker)
    // const engine = new PivotEngine(data, configuration);
    // const result = engine.computePivot();

    // For now, just echo back the data
    self.postMessage({
      success: true,
      result: {
        rowCount: data.length,
        columnCount: 5,
        rowHeaders: [],
        columnHeaders: [],
        matrix: []
      }
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
`;

export default OptimizedPivotEngine;