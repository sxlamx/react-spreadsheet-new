import { PivotEngine } from './PivotEngine';
import { PivotConfiguration, PivotDataSet, PivotStructure } from './types';

describe('PivotEngine', () => {
  let engine: PivotEngine;
  let sampleData: PivotDataSet;
  let basicConfiguration: PivotConfiguration;

  beforeEach(() => {
    engine = new PivotEngine();

    sampleData = [
      { id: 1, region: 'North', product: 'Widget A', category: 'Premium', quarter: 'Q1', sales: 1000, quantity: 50 },
      { id: 2, region: 'North', product: 'Widget A', category: 'Premium', quarter: 'Q2', sales: 1200, quantity: 60 },
      { id: 3, region: 'North', product: 'Widget B', category: 'Standard', quarter: 'Q1', sales: 800, quantity: 40 },
      { id: 4, region: 'South', product: 'Widget A', category: 'Premium', quarter: 'Q1', sales: 1100, quantity: 55 },
      { id: 5, region: 'South', product: 'Widget B', category: 'Standard', quarter: 'Q2', sales: 900, quantity: 45 },
      { id: 6, region: 'East', product: 'Widget A', category: 'Basic', quarter: 'Q1', sales: 600, quantity: 30 },
    ];

    basicConfiguration = {
      rows: [
        { name: 'region', dataType: 'string' },
        { name: 'product', dataType: 'string' }
      ],
      columns: [
        { name: 'quarter', dataType: 'string' }
      ],
      values: [
        { name: 'sales', dataType: 'number', aggregation: 'sum' },
        { name: 'quantity', dataType: 'number', aggregation: 'sum' }
      ],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client'
      }
    };
  });

  describe('computePivot', () => {
    test('creates basic pivot structure', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.columnCount).toBeGreaterThan(0);
      expect(result.rowHeaders).toBeDefined();
      expect(result.columnHeaders).toBeDefined();
      expect(result.matrix).toBeDefined();
    });

    test('handles empty data set', () => {
      const result = engine.computePivot([], basicConfiguration);

      expect(result).toBeDefined();
      expect(result.rowCount).toBe(0);
      expect(result.columnCount).toBe(basicConfiguration.values.length);
      expect(result.matrix).toEqual([]);
    });

    test('applies row grouping correctly', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      // Should have 3 regions (North, South, East)
      const regionHeaders = result.rowHeaders.filter(row =>
        row.length > 0 && row[0].level === 0
      );
      expect(regionHeaders.length).toBe(3);

      // Check specific region exists
      const northRegion = result.rowHeaders.find(row =>
        row.length > 0 && row[0].value === 'North'
      );
      expect(northRegion).toBeDefined();
    });

    test('applies column grouping correctly', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      // Should have Q1 and Q2 quarters
      const quarterHeaders = result.columnHeaders[0];
      expect(quarterHeaders.length).toBe(basicConfiguration.values.length * 2); // 2 quarters * 2 value fields
    });

    test('calculates aggregated values correctly', () => {
      const simpleConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(sampleData, simpleConfig);

      // Find North region row
      const northRowIndex = result.rowHeaders.findIndex(row =>
        row.length > 0 && row[0].value === 'North'
      );
      expect(northRowIndex).toBeGreaterThanOrEqual(0);

      // North should have sales sum of 1000 + 1200 + 800 = 3000
      const northSalesCell = result.matrix[northRowIndex][0];
      expect(northSalesCell.value).toBe(3000);
    });

    test('handles different aggregation types', () => {
      const avgConfig: PivotConfiguration = {
        ...basicConfiguration,
        values: [
          { name: 'sales', dataType: 'number', aggregation: 'avg' },
          { name: 'quantity', dataType: 'number', aggregation: 'max' }
        ]
      };

      const result = engine.computePivot(sampleData, avgConfig);
      expect(result.matrix.length).toBeGreaterThan(0);
      expect(result.matrix[0].length).toBe(avgConfig.values.length * 2); // 2 quarters
    });

    test('applies filters correctly', () => {
      const filteredConfig: PivotConfiguration = {
        ...basicConfiguration,
        filters: [
          { name: 'sales', operator: 'greaterThan', value: 900 }
        ]
      };

      const result = engine.computePivot(sampleData, filteredConfig);

      // Should filter out records with sales <= 900
      // Original has 6 records, should have 4 after filtering (1000, 1200, 1100 are > 900)
      const totalRows = result.rowHeaders.filter(row => row.length > 0).length;
      expect(totalRows).toBeLessThanOrEqual(4); // Fewer or equal rows due to filtering
    });

    test('includes grand totals when enabled', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      // Should have grand total row
      const grandTotalRow = result.rowHeaders.find(row =>
        row.length > 0 && row[0].value === 'Grand Total'
      );
      expect(grandTotalRow).toBeDefined();
    });

    test('excludes grand totals when disabled', () => {
      const configWithoutTotals: PivotConfiguration = {
        ...basicConfiguration,
        options: {
          ...basicConfiguration.options,
          showGrandTotals: false
        }
      };

      const result = engine.computePivot(sampleData, configWithoutTotals);

      const grandTotalRow = result.rowHeaders.find(row =>
        row.length > 0 && row[0].value === 'Grand Total'
      );
      expect(grandTotalRow).toBeUndefined();
    });
  });

  describe('drill down functionality', () => {
    test('drillDown returns filtered data for specific cell', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      // Drill down into North/Widget A cell
      const northWidgetAPath = ['North', 'Widget A'];
      const columnPath = ['Q1'];
      const drillDownData = engine.drillDown(sampleData, basicConfiguration, northWidgetAPath, columnPath);

      expect(drillDownData).toBeDefined();
      expect(drillDownData.length).toBe(1); // Only one record matches North + Widget A + Q1
      expect(drillDownData[0].region).toBe('North');
      expect(drillDownData[0].product).toBe('Widget A');
      expect(drillDownData[0].quarter).toBe('Q1');
    });

    test('drillDown with empty paths returns all data', () => {
      const drillDownData = engine.drillDown(sampleData, basicConfiguration, [], []);
      expect(drillDownData).toEqual(sampleData);
    });

    test('drillDown handles partial paths', () => {
      const northPath = ['North'];
      const drillDownData = engine.drillDown(sampleData, basicConfiguration, northPath, []);

      // Should return all North region records
      expect(drillDownData.length).toBe(3); // 3 North region records in sample data
      expect(drillDownData.every(record => record.region === 'North')).toBe(true);
    });
  });

  describe('error handling', () => {
    test('handles invalid field names gracefully', () => {
      const invalidConfig: PivotConfiguration = {
        ...basicConfiguration,
        rows: [{ name: 'nonexistent_field', dataType: 'string' }]
      };

      const result = engine.computePivot(sampleData, invalidConfig);
      expect(result).toBeDefined();
      // Should handle gracefully, possibly with empty or null values
    });

    test('handles invalid aggregation types gracefully', () => {
      const invalidAggConfig: PivotConfiguration = {
        ...basicConfiguration,
        values: [{ name: 'sales', dataType: 'number', aggregation: 'invalid' as any }]
      };

      expect(() => {
        engine.computePivot(sampleData, invalidAggConfig);
      }).toThrow(); // Should throw error for invalid aggregation
    });

    test('handles null/undefined data values', () => {
      const dataWithNulls: PivotDataSet = [
        { id: 1, region: null, product: 'Widget A', sales: 1000, quantity: null },
        { id: 2, region: 'North', product: null, sales: null, quantity: 50 },
        { id: 3, region: 'South', product: 'Widget B', sales: 800, quantity: 40 },
      ];

      const result = engine.computePivot(dataWithNulls, basicConfiguration);
      expect(result).toBeDefined();
      expect(result.matrix.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    test('handles large datasets efficiently', () => {
      // Generate large dataset
      const largeData: PivotDataSet = [];
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          id: i,
          region: `Region${i % 10}`,
          product: `Product${i % 100}`,
          category: `Category${i % 5}`,
          quarter: `Q${(i % 4) + 1}`,
          sales: Math.floor(Math.random() * 10000),
          quantity: Math.floor(Math.random() * 1000)
        });
      }

      const start = performance.now();
      const result = engine.computePivot(largeData, basicConfiguration);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(5000); // Should complete in < 5 seconds
      expect(result.rowCount).toBeGreaterThan(0);
    });
  });

  describe('data type handling', () => {
    test('handles date fields correctly', () => {
      const dataWithDates: PivotDataSet = [
        { id: 1, region: 'North', date: '2023-01-01', sales: 1000 },
        { id: 2, region: 'North', date: '2023-02-01', sales: 1200 },
        { id: 3, region: 'South', date: '2023-01-01', sales: 800 },
      ];

      const dateConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [{ name: 'date', dataType: 'date' }],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(dataWithDates, dateConfig);
      expect(result).toBeDefined();
      expect(result.columnHeaders[0].length).toBe(2); // 2 dates
    });

    test('handles boolean fields correctly', () => {
      const dataWithBooleans: PivotDataSet = [
        { id: 1, region: 'North', active: true, sales: 1000 },
        { id: 2, region: 'North', active: false, sales: 1200 },
        { id: 3, region: 'South', active: true, sales: 800 },
      ];

      const booleanConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [{ name: 'active', dataType: 'boolean' }],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(dataWithBooleans, booleanConfig);
      expect(result).toBeDefined();
      expect(result.columnHeaders[0].length).toBe(2); // true and false columns
    });
  });

  describe('subtotals functionality', () => {
    test('includes subtotals when enabled', () => {
      const result = engine.computePivot(sampleData, basicConfiguration);

      // Should have subtotal rows for each region
      const subtotalRows = result.rowHeaders.filter(row =>
        row.length > 0 && row[0].value.toString().includes('Subtotal')
      );
      expect(subtotalRows.length).toBeGreaterThan(0);
    });

    test('excludes subtotals when disabled', () => {
      const configWithoutSubtotals: PivotConfiguration = {
        ...basicConfiguration,
        options: {
          ...basicConfiguration.options,
          showSubtotals: false
        }
      };

      const result = engine.computePivot(sampleData, configWithoutSubtotals);

      const subtotalRows = result.rowHeaders.filter(row =>
        row.length > 0 && row[0].value.toString().includes('Subtotal')
      );
      expect(subtotalRows.length).toBe(0);
    });
  });

  describe('multi-level hierarchies', () => {
    test('handles three-level row hierarchy', () => {
      const threeLevelConfig: PivotConfiguration = {
        rows: [
          { name: 'region', dataType: 'string' },
          { name: 'product', dataType: 'string' },
          { name: 'category', dataType: 'string' }
        ],
        columns: [{ name: 'quarter', dataType: 'string' }],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(sampleData, threeLevelConfig);

      // Should have hierarchy with 3 levels
      const deepestLevel = result.rowHeaders.find(row =>
        row.length === 3 && row[2].level === 2
      );
      expect(deepestLevel).toBeDefined();
    });

    test('handles multi-level column hierarchy', () => {
      const multiLevelColumnConfig: PivotConfiguration = {
        rows: [{ name: 'region', dataType: 'string' }],
        columns: [
          { name: 'quarter', dataType: 'string' },
          { name: 'category', dataType: 'string' }
        ],
        values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      const result = engine.computePivot(sampleData, multiLevelColumnConfig);

      // Should have hierarchical column headers
      expect(result.columnHeaders.length).toBe(2); // Two levels of column headers
    });
  });
});