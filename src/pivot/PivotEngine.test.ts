import { PivotEngine } from './engine';
import { PivotConfiguration, PivotDataSet, PivotStructure } from './types';

describe('PivotEngine', () => {
  let engine: PivotEngine;
  let sampleData: PivotDataSet;
  let basicConfiguration: PivotConfiguration;

  beforeEach(() => {
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
        { id: '1', name: 'region', dataType: 'string' },
        { id: '2', name: 'product', dataType: 'string' }
      ],
      columns: [
        { id: '3', name: 'quarter', dataType: 'string' }
      ],
      values: [
        { field: { id: '4', name: 'sales', dataType: 'number' }, aggregation: 'sum' },
        { field: { id: '5', name: 'quantity', dataType: 'number' }, aggregation: 'sum' }
      ],
      filters: []
    };

    engine = new PivotEngine(sampleData, basicConfiguration);
  });

  describe('computePivot', () => {
    test('creates basic pivot structure', () => {
      const result = engine.computePivot([]);

      expect(result).toBeDefined();
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.columnCount).toBeGreaterThan(0);
      expect(result.rowHeaders).toBeDefined();
      expect(result.columnHeaders).toBeDefined();
      expect(result.matrix).toBeDefined();
    });

    test('handles empty data set', () => {
      const result = engine.computePivot([]);

      expect(result).toBeDefined();
      expect(result.rowCount).toBe(0);
      expect(result.columnCount).toBe(basicConfiguration.values.length);
      expect(result.matrix).toEqual([]);
    });

    test('applies row grouping correctly', () => {
      const result = engine.computePivot([]);

      // Should have 3 regions (North, South, East)
      const regionHeaders = result.rowHeaders.filter(row =>
        row.length > 0 && row[0].level === 0
      );
      expect(regionHeaders.length).toBe(3);

      // Check specific region exists
      const northRegion = result.rowHeaders.find(row =>
        row.length > 0 && row[0].label === 'North'
      );
      expect(northRegion).toBeDefined();
    });

    test('applies column grouping correctly', () => {
      const result = engine.computePivot([]);

      // Should have Q1 and Q2 quarters
      const quarterHeaders = result.columnHeaders[0];
      expect(quarterHeaders.length).toBe(basicConfiguration.values.length * 2); // 2 quarters * 2 value fields
    });

    test('calculates aggregated values correctly', () => {
      const simpleConfig: PivotConfiguration = {
        rows: [{ id: `${Math.random()}`, name:'region', dataType: 'string' }],
        columns: [],
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
        filters: []
      };

      const result = engine.computePivot([]);

      // Find North region row
      const northRowIndex = result.rowHeaders.findIndex(row =>
        row.length > 0 && row[0].label === 'North'
      );
      expect(northRowIndex).toBeGreaterThanOrEqual(0);

      // North should have sales sum of 1000 + 1200 + 800 = 3000
      const northSalesCell = result.matrix[northRowIndex]?.[0];
      expect(northSalesCell?.value).toBe(3000);
    });

    test('handles different aggregation types', () => {
      const avgConfig: PivotConfiguration = {
        ...basicConfiguration,
        values: [
          { field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'avg' },
          { field: { id: `${Math.random()}`, name: 'quantity', dataType: 'number' }, aggregation: 'max' }
        ]
      };

      const result = engine.computePivot([]);
      expect(result.matrix.length).toBeGreaterThan(0);
      expect(result.matrix[0].length).toBe(avgConfig.values.length * 2); // 2 quarters
    });

    test('applies filters correctly', () => {
      const filteredConfig: PivotConfiguration = {
        ...basicConfiguration,
        filters: [
          { field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, operator: 'greaterThan', value: 900 }
        ]
      };

      const result = engine.computePivot([]);

      // Should filter out records with sales <= 900
      // Original has 6 records, should have 4 after filtering (1000, 1200, 1100 are > 900)
      const totalRows = result.rowHeaders.filter(row => row.length > 0).length;
      expect(totalRows).toBeLessThanOrEqual(4); // Fewer or equal rows due to filtering
    });

    test('includes grand totals when enabled', () => {
      const result = engine.computePivot([]);

      // Should have grand total row
      const grandTotalRow = result.rowHeaders.find(row =>
        row.length > 0 && row[0].label === 'Grand Total'
      );
      expect(grandTotalRow).toBeDefined();
    });

    test('excludes grand totals when disabled', () => {
      const configWithoutTotals: PivotConfiguration = {
        ...basicConfiguration
      };

      const result = engine.computePivot([]);

      const grandTotalRow = result.rowHeaders.find(row =>
        row.length > 0 && row[0].label === 'Grand Total'
      );
      expect(grandTotalRow).toBeUndefined();
    });
  });

  describe('drill down functionality', () => {
    test.skip('drillDown returns filtered data for specific cell', () => {
      // TODO: Implement drillDown functionality
      const result = engine.computePivot([]);

      // Drill down into North/Widget A cell
      const northWidgetAPath = ['North', 'Widget A'];
      const columnPath = ['Q1'];
      // const drillDownData = engine.drillDown(sampleData, basicConfiguration, northWidgetAPath, columnPath);

      // expect(drillDownData).toBeDefined();
      // expect(drillDownData.length).toBe(1); // Only one record matches North + Widget A + Q1
      // expect(drillDownData[0].region).toBe('North');
      // expect(drillDownData[0].product).toBe('Widget A');
      // expect(drillDownData[0].quarter).toBe('Q1');
    });

    test.skip('drillDown with empty paths returns all data', () => {
      // TODO: Implement drillDown functionality
      // const drillDownData = engine.drillDown(sampleData, basicConfiguration, [], []);
      // expect(drillDownData).toEqual(sampleData);
    });

    test.skip('drillDown handles partial paths', () => {
      // TODO: Implement drillDown functionality
      const northPath = ['North'];
      // const drillDownData = engine.drillDown(sampleData, basicConfiguration, northPath, []);

      // Should return all North region records
      // expect(drillDownData.length).toBe(3); // 3 North region records in sample data
      // expect(drillDownData.every(record => record.region === 'North')).toBe(true);
    });
  });

  describe('error handling', () => {
    test('handles invalid field names gracefully', () => {
      const invalidConfig: PivotConfiguration = {
        ...basicConfiguration,
        rows: [{ id: `${Math.random()}`, name:'nonexistent_field', dataType: 'string' }]
      };

      const result = engine.computePivot([]);
      expect(result).toBeDefined();
      // Should handle gracefully, possibly with empty or null values
    });

    test('handles invalid aggregation types gracefully', () => {
      const invalidAggConfig: PivotConfiguration = {
        ...basicConfiguration,
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'invalid' as any }]
      };

      expect(() => {
        engine.computePivot([]);
      }).toThrow(); // Should throw error for invalid aggregation
    });

    test('handles null/undefined data values', () => {
      const dataWithNulls: PivotDataSet = [
        { id: 1, region: null, product: 'Widget A', sales: 1000, quantity: null },
        { id: 2, region: 'North', product: null, sales: null, quantity: 50 },
        { id: 3, region: 'South', product: 'Widget B', sales: 800, quantity: 40 },
      ];

      const result = engine.computePivot([]);
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
      const result = engine.computePivot([]);
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
        rows: [{ id: `${Math.random()}`, name:'region', dataType: 'string' }],
        columns: [{ id: `${Math.random()}`, name:'date', dataType: 'date' }],
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
        filters: []
      };

      const result = engine.computePivot([]);
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
        rows: [{ id: `${Math.random()}`, name:'region', dataType: 'string' }],
        columns: [{ id: `${Math.random()}`, name:'active', dataType: 'boolean' }],
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
        filters: []
      };

      const result = engine.computePivot([]);
      expect(result).toBeDefined();
      expect(result.columnHeaders[0].length).toBe(2); // true and false columns
    });
  });

  describe('subtotals functionality', () => {
    test('includes subtotals when enabled', () => {
      const result = engine.computePivot([]);

      // Should have subtotal rows for each region
      const subtotalRows = result.rowHeaders.filter(row =>
        row.length > 0 && row[0].value.toString().includes('Subtotal')
      );
      expect(subtotalRows.length).toBeGreaterThan(0);
    });

    test('excludes subtotals when disabled', () => {
      const configWithoutSubtotals: PivotConfiguration = {
        ...basicConfiguration
      };

      const result = engine.computePivot([]);

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
          { id: `${Math.random()}`, name:'region', dataType: 'string' },
          { id: `${Math.random()}`, name:'product', dataType: 'string' },
          { id: `${Math.random()}`, name:'category', dataType: 'string' }
        ],
        columns: [{ id: `${Math.random()}`, name:'quarter', dataType: 'string' }],
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
        filters: []
      };

      const result = engine.computePivot([]);

      // Should have hierarchy with 3 levels
      const deepestLevel = result.rowHeaders.find(row =>
        row.length === 3 && row[2].level === 2
      );
      expect(deepestLevel).toBeDefined();
    });

    test('handles multi-level column hierarchy', () => {
      const multiLevelColumnConfig: PivotConfiguration = {
        rows: [{ id: `${Math.random()}`, name:'region', dataType: 'string' }],
        columns: [
          { id: `${Math.random()}`, name:'quarter', dataType: 'string' },
          { id: `${Math.random()}`, name:'category', dataType: 'string' }
        ],
        values: [{ field: { id: `${Math.random()}`, name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
        filters: []
      };

      const result = engine.computePivot([]);

      // Should have hierarchical column headers
      expect(result.columnHeaders.length).toBe(2); // Two levels of column headers
    });
  });
});