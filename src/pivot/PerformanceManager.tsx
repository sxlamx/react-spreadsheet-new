import * as React from 'react';
import { PivotStructure, PivotConfiguration, PivotDataSet } from './types';

/** Performance metrics interface */
export interface PerformanceMetrics {
  /** Computation time in milliseconds */
  computationTime: number;
  /** Memory usage estimates */
  memoryUsage: {
    dataSize: number;
    structureSize: number;
    totalEstimate: number;
  };
  /** Row and column counts */
  dimensions: {
    rows: number;
    columns: number;
    cells: number;
  };
  /** Cache statistics */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  /** Render performance */
  render: {
    lastRenderTime: number;
    averageRenderTime: number;
    frameDrops: number;
  };
}

/** Cache entry interface */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  key: string;
}

/** Performance configuration */
export interface PerformanceConfig {
  /** Enable virtual scrolling */
  enableVirtualization?: boolean;
  /** Virtual scroll buffer size */
  virtualBufferSize?: number;
  /** Enable computation caching */
  enableCaching?: boolean;
  /** Cache size limit in MB */
  cacheSize?: number;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Debounce delay for computations */
  debounceDelay?: number;
  /** Batch size for large operations */
  batchSize?: number;
}

/** LRU Cache implementation */
class LRUCache<T> {
  private maxSize: number;
  private cache = new Map<string, CacheEntry<T>>();
  private totalSize = 0;

  constructor(maxSizeInMB: number) {
    this.maxSize = maxSizeInMB * 1024 * 1024; // Convert to bytes
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > 30 * 60 * 1000) { // 30 minutes TTL
      this.cache.delete(key);
      this.totalSize -= entry.size;
      return null;
    }

    // Update access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, data: T, estimatedSize?: number): void {
    const size = estimatedSize || this.estimateSize(data);

    // Remove existing entry if it exists
    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
      this.cache.delete(key);
    }

    // Evict entries if necessary
    while (this.totalSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Don't cache if item is too large
    if (size > this.maxSize * 0.1) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      key,
    };

    this.cache.set(key, entry);
    this.totalSize += size;
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses separately
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.totalSize -= entry.size;
    }
  }

  private estimateSize(data: any): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(data);
    return str.length * 2; // Approximate UTF-16 encoding
  }
}

