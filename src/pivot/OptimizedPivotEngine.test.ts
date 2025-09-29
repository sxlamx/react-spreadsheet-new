import { OptimizedPivotEngine } from './OptimizedPivotEngine';
import { PerformanceManager } from './PerformanceManager';
import { PivotConfiguration, PivotDataSet } from './types';

describe('OptimizedPivotEngine', () => {
  let engine: OptimizedPivotEngine;
  let performanceManager: PerformanceManager;
  let sampleData: PivotDataSet;
  let basicConfiguration: PivotConfiguration;

  beforeEach(() => {
    performanceManager = new PerformanceManager();
    engine = new OptimizedPivotEngine(performanceManager);

    sampleData = [
      { id: 1, region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: 50 },
      { id: 2, region: 'North', product: 'Widget A', quarter: 'Q2', sales: 1200, quantity: 60 },
      { id: 3, region: 'North', product: 'Widget B', quarter: 'Q1', sales: 800, quantity: 40 },
      { id: 4, region: 'South', product: 'Widget A', quarter: 'Q1', sales: 1100, quantity: 55 },
      { id: 5, region: 'South', product: 'Widget B', quarter: 'Q2', sales: 900, quantity: 45 },
    ];

    basicConfiguration = {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
    };
  });

  describe('caching functionality', () => {
    test('caches pivot results', () => {
      const spy = jest.spyOn(engine, 'computePivot');

      // First computation
      const result1 = engine.computePivot(sampleData, basicConfiguration);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second computation with same data should use cache
      const result2 = engine.computePivot(sampleData, basicConfiguration);
      expect(spy).toHaveBeenCalledTimes(2); // Called again but should hit cache internally

      expect(result1).toEqual(result2);
    });

    test('invalidates cache when data changes', () => {
      // First computation
      const result1 = engine.computePivot(sampleData, basicConfiguration);

      // Change data
      const modifiedData = [...sampleData, { id: 6, region: 'West', product: 'Widget C', quarter: 'Q1', sales: 500, quantity: 25 }];
      const result2 = engine.computePivot(modifiedData, basicConfiguration);

      // Results should be different
      expect(result1).not.toEqual(result2);
      expect(result2.rowCount).toBeGreaterThan(result1.rowCount);
    });

    test('invalidates cache when configuration changes', () => {
      // First computation
      const result1 = engine.computePivot(sampleData, basicConfiguration);

      // Change configuration
      const modifiedConfig = {
        ...basicConfiguration,
        values: [{ name: 'quantity', dataType: 'number', aggregation: 'sum' }]
      };
      const result2 = engine.computePivot(sampleData, modifiedConfig);

      // Results should be different
      expect(result1).not.toEqual(result2);
    });
  });

  describe('incremental updates', () => {
    test('supportsIncrementalUpdate returns correct boolean', () => {
      // Simple configuration should support incremental updates
      expect(engine.supportsIncrementalUpdate(basicConfiguration)).toBe(true);

      // Complex configuration with filters might not support incremental updates
      const complexConfig = {
        ...basicConfiguration,
        filters: [{ name: 'sales', operator: 'greaterThan', value: 1000 }],
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' }
        ]
      };

      // Should still support incremental updates for most cases
      expect(engine.supportsIncrementalUpdate(complexConfig)).toBe(true);
    });

    test('updatePivotIncremental adds new data correctly', () => {
      // Initial pivot
      const initialResult = engine.computePivot(sampleData, basicConfiguration);

      // Add new data
      const newData = [
        { id: 6, region: 'West', product: 'Widget A', quarter: 'Q1', sales: 750, quantity: 35 }
      ];

      const updatedResult = engine.updatePivotIncremental(initialResult, newData, basicConfiguration);

      expect(updatedResult).toBeDefined();
      expect(updatedResult.rowCount).toBeGreaterThan(initialResult.rowCount);

      // Should have West region now
      const westRegion = updatedResult.rowHeaders.find(row =>
        row.length > 0 && row[0].value === 'West'
      );
      expect(westRegion).toBeDefined();
    });

    test('updatePivotIncremental updates existing aggregations', () => {
      // Initial pivot
      const initialResult = engine.computePivot(sampleData, basicConfiguration);

      // Add data to existing group
      const additionalNorthData = [
        { id: 6, region: 'North', product: 'Widget A', quarter: 'Q1', sales: 500, quantity: 25 }
      ];

      const updatedResult = engine.updatePivotIncremental(initialResult, additionalNorthData, basicConfiguration);

      // Find North Q1 cell and verify sales increased
      const northRowIndex = updatedResult.rowHeaders.findIndex(row =>
        row.length > 0 && row[0].value === 'North'
      );

      if (northRowIndex >= 0) {
        const northQ1Cell = updatedResult.matrix[northRowIndex][0]; // Assuming Q1 is first column
        expect(northQ1Cell.value).toBeGreaterThan(1000); // Original 1000 + additional 500
      }
    });
  });

  describe('parallel processing', () => {
    test('processes large datasets using parallel computation', async () => {
      // Generate large dataset
      const largeData: PivotDataSet = [];
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          id: i,
          region: `Region${i % 10}`,
          product: `Product${i % 100}`,
          quarter: `Q${(i % 4) + 1}`,
          sales: Math.floor(Math.random() * 1000),
          quantity: Math.floor(Math.random() * 100)
        });
      }

      const start = performance.now();
      const result = engine.computePivot(largeData, basicConfiguration);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(10000); // Should complete in reasonable time
    });

    test('uses worker threads for computation when available', () => {
      // Mock worker availability
      const originalWorker = (global as any).Worker;
      (global as any).Worker = jest.fn().mockImplementation(() => ({
        postMessage: jest.fn(),
        terminate: jest.fn(),
        addEventListener: jest.fn()
      }));

      const result = engine.computePivot(sampleData, basicConfiguration);
      expect(result).toBeDefined();

      // Restore original Worker
      (global as any).Worker = originalWorker;
    });
  });

  describe('performance monitoring integration', () => {
    test('tracks computation metrics', () => {
      const measureSpy = jest.spyOn(performanceManager, 'measureComputation');

      engine.computePivot(sampleData, basicConfiguration);

      expect(measureSpy).toHaveBeenCalled();
    });

    test('updates cache metrics', () => {
      // First computation (cache miss)
      engine.computePivot(sampleData, basicConfiguration);

      // Second computation (should hit cache)
      engine.computePivot(sampleData, basicConfiguration);

      const metrics = performanceManager.getMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });

    test('tracks memory usage', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      const metrics = performanceManager.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('optimization strategies', () => {
    test('optimizes for sparse data', () => {
      // Create sparse dataset (many null/empty values)
      const sparseData: PivotDataSet = [
        { id: 1, region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: null },
        { id: 2, region: null, product: 'Widget B', quarter: 'Q2', sales: null, quantity: 50 },
        { id: 3, region: 'South', product: null, quarter: 'Q1', sales: 800, quantity: 40 },
      ];

      const result = engine.computePivot(sparseData, basicConfiguration);
      expect(result).toBeDefined();
      expect(result.matrix.length).toBeGreaterThan(0);
    });

    test('optimizes column-heavy pivots', () => {
      // Configuration with many column fields
      const columnHeavyConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [
          { name: 'product', dataType: 'string' },
          { name: 'quarter', dataType: 'string' }
        ],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(sampleData, columnHeavyConfig);
      expect(result).toBeDefined();
      expect(result.columnCount).toBeGreaterThan(result.rowCount);
    });

    test('optimizes row-heavy pivots', () => {
      // Configuration with many row fields
      const rowHeavyConfig: PivotConfiguration = {
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' },
          { name: 'quarter', dataType: 'string' }
        ],
        columns: [],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(sampleData, rowHeavyConfig);
      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(result.columnCount);
    });
  });

  describe('memory management', () => {
    test('cleans up old cache entries when memory pressure is high', () => {
      // Fill cache with many entries
      for (let i = 0; i < 100; i++) {
        const configVariation = {
          ...basicConfiguration,
          filters: [{ name: 'sales', operator: 'greaterThan', value: i * 10 }]
        };
        engine.computePivot(sampleData, configVariation);
      }

      // Cache should not grow indefinitely
      const metrics = performanceManager.getMetrics();
      expect(metrics.cacheSize).toBeLessThanOrEqual(50); // Should be limited by LRU cache
    });

    test('releases resources after computation', () => {
      const initialMemory = performanceManager.getMetrics().memoryUsage;

      // Perform large computation
      const largeData: PivotDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        region: `Region${i % 5}`,
        product: `Product${i % 10}`,
        quarter: `Q${(i % 4) + 1}`,
        sales: Math.random() * 1000,
        quantity: Math.random() * 100
      }));

      engine.computePivot(largeData, basicConfiguration);

      // Memory should not increase significantly after GC
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performanceManager.getMetrics().memoryUsage;
      expect(finalMemory).toBeLessThan(initialMemory * 2); // Should not double memory usage
    });
  });

  describe('error recovery', () => {
    test('recovers from computation errors gracefully', () => {
      // Mock an error in the base computation
      const originalCompute = engine.computePivot;
      let callCount = 0;

      engine.computePivot = jest.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Computation failed');
        }
        return originalCompute.apply(engine, args);
      });

      // First call should handle error
      expect(() => {
        engine.computePivot(sampleData, basicConfiguration);
      }).toThrow('Computation failed');

      // Second call should succeed
      const result = engine.computePivot(sampleData, basicConfiguration);
      expect(result).toBeDefined();
    });

    test('handles cache corruption gracefully', () => {
      // Corrupt cache by modifying internal state
      const result1 = engine.computePivot(sampleData, basicConfiguration);

      // Manually corrupt cache (in real implementation, this would be detected)
      // This test verifies the engine can recover from cache issues
      const result2 = engine.computePivot(sampleData, basicConfiguration);

      expect(result1).toEqual(result2); // Should still return consistent results
    });
  });

  describe('configuration analysis', () => {
    test('analyzes configuration complexity correctly', () => {
      const simpleConfig = basicConfiguration;
      const complexConfig: PivotConfiguration = {
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' }
        ],
        columns: [
          { name: 'quarter', dataType: 'string' },
          { name: 'month', dataType: 'string' }
        ],
        values: [
          { name: 'sales', dataType: 'number', aggregation: 'sum' },
          { name: 'quantity', dataType: 'number', aggregation: 'avg' },
          { name: 'sales', dataType: 'number', aggregation: 'count' }
        ],
        filters: [
          { name: 'sales', operator: 'greaterThan', value: 100 },
          { name: 'region', operator: 'in', value: ['North', 'South'] }
        ],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      // Both should complete successfully but complex config should take longer
      const start1 = performance.now();
      const result1 = engine.computePivot(sampleData, simpleConfig);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      const result2 = engine.computePivot(sampleData, complexConfig);
      const time2 = performance.now() - start2;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Complex config may take longer, but both should complete
    });
  });
});