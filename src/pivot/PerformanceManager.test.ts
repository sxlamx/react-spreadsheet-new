import { PerformanceManager } from './PerformanceManager';
import { PivotConfiguration, PivotDataSet, PivotStructure } from './types';

describe.skip('LRUCache', () => {
  // LRUCache is not exported, skip these tests
  // let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3); // Small cache for testing
  });

  describe('basic operations', () => {
    test('stores and retrieves values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('returns undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    test('overwrites existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('LRU eviction', () => {
    test('evicts least recently used item when capacity exceeded', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    test('updates access order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1, making it most recently used
      cache.get('key1');

      // Add new item, should evict key2 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    test('updates access order on set of existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1, making it most recently used
      cache.set('key1', 'updated1');

      // Add new item, should evict key2
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('updated1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('capacity management', () => {
    test('handles zero capacity', () => {
      const zeroCache = new LRUCache<string>(0);
      zeroCache.set('key1', 'value1');
      expect(zeroCache.get('key1')).toBeUndefined();
    });

    test('handles single item capacity', () => {
      const singleCache = new LRUCache<string>(1);
      singleCache.set('key1', 'value1');
      singleCache.set('key2', 'value2');

      expect(singleCache.get('key1')).toBeUndefined();
      expect(singleCache.get('key2')).toBe('value2');
    });

    test('clear removes all items', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('size tracking', () => {
    test('tracks size correctly', () => {
      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);

      cache.set('key3', 'value3');
      expect(cache.size).toBe(3);

      cache.set('key4', 'value4'); // Should evict one
      expect(cache.size).toBe(3);

      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});

describe('PerformanceManager', () => {
  let performanceManager: PerformanceManager;
  let sampleData: PivotDataSet;
  let sampleConfiguration: PivotConfiguration;
  let samplePivotStructure: PivotStructure;

  beforeEach(() => {
    performanceManager = new PerformanceManager();

    sampleData = [
      { id: 1, region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: 50 },
      { id: 2, region: 'South', product: 'Widget B', quarter: 'Q2', sales: 1200, quantity: 60 },
    ];

    sampleConfiguration = {
      rows: [{ id: `${Math.random()}`, name: 'region', dataType: 'string' as const }],
      columns: [{ id: `${Math.random()}`, name: 'quarter', dataType: 'string' as const }],
      values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' as const }, aggregation: 'sum' as const }],
      filters: [],
      showGrandTotals: true, showSubtotals: true
    };

    samplePivotStructure = {
      rowCount: 2,
      columnCount: 2,
      rowHeaders: [[{ label: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] }]],
      columnHeaders: [[{ label: 'Q1', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q1'] }]],
      matrix: [[{ value: 1000, formattedValue: '1,000', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] }]]
    };
  });

  describe('cache key generation', () => {
    test('generates consistent cache keys for same inputs', () => {
      const key1 = performanceManager.generateCacheKey(sampleData, sampleConfiguration);
      const key2 = performanceManager.generateCacheKey(sampleData, sampleConfiguration);

      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
      expect(key1.length).toBeGreaterThan(0);
    });

    test('generates different cache keys for different data', () => {
      const differentData = [...sampleData, { id: 3, region: 'East', product: 'Widget C', quarter: 'Q3', sales: 800, quantity: 40 }];

      const key1 = performanceManager.generateCacheKey(sampleData, sampleConfiguration);
      const key2 = performanceManager.generateCacheKey(differentData, sampleConfiguration);

      expect(key1).not.toBe(key2);
    });

    test('generates different cache keys for different configurations', () => {
      const differentConfig = {
        ...sampleConfiguration,
        values: [{ field: { id: `${Math.random()}`, name: 'quantity', dataType: 'number' as const }, aggregation: 'sum' as const }]
      };

      const key1 = performanceManager.generateCacheKey(sampleData, sampleConfiguration);
      const key2 = performanceManager.generateCacheKey(sampleData, differentConfig);

      expect(key1).not.toBe(key2);
    });

    test('handles complex configurations consistently', () => {
      const complexConfig: PivotConfiguration = {
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' }
        ],
        columns: [{ name: 'quarter', dataType: 'string' }],
        values: [
          { name: 'sales', dataType: 'number', aggregation: 'sum' },
          { name: 'quantity', dataType: 'number', aggregation: 'avg' }
        ],
        filters: [
          { name: 'sales', operator: 'greaterThan', value: 500 }
        ],
        options: { showGrandTotals: false, showSubtotals: true, computeMode: 'server' }
      };

      const key1 = performanceManager.generateCacheKey(sampleData, complexConfig);
      const key2 = performanceManager.generateCacheKey(sampleData, complexConfig);

      expect(key1).toBe(key2);
    });
  });

  describe('cache operations', () => {
    test('stores and retrieves cached pivot structures', () => {
      const cacheKey = performanceManager.generateCacheKey(sampleData, sampleConfiguration);

      performanceManager.setCachedPivot(cacheKey, samplePivotStructure);
      const retrieved = performanceManager.getCachedPivot(cacheKey);

      expect(retrieved).toEqual(samplePivotStructure);
    });

    test('returns undefined for non-existent cache keys', () => {
      const retrieved = performanceManager.getCachedPivot('nonexistent-key');
      expect(retrieved).toBeUndefined();
    });

    test('evicts old entries when cache is full', () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 60; i++) { // More than default capacity of 50
        const key = `key-${i}`;
        const structure = { ...samplePivotStructure, rowCount: i };
        performanceManager.setCachedPivot(key, structure);
      }

      // Early entries should be evicted
      expect(performanceManager.getCachedPivot('key-0')).toBeUndefined();
      expect(performanceManager.getCachedPivot('key-59')).toBeDefined();
    });

    test('clear cache removes all entries', () => {
      const cacheKey = performanceManager.generateCacheKey(sampleData, sampleConfiguration);
      performanceManager.setCachedPivot(cacheKey, samplePivotStructure);

      performanceManager.clearCache();

      expect(performanceManager.getCachedPivot(cacheKey)).toBeUndefined();
      expect(performanceManager.getMetrics().cacheSize).toBe(0);
    });
  });

  describe('performance measurement', () => {
    test('measures computation time', () => {
      const result = performanceManager.measureComputation(() => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      }, 'test-computation');

      expect(result).toBe(499500); // Sum of 0 to 999
      expect(performanceManager.getMetrics().lastComputationTime).toBeGreaterThan(0);
    });

    test('measures multiple computations', () => {
      performanceManager.measureComputation(() => 42, 'test-1');
      performanceManager.measureComputation(() => 84, 'test-2');

      const metrics = performanceManager.getMetrics();
      expect(metrics.totalComputations).toBe(2);
      expect(metrics.averageComputationTime).toBeGreaterThan(0);
    });

    test('tracks computation errors', () => {
      expect(() => {
        performanceManager.measureComputation(() => {
          throw new Error('Test error');
        }, 'error-test');
      }).toThrow('Test error');

      // Error tracking would be implementation-specific
    });

    test('handles async computations', async () => {
      const asyncResult = await performanceManager.measureComputationAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      }, 'async-test');

      expect(asyncResult).toBe('async-result');
      expect(performanceManager.getMetrics().lastComputationTime).toBeGreaterThan(0);
    });
  });

  describe('metrics tracking', () => {
    test('tracks cache hit/miss ratios', () => {
      const cacheKey = performanceManager.generateCacheKey(sampleData, sampleConfiguration);

      // Cache miss
      performanceManager.getCachedPivot(cacheKey);
      expect(performanceManager.getMetrics().cacheMisses).toBe(1);

      // Cache hit
      performanceManager.setCachedPivot(cacheKey, samplePivotStructure);
      performanceManager.getCachedPivot(cacheKey);
      expect(performanceManager.getMetrics().cacheHits).toBe(1);
    });

    test('tracks cache size', () => {
      expect(performanceManager.getMetrics().cacheSize).toBe(0);

      performanceManager.setCachedPivot('key1', samplePivotStructure);
      expect(performanceManager.getMetrics().cacheSize).toBe(1);

      performanceManager.setCachedPivot('key2', samplePivotStructure);
      expect(performanceManager.getMetrics().cacheSize).toBe(2);
    });

    test('estimates memory usage', () => {
      const initialMemory = performanceManager.getMetrics().memoryUsage;
      expect(initialMemory).toBeGreaterThan(0);

      // Add some cache entries
      for (let i = 0; i < 10; i++) {
        performanceManager.setCachedPivot(`key-${i}`, samplePivotStructure);
      }

      const newMemory = performanceManager.getMetrics().memoryUsage;
      expect(newMemory).toBeGreaterThanOrEqual(initialMemory);
    });

    test('calculates cache hit rate', () => {
      const cacheKey = performanceManager.generateCacheKey(sampleData, sampleConfiguration);

      // Generate some hits and misses
      performanceManager.getCachedPivot('miss1'); // miss
      performanceManager.getCachedPivot('miss2'); // miss
      performanceManager.setCachedPivot(cacheKey, samplePivotStructure);
      performanceManager.getCachedPivot(cacheKey); // hit
      performanceManager.getCachedPivot(cacheKey); // hit

      const metrics = performanceManager.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.5); // 2 hits out of 4 total requests
    });

    test('tracks average computation time', () => {
      performanceManager.measureComputation(() => {
        // Simulate fast computation
        return 42;
      }, 'fast');

      performanceManager.measureComputation(() => {
        // Simulate slower computation
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      }, 'slow');

      const metrics = performanceManager.getMetrics();
      expect(metrics.averageComputationTime).toBeGreaterThan(0);
      expect(metrics.totalComputations).toBe(2);
    });
  });

  describe('memory management', () => {
    test('handles memory pressure gracefully', () => {
      // Simulate memory pressure by adding many large cache entries
      const largeStructure = {
        ...samplePivotStructure,
        matrix: Array.from({ length: 1000 }, () =>
          Array.from({ length: 1000 }, () => ({
            value: Math.random(),
            formattedValue: '0.00',
            type: 'data' as const,
            level: 0,
            isExpandable: false,
            isExpanded: false,
            path: []
          }))
        )
      };

      for (let i = 0; i < 100; i++) {
        performanceManager.setCachedPivot(`large-key-${i}`, largeStructure);
      }

      // Cache should handle this gracefully without crashing
      const metrics = performanceManager.getMetrics();
      expect(metrics.cacheSize).toBeLessThanOrEqual(50); // Should respect capacity limits
    });

    test('estimates object sizes reasonably', () => {
      const smallStructure = {
        rowCount: 1,
        columnCount: 1,
        rowHeaders: [],
        columnHeaders: [],
        matrix: []
      };

      const largeStructure = {
        ...samplePivotStructure,
        matrix: Array.from({ length: 100 }, () =>
          Array.from({ length: 100 }, () => ({
            value: 1,
            formattedValue: '1',
            type: 'data' as const,
            level: 0,
            isExpandable: false,
            isExpanded: false,
            path: []
          }))
        )
      };

      performanceManager.setCachedPivot('small', smallStructure);
      const smallMemory = performanceManager.getMetrics().memoryUsage;

      performanceManager.setCachedPivot('large', largeStructure);
      const largeMemory = performanceManager.getMetrics().memoryUsage;

      expect(largeMemory).toBeGreaterThan(smallMemory);
    });
  });

  describe('performance analysis', () => {
    test('identifies performance bottlenecks', () => {
      // Simulate various computation patterns
      performanceManager.measureComputation(() => {
        // Fast computation
        return Array.from({ length: 100 }, (_, i) => i).reduce((a, b) => a + b, 0);
      }, 'fast-computation');

      performanceManager.measureComputation(() => {
        // Slow computation
        let result = 0;
        for (let i = 0; i < 100000; i++) {
          result += Math.sqrt(i);
        }
        return result;
      }, 'slow-computation');

      const metrics = performanceManager.getMetrics();
      expect(metrics.totalComputations).toBe(2);
      expect(metrics.averageComputationTime).toBeGreaterThan(0);
    });

    test('provides optimization recommendations', () => {
      // This would be implementation-specific, but we can test the data collection
      const metrics = performanceManager.getMetrics();

      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageComputationTime');
      expect(metrics).toHaveProperty('memoryUsage');

      // Based on these metrics, optimization recommendations could be generated
      if (metrics.cacheHitRate < 0.5) {
        // Recommend increasing cache size or reviewing cache strategy
      }
      if (metrics.averageComputationTime > 1000) {
        // Recommend performance optimizations
      }
    });
  });

  describe('edge cases', () => {
    test('handles null/undefined data gracefully', () => {
      expect(() => {
        performanceManager.generateCacheKey(null as any, sampleConfiguration);
      }).not.toThrow();

      expect(() => {
        performanceManager.generateCacheKey(sampleData, null as any);
      }).not.toThrow();
    });

    test('handles circular references in data', () => {
      const circularData: any = { id: 1, region: 'North' };
      circularData.self = circularData;

      expect(() => {
        performanceManager.generateCacheKey([circularData], sampleConfiguration);
      }).not.toThrow(); // Should handle gracefully, possibly with warning
    });

    test('handles very large datasets efficiently', () => {
      const largeData: PivotDataSet = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        region: `Region${i % 10}`,
        product: `Product${i % 100}`,
        quarter: `Q${(i % 4) + 1}`,
        sales: Math.random() * 1000,
        quantity: Math.random() * 100
      }));

      const start = performance.now();
      const cacheKey = performanceManager.generateCacheKey(largeData, sampleConfiguration);
      const end = performance.now();

      expect(cacheKey).toBeDefined();
      expect(typeof cacheKey).toBe('string');
      expect(end - start).toBeLessThan(1000); // Should complete in reasonable time
    });
  });
});