/** Performance manager class */
export class PerformanceManager {
  private static instance: PerformanceManager | null = null;
  private cache = new LRUCache<PivotStructure>(50); // 50MB cache
  private metrics: PerformanceMetrics;
  private config: PerformanceConfig;
  private renderTimes: number[] = [];

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableVirtualization: true,
      virtualBufferSize: 10,
      enableCaching: true,
      cacheSize: 50,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      enableMonitoring: true,
      debounceDelay: 300,
      batchSize: 1000,
      ...config,
    };

    this.metrics = {
      computationTime: 0,
      memoryUsage: { dataSize: 0, structureSize: 0, totalEstimate: 0 },
      dimensions: { rows: 0, columns: 0, cells: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0, size: 0 },
      render: { lastRenderTime: 0, averageRenderTime: 0, frameDrops: 0 },
    };
  }

  static getInstance(config?: PerformanceConfig): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager(config);
    }
    return PerformanceManager.instance;
  }

  /** Generate cache key for pivot computation */
  generateCacheKey(data: PivotDataSet, configuration: PivotConfiguration): string {
    const configHash = this.hashConfiguration(configuration);
    const dataHash = this.hashData(data.slice(0, 100)); // Sample first 100 rows for hash
    return `pivot_${configHash}_${dataHash}_${data.length}`;
  }

  /** Get cached pivot structure */
  getCachedStructure(key: string): PivotStructure | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (cached) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    this.updateCacheMetrics();
    return cached;
  }

  /** Cache pivot structure */
  cacheStructure(key: string, structure: PivotStructure): void {
    if (!this.config.enableCaching) return;

    const size = this.estimateStructureSize(structure);
    this.cache.set(key, structure, size);
    this.updateCacheMetrics();
  }

  /** Measure computation performance */
  measureComputation<T>(fn: () => T, label?: string): T {
    const startTime = performance.now();
    const startMemory = this.estimateMemoryUsage();

    const result = fn();

    const endTime = performance.now();
    const endMemory = this.estimateMemoryUsage();
    const computationTime = endTime - startTime;

    this.metrics.computationTime = computationTime;
    this.metrics.memoryUsage.totalEstimate = endMemory - startMemory;

    if (this.config.enableMonitoring && label) {
      console.log(`[Performance] ${label}: ${computationTime.toFixed(2)}ms`);
    }

    return result;
  }

  /** Measure render performance */
  measureRender(renderTime: number): void {
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift(); // Keep last 100 measurements
    }

    this.metrics.render.lastRenderTime = renderTime;
    this.metrics.render.averageRenderTime =
      this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;

    // Detect frame drops (> 16.67ms for 60fps)
    if (renderTime > 16.67) {
      this.metrics.render.frameDrops++;
    }
  }

  /** Debounced computation wrapper */
  debounce<T extends any[], R>(
    fn: (...args: T) => R,
    delay: number = this.config.debounceDelay || 300
  ): (...args: T) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  /** Batch process large operations */
  async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => R[],
    batchSize: number = this.config.batchSize || 1000
  ): Promise<R[]> {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, items.length);
      const batch = items.slice(start, end);

      const batchResults = processor(batch);
      results.push(...batchResults);

      // Allow other tasks to run between batches
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }

  /** Get current performance metrics */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /** Clear cache */
  clearCache(): void {
    this.cache.clear();
    this.metrics.cache = { hits: 0, misses: 0, hitRate: 0, size: 0 };
  }

  /** Update configuration */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private hashConfiguration(config: PivotConfiguration): string {
    const str = JSON.stringify({
      rows: config.rows.map(r => r.name),
      columns: config.columns.map(c => c.name),
      values: config.values.map(v => `${v.name}_${v.aggregation}`),
      filters: config.filters.map(f => `${f.name}_${f.operator}_${f.value}`),
      options: config.options,
    });
    return this.simpleHash(str);
  }

  private hashData(data: PivotDataSet): string {
    if (data.length === 0) return 'empty';

    // Create a signature from first and last rows + length
    const first = data[0];
    const last = data[data.length - 1];
    const signature = JSON.stringify({ first, last, length: data.length });
    return this.simpleHash(signature);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private estimateStructureSize(structure: PivotStructure): number {
    const str = JSON.stringify(structure);
    return str.length * 2; // UTF-16 approximation
  }

  private estimateMemoryUsage(): number {
    // This is a rough estimation - in a real implementation you might use
    // performance.memory (Chrome) or other browser-specific APIs
    return Date.now() % 100000; // Placeholder
  }

  private updateCacheMetrics(): void {
    const stats = this.cache.getStats();
    this.metrics.cache.size = stats.size;
    this.metrics.cache.hitRate =
      this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses);
  }
}

/** Hook for performance management */
export function usePerformanceManager(config?: PerformanceConfig) {
  const performanceManager = React.useMemo(
    () => PerformanceManager.getInstance(config),
    [config]
  );

  const [metrics, setMetrics] = React.useState<PerformanceMetrics>(
    performanceManager.getMetrics()
  );

  // Update metrics periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceManager.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [performanceManager]);

  const measureAndSet = React.useCallback(
    <T,>(fn: () => T, label?: string): T => {
      return performanceManager.measureComputation(fn, label);
    },
    [performanceManager]
  );

  const clearCache = React.useCallback(() => {
    performanceManager.clearCache();
    setMetrics(performanceManager.getMetrics());
  }, [performanceManager]);

  return {
    performanceManager,
    metrics,
    measureComputation: measureAndSet,
    clearCache,
  };
}

/** Virtual scrolling hook */
export function useVirtualScrolling(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  bufferSize: number = 10
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const endIndex = Math.min(totalItems, startIndex + visibleCount + bufferSize * 2);

  const totalHeight = totalItems * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    visibleItems: endIndex - startIndex,
    handleScroll,
  };
}

/** Memoization helper for expensive computations */
export function useMemoizedComputation<T>(
  computation: () => T,
  dependencies: React.DependencyList,
  performanceManager?: PerformanceManager
): T {
  return React.useMemo(() => {
    if (performanceManager) {
      return performanceManager.measureComputation(computation, 'Memoized computation');
    }
    return computation();
  }, dependencies);
}

export default PerformanceManager;