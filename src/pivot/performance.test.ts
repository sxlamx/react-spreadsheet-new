import { PivotEngine } from './PivotEngine';
import { OptimizedPivotEngine } from './OptimizedPivotEngine';
import { PerformanceManager } from './PerformanceManager';
import { VirtualizedPivotTable } from './VirtualizedPivotTable';
import { PivotConfiguration, PivotDataSet, PivotStructure } from './types';

describe('Pivot Performance Benchmarks', () => {
  let basicEngine: PivotEngine;
  let optimizedEngine: OptimizedPivotEngine;
  let performanceManager: PerformanceManager;

  beforeEach(() => {
    basicEngine = new PivotEngine();
    performanceManager = new PerformanceManager();
    optimizedEngine = new OptimizedPivotEngine(performanceManager);
  });

  const generateLargeDataset = (size: number): PivotDataSet => {
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const products = Array.from({ length: 50 }, (_, i) => `Product_${i}`);
    const categories = ['Premium', 'Standard', 'Basic', 'Economy'];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    return Array.from({ length: size }, (_, i) => ({
      id: i,
      region: regions[i % regions.length],
      product: products[i % products.length],
      category: categories[i % categories.length],
      quarter: quarters[i % quarters.length],
      month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
      sales: Math.floor(Math.random() * 10000) + 1000,
      quantity: Math.floor(Math.random() * 1000) + 50,
      cost: Math.floor(Math.random() * 5000) + 500,
      profit: Math.floor(Math.random() * 3000) + 200,
      date: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
      active: Math.random() > 0.5
    }));
  };

  const basicConfiguration: PivotConfiguration = {
    rows: [{ name: 'region', dataType: 'string' }],
    columns: [{ name: 'quarter', dataType: 'string' }],
    values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
    filters: [],
    options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
  };

  const complexConfiguration: PivotConfiguration = {
    rows: [
      { name: 'region', dataType: 'string' },
      { name: 'product', dataType: 'string' },
      { name: 'category', dataType: 'string' }
    ],
    columns: [
      { name: 'quarter', dataType: 'string' },
      { name: 'month', dataType: 'string' }
    ],
    values: [
      { name: 'sales', dataType: 'number', aggregation: 'sum' },
      { name: 'sales', dataType: 'number', aggregation: 'avg' },
      { name: 'quantity', dataType: 'number', aggregation: 'sum' },
      { name: 'cost', dataType: 'number', aggregation: 'min' },
      { name: 'profit', dataType: 'number', aggregation: 'max' }
    ],
    filters: [
      { name: 'sales', operator: 'greaterThan', value: 500 },
      { name: 'active', operator: 'equals', value: true }
    ],
    options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
  };

  describe('Dataset Size Benchmarks', () => {
    const testSizes = [100, 1000, 5000, 10000, 25000, 50000];

    test.each(testSizes)('Basic pivot computation with %d records', (size) => {
      const data = generateLargeDataset(size);

      const start = performance.now();
      const result = basicEngine.computePivot(data, basicConfiguration);
      const end = performance.now();

      const computationTime = end - start;

      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.columnCount).toBeGreaterThan(0);

      // Performance expectations (adjust based on acceptable thresholds)
      if (size <= 1000) {
        expect(computationTime).toBeLessThan(100); // < 100ms for small datasets
      } else if (size <= 10000) {
        expect(computationTime).toBeLessThan(1000); // < 1s for medium datasets
      } else {
        expect(computationTime).toBeLessThan(5000); // < 5s for large datasets
      }

      console.log(`Basic engine: ${size} records processed in ${computationTime.toFixed(2)}ms`);
    });

    test.each(testSizes)('Optimized pivot computation with %d records', (size) => {
      const data = generateLargeDataset(size);

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, basicConfiguration);
      const end = performance.now();

      const computationTime = end - start;

      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.columnCount).toBeGreaterThan(0);

      // Optimized engine should be faster
      if (size <= 1000) {
        expect(computationTime).toBeLessThan(50); // < 50ms for small datasets
      } else if (size <= 10000) {
        expect(computationTime).toBeLessThan(500); // < 500ms for medium datasets
      } else {
        expect(computationTime).toBeLessThan(2500); // < 2.5s for large datasets
      }

      console.log(`Optimized engine: ${size} records processed in ${computationTime.toFixed(2)}ms`);
    });

    test('Performance comparison: Basic vs Optimized engines', () => {
      const data = generateLargeDataset(10000);

      // Basic engine
      const basicStart = performance.now();
      const basicResult = basicEngine.computePivot(data, complexConfiguration);
      const basicEnd = performance.now();
      const basicTime = basicEnd - basicStart;

      // Optimized engine
      const optimizedStart = performance.now();
      const optimizedResult = optimizedEngine.computePivot(data, complexConfiguration);
      const optimizedEnd = performance.now();
      const optimizedTime = optimizedEnd - optimizedStart;

      expect(basicResult).toBeDefined();
      expect(optimizedResult).toBeDefined();

      // Optimized should be significantly faster
      expect(optimizedTime).toBeLessThan(basicTime);

      const improvementRatio = basicTime / optimizedTime;
      expect(improvementRatio).toBeGreaterThan(1.2); // At least 20% improvement

      console.log(`Performance improvement: ${improvementRatio.toFixed(2)}x faster`);
      console.log(`Basic: ${basicTime.toFixed(2)}ms, Optimized: ${optimizedTime.toFixed(2)}ms`);
    });
  });

  describe('Configuration Complexity Benchmarks', () => {
    const data = generateLargeDataset(5000);

    test('Simple configuration performance', () => {
      const simpleConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: false, showSubtotals: false, computeMode: 'client' }
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, simpleConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(200);

      console.log(`Simple config: ${(end - start).toFixed(2)}ms`);
    });

    test('Medium complexity configuration performance', () => {
      const mediumConfig: PivotConfiguration = {
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' }
        ],
        columns: [{ name: 'quarter', dataType: 'string' }],
        values: [
          { name: 'sales', dataType: 'number', aggregation: 'sum' },
          { name: 'quantity', dataType: 'number', aggregation: 'avg' }
        ],
        filters: [{ name: 'sales', operator: 'greaterThan', value: 1000 }],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, mediumConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(800);

      console.log(`Medium config: ${(end - start).toFixed(2)}ms`);
    });

    test('Complex configuration performance', () => {
      const start = performance.now();
      const result = optimizedEngine.computePivot(data, complexConfiguration);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(2000);

      console.log(`Complex config: ${(end - start).toFixed(2)}ms`);
    });

    test('Configuration with many filters performance', () => {
      const heavyFilterConfig: PivotConfiguration = {
        ...basicConfiguration,
        filters: [
          { name: 'sales', operator: 'greaterThan', value: 500 },
          { name: 'sales', operator: 'lessThan', value: 8000 },
          { name: 'quantity', operator: 'greaterThan', value: 25 },
          { name: 'region', operator: 'in', value: ['North', 'South', 'East'] },
          { name: 'active', operator: 'equals', value: true }
        ]
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, heavyFilterConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(1000);

      console.log(`Heavy filters config: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe('Caching Performance', () => {
    const data = generateLargeDataset(10000);

    test('Cache hit performance vs cache miss', () => {
      // First computation (cache miss)
      const missStart = performance.now();
      const result1 = optimizedEngine.computePivot(data, complexConfiguration);
      const missEnd = performance.now();
      const missTime = missEnd - missStart;

      // Second computation (cache hit)
      const hitStart = performance.now();
      const result2 = optimizedEngine.computePivot(data, complexConfiguration);
      const hitEnd = performance.now();
      const hitTime = hitEnd - hitStart;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).toEqual(result2);

      // Cache hit should be significantly faster
      expect(hitTime).toBeLessThan(missTime * 0.1); // At least 10x faster

      console.log(`Cache miss: ${missTime.toFixed(2)}ms, Cache hit: ${hitTime.toFixed(2)}ms`);
      console.log(`Cache speedup: ${(missTime / hitTime).toFixed(2)}x`);
    });

    test('Cache performance with multiple configurations', () => {
      const configs = [
        basicConfiguration,
        complexConfiguration,
        { ...basicConfiguration, values: [{ name: 'quantity', dataType: 'number', aggregation: 'sum' }] },
        { ...basicConfiguration, rows: [{ name: 'product', dataType: 'string' }] }
      ];

      // Fill cache
      const cacheWarmupStart = performance.now();
      configs.forEach(config => {
        optimizedEngine.computePivot(data, config);
      });
      const cacheWarmupEnd = performance.now();

      // Access cached results
      const cacheAccessStart = performance.now();
      configs.forEach(config => {
        optimizedEngine.computePivot(data, config);
      });
      const cacheAccessEnd = performance.now();

      const warmupTime = cacheWarmupEnd - cacheWarmupStart;
      const accessTime = cacheAccessEnd - cacheAccessStart;

      expect(accessTime).toBeLessThan(warmupTime * 0.2); // Much faster with cache

      console.log(`Cache warmup: ${warmupTime.toFixed(2)}ms, Cache access: ${accessTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Performance', () => {
    test('Memory usage with large datasets', () => {
      const sizes = [1000, 5000, 10000, 25000];
      const memoryUsages: number[] = [];

      sizes.forEach(size => {
        const data = generateLargeDataset(size);

        const initialMemory = performanceManager.getMetrics().memoryUsage;
        const result = optimizedEngine.computePivot(data, complexConfiguration);
        const finalMemory = performanceManager.getMetrics().memoryUsage;

        const memoryIncrease = finalMemory - initialMemory;
        memoryUsages.push(memoryIncrease);

        expect(result).toBeDefined();
        expect(memoryIncrease).toBeGreaterThan(0);

        console.log(`${size} records: ${memoryIncrease.toFixed(2)} bytes increase`);
      });

      // Memory usage should scale reasonably with data size
      for (let i = 1; i < memoryUsages.length; i++) {
        const ratio = memoryUsages[i] / memoryUsages[i - 1];
        expect(ratio).toBeLessThan(10); // Should not increase exponentially
      }
    });

    test('Memory cleanup after computation', () => {
      const data = generateLargeDataset(10000);

      const initialMemory = performanceManager.getMetrics().memoryUsage;

      // Perform multiple computations
      for (let i = 0; i < 10; i++) {
        optimizedEngine.computePivot(data, complexConfiguration);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performanceManager.getMetrics().memoryUsage;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (not leaked)
      expect(memoryIncrease).toBeLessThan(initialMemory * 2);

      console.log(`Memory increase after 10 computations: ${memoryIncrease.toFixed(2)} bytes`);
    });

    test('Cache memory management', () => {
      const data = generateLargeDataset(5000);

      // Fill cache beyond capacity
      for (let i = 0; i < 100; i++) {
        const config = {
          ...basicConfiguration,
          filters: [{ name: 'sales', operator: 'greaterThan', value: i * 10 }]
        };
        optimizedEngine.computePivot(data, config);
      }

      const metrics = performanceManager.getMetrics();

      // Cache should be limited in size
      expect(metrics.cacheSize).toBeLessThanOrEqual(50);
      expect(metrics.memoryUsage).toBeLessThan(Number.MAX_SAFE_INTEGER);

      console.log(`Cache size after 100 variations: ${metrics.cacheSize}`);
    });
  });

  describe('Aggregation Performance', () => {
    const data = generateLargeDataset(20000);

    test('Different aggregation functions performance', () => {
      const aggregations: Array<{ name: string; aggregation: any }> = [
        { name: 'sum', aggregation: 'sum' },
        { name: 'avg', aggregation: 'avg' },
        { name: 'count', aggregation: 'count' },
        { name: 'min', aggregation: 'min' },
        { name: 'max', aggregation: 'max' },
        { name: 'countDistinct', aggregation: 'countDistinct' }
      ];

      const results: Array<{ aggregation: string; time: number }> = [];

      aggregations.forEach(({ name, aggregation }) => {
        const config: PivotConfiguration = {
          ...basicConfiguration,
          values: [{ name: 'sales', dataType: 'number', aggregation }]
        };

        const start = performance.now();
        const result = optimizedEngine.computePivot(data, config);
        const end = performance.now();

        const time = end - start;
        results.push({ aggregation: name, time });

        expect(result).toBeDefined();
        expect(time).toBeLessThan(3000);

        console.log(`${name} aggregation: ${time.toFixed(2)}ms`);
      });

      // Count should be fastest, countDistinct should be slowest
      const countTime = results.find(r => r.aggregation === 'count')?.time || 0;
      const countDistinctTime = results.find(r => r.aggregation === 'countDistinct')?.time || 0;

      expect(countTime).toBeLessThan(countDistinctTime);
    });

    test('Multiple aggregations performance', () => {
      const multipleAggConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [{ name: 'quarter', dataType: 'string' }],
        values: [
          { name: 'sales', dataType: 'number', aggregation: 'sum' },
          { name: 'sales', dataType: 'number', aggregation: 'avg' },
          { name: 'sales', dataType: 'number', aggregation: 'count' },
          { name: 'quantity', dataType: 'number', aggregation: 'sum' },
          { name: 'quantity', dataType: 'number', aggregation: 'max' },
          { name: 'cost', dataType: 'number', aggregation: 'min' }
        ],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, multipleAggConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(4000);

      console.log(`Multiple aggregations: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe('Drill Down Performance', () => {
    const data = generateLargeDataset(15000);

    test('Drill down operation performance', () => {
      const result = optimizedEngine.computePivot(data, complexConfiguration);

      const start = performance.now();
      const drillDownData = optimizedEngine.drillDown(data, complexConfiguration, ['North', 'Product_1'], ['Q1']);
      const end = performance.now();

      expect(drillDownData).toBeDefined();
      expect(drillDownData.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(500);

      console.log(`Drill down: ${(end - start).toFixed(2)}ms, ${drillDownData.length} records`);
    });

    test('Multiple drill down operations', () => {
      const result = optimizedEngine.computePivot(data, complexConfiguration);

      const drillDownPaths = [
        { rowPath: ['North'], columnPath: ['Q1'] },
        { rowPath: ['South', 'Product_5'], columnPath: ['Q2'] },
        { rowPath: ['East'], columnPath: [] },
        { rowPath: [], columnPath: ['Q3'] }
      ];

      const start = performance.now();
      drillDownPaths.forEach(({ rowPath, columnPath }) => {
        const drillDownData = optimizedEngine.drillDown(data, complexConfiguration, rowPath, columnPath);
        expect(drillDownData).toBeDefined();
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);

      console.log(`Multiple drill downs: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe('Filter Performance', () => {
    const data = generateLargeDataset(20000);

    test('Single filter performance', () => {
      const filterConfig: PivotConfiguration = {
        ...basicConfiguration,
        filters: [{ name: 'sales', operator: 'greaterThan', value: 5000 }]
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, filterConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(1500);

      console.log(`Single filter: ${(end - start).toFixed(2)}ms`);
    });

    test('Multiple filters performance', () => {
      const multipleFilterConfig: PivotConfiguration = {
        ...basicConfiguration,
        filters: [
          { name: 'sales', operator: 'greaterThan', value: 1000 },
          { name: 'sales', operator: 'lessThan', value: 8000 },
          { name: 'quantity', operator: 'greaterThan', value: 50 },
          { name: 'region', operator: 'in', value: ['North', 'South'] },
          { name: 'active', operator: 'equals', value: true }
        ]
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, multipleFilterConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(2000);

      console.log(`Multiple filters: ${(end - start).toFixed(2)}ms`);
    });

    test('Complex filter conditions performance', () => {
      const complexFilterConfig: PivotConfiguration = {
        ...complexConfiguration,
        filters: [
          { name: 'sales', operator: 'between', value: [1000, 9000] },
          { name: 'region', operator: 'contains', value: 'orth' },
          { name: 'date', operator: 'greaterThan', value: '2023-06-01' },
          { name: 'category', operator: 'notEquals', value: 'Economy' }
        ]
      };

      const start = performance.now();
      const result = optimizedEngine.computePivot(data, complexFilterConfig);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(3000);

      console.log(`Complex filters: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe('Scalability Tests', () => {
    test('Linear scalability with data size', () => {
      const sizes = [1000, 2000, 4000, 8000];
      const times: number[] = [];

      sizes.forEach(size => {
        const data = generateLargeDataset(size);

        const start = performance.now();
        const result = optimizedEngine.computePivot(data, basicConfiguration);
        const end = performance.now();

        const time = end - start;
        times.push(time);

        expect(result).toBeDefined();

        console.log(`${size} records: ${time.toFixed(2)}ms`);
      });

      // Check that time complexity is reasonable (not exponential)
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i - 1];
        const sizeRatio = sizes[i] / sizes[i - 1];

        // Time should not increase much faster than data size
        expect(ratio).toBeLessThan(sizeRatio * 2);
      }
    });

    test('Performance with varying pivot dimensions', () => {
      const data = generateLargeDataset(10000);

      const dimensionTests = [
        { rows: 1, cols: 1, values: 1 },
        { rows: 2, cols: 1, values: 2 },
        { rows: 1, cols: 2, values: 3 },
        { rows: 3, cols: 2, values: 4 },
        { rows: 2, cols: 3, values: 5 }
      ];

      dimensionTests.forEach(({ rows, cols, values }) => {
        const config: PivotConfiguration = {
          rows: Array.from({ length: rows }, (_, i) => ({ name: ['region', 'product', 'category'][i], dataType: 'string' })),
          columns: Array.from({ length: cols }, (_, i) => ({ name: ['quarter', 'month'][i], dataType: 'string' })),
          values: Array.from({ length: values }, (_, i) => ({ name: ['sales', 'quantity', 'cost', 'profit', 'sales'][i], dataType: 'number', aggregation: 'sum' })),
          filters: [],
          options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
        };

        const start = performance.now();
        const result = optimizedEngine.computePivot(data, config);
        const end = performance.now();

        expect(result).toBeDefined();
        expect(end - start).toBeLessThan(5000);

        console.log(`${rows}R×${cols}C×${values}V: ${(end - start).toFixed(2)}ms`);
      });
    });
  });

  describe('Performance Regression Tests', () => {
    test('Baseline performance benchmarks', () => {
      const data = generateLargeDataset(10000);

      // These are baseline expectations that should not regress
      const benchmarks = [
        {
          name: 'Simple pivot',
          config: basicConfiguration,
          maxTime: 1000
        },
        {
          name: 'Complex pivot',
          config: complexConfiguration,
          maxTime: 3000
        },
        {
          name: 'Filtered pivot',
          config: {
            ...basicConfiguration,
            filters: [{ name: 'sales', operator: 'greaterThan', value: 2000 }]
          },
          maxTime: 1500
        }
      ];

      benchmarks.forEach(({ name, config, maxTime }) => {
        const start = performance.now();
        const result = optimizedEngine.computePivot(data, config);
        const end = performance.now();

        expect(result).toBeDefined();
        expect(end - start).toBeLessThan(maxTime);

        console.log(`${name}: ${(end - start).toFixed(2)}ms (max: ${maxTime}ms)`);
      });
    });

    test('Memory usage benchmarks', () => {
      const data = generateLargeDataset(15000);

      const initialMemory = performanceManager.getMetrics().memoryUsage;
      const result = optimizedEngine.computePivot(data, complexConfiguration);
      const finalMemory = performanceManager.getMetrics().memoryUsage;

      const memoryIncrease = finalMemory - initialMemory;

      expect(result).toBeDefined();
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Should not use more than 50MB

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});