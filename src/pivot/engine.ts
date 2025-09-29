import { Matrix } from '../matrix';
import {
  PivotDataSet,
  PivotDataRow,
  PivotConfiguration,
  PivotStructure,
  PivotCell,
  PivotHeader,
  PivotFilter,
  GroupedData,
  AggregatedData,
  PivotValueField,
  PivotField,
} from './types';
import {
  applyAggregation,
  formatAggregatedValue,
  aggregateMultipleValues,
} from './aggregations';

/** Main pivot engine for client-side computation */
export class PivotEngine {
  private data: PivotDataSet;
  private config: PivotConfiguration;
  private filteredData: PivotDataSet | null = null;

  constructor(data: PivotDataSet, config: PivotConfiguration) {
    this.data = data;
    this.config = config;
  }

  /** Update configuration and invalidate cached results */
  updateConfiguration(config: PivotConfiguration): void {
    this.config = config;
    this.filteredData = null; // Invalidate cache
  }

  /** Update data and invalidate cached results */
  updateData(data: PivotDataSet): void {
    this.data = data;
    this.filteredData = null; // Invalidate cache
  }

  /** Main computation method */
  computePivot(expandedPaths: string[][] = []): PivotStructure {
    const startTime = performance.now();

    try {
      // Step 1: Apply filters
      const filteredData = this.applyFilters();

      // Step 2: Group data by row and column dimensions
      const groupedData = this.groupData(filteredData);

      // Step 3: Aggregate values for each group
      const aggregatedData = this.aggregateData(groupedData);

      // Step 4: Build the matrix structure
      const { matrix, rowHeaders, columnHeaders } = this.buildMatrix(
        aggregatedData,
        expandedPaths
      );

      // Step 5: Calculate dimensions
      const rowCount = matrix.length;
      const columnCount = matrix[0]?.length || 0;

      const computationTime = performance.now() - startTime;

      return {
        matrix,
        rowHeaders,
        columnHeaders,
        rowCount,
        columnCount,
        totalRows: this.calculateTotalRows(aggregatedData, expandedPaths),
        totalColumns: this.calculateTotalColumns(aggregatedData, expandedPaths),
        summary: {
          totalDataRows: filteredData.length,
          totalDataColumns: Object.keys(filteredData[0] || {}).length,
          computationTime,
        },
      };
    } catch (error) {
      console.error('Error computing pivot table:', error);
      throw new Error(`Pivot computation failed: ${error.message}`);
    }
  }

  /** Apply all configured filters to the data */
  private applyFilters(): PivotDataSet {
    if (this.filteredData) {
      return this.filteredData;
    }

    let filtered = [...this.data];

    for (const filter of this.config.filters) {
      if (filter.enabled === false) continue;

      filtered = filtered.filter(row => this.evaluateFilter(row, filter));
    }

    this.filteredData = filtered;
    return filtered;
  }

  /** Evaluate a single filter against a data row */
  private evaluateFilter(row: PivotDataRow, filter: PivotFilter): boolean {
    const fieldValue = row[filter.field.id];
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filterValue;

      case 'notEquals':
        return fieldValue !== filterValue;

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'greaterThan':
        return Number(fieldValue) > Number(filterValue);

      case 'lessThan':
        return Number(fieldValue) < Number(filterValue);

      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(filterValue);

      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(filterValue);

      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);

      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);

      case 'between':
        if (filterValue && typeof filterValue === 'object' && 'min' in filterValue && 'max' in filterValue) {
          const numValue = Number(fieldValue);
          return numValue >= Number(filterValue.min) && numValue <= Number(filterValue.max);
        }
        return false;

      case 'isEmpty':
        return fieldValue == null || fieldValue === '';

      case 'isNotEmpty':
        return fieldValue != null && fieldValue !== '';

      default:
        console.warn(`Unknown filter operator: ${filter.operator}`);
        return true;
    }
  }

  /** Group data by row and column dimensions */
  private groupData(data: PivotDataSet): Map<string, PivotDataRow[]> {
    const groups = new Map<string, PivotDataRow[]>();

    for (const row of data) {
      // Create group key from row and column field values
      const rowKeys = this.config.rows.map(field => String(row[field.id] || ''));
      const columnKeys = this.config.columns.map(field => String(row[field.id] || ''));
      const groupKey = [...rowKeys, ...columnKeys].join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    }

    return groups;
  }

  /** Aggregate values for each group */
  private aggregateData(groupedData: Map<string, PivotDataRow[]>): Map<string, any> {
    const aggregatedData = new Map<string, any>();

    for (const [groupKey, rows] of groupedData) {
      const aggregatedValues = aggregateMultipleValues(rows, this.config.values);

      // Parse group key back to get row and column values
      const keyParts = groupKey.split('|');
      const rowValues = keyParts.slice(0, this.config.rows.length);
      const columnValues = keyParts.slice(this.config.rows.length);

      aggregatedData.set(groupKey, {
        rowValues,
        columnValues,
        aggregatedValues,
        rowCount: rows.length,
        originalRows: rows,
      });
    }

    return aggregatedData;
  }

  /** Build the matrix structure from aggregated data */
  private buildMatrix(
    aggregatedData: Map<string, any>,
    expandedPaths: string[][]
  ): {
    matrix: Matrix<PivotCell>;
    rowHeaders: PivotHeader[][];
    columnHeaders: PivotHeader[][];
  } {
    // Get unique row and column combinations
    const rowCombinations = this.getUniqueCombinations(aggregatedData, 'row');
    const columnCombinations = this.getUniqueCombinations(aggregatedData, 'column');

    // Build headers
    const rowHeaders = this.buildRowHeaders(rowCombinations, expandedPaths);
    const columnHeaders = this.buildColumnHeaders(columnCombinations, expandedPaths);

    // Calculate matrix dimensions
    const matrixRows = rowCombinations.length + (this.config.showGrandTotals ? 1 : 0);
    const matrixCols =
      (columnCombinations.length * this.config.values.length) +
      (this.config.showGrandTotals ? this.config.values.length : 0);

    // Initialize matrix
    const matrix: Matrix<PivotCell> = Array(matrixRows)
      .fill(null)
      .map(() => Array(matrixCols).fill(this.createEmptyCell()));

    // Fill matrix with data
    this.fillMatrix(matrix, aggregatedData, rowCombinations, columnCombinations);

    // Add totals if configured
    if (this.config.showGrandTotals) {
      this.addGrandTotals(matrix, aggregatedData, rowCombinations, columnCombinations);
    }

    return { matrix, rowHeaders, columnHeaders };
  }

  /** Get unique combinations for rows or columns */
  private getUniqueCombinations(
    aggregatedData: Map<string, any>,
    type: 'row' | 'column'
  ): string[][] {
    const combinations = new Set<string>();

    for (const [, data] of aggregatedData) {
      const values = type === 'row' ? data.rowValues : data.columnValues;
      combinations.add(values.join('|'));
    }

    return Array.from(combinations).map(combo => combo.split('|'));
  }

  /** Build row headers structure */
  private buildRowHeaders(
    rowCombinations: string[][],
    expandedPaths: string[][]
  ): PivotHeader[][] {
    if (this.config.rows.length === 0) {
      return [];
    }

    const headerLevels: PivotHeader[][] = Array(this.config.rows.length)
      .fill(null)
      .map(() => []);

    for (let level = 0; level < this.config.rows.length; level++) {
      const field = this.config.rows[level];
      const uniqueValues = new Set<string>();

      for (const combination of rowCombinations) {
        uniqueValues.add(combination[level]);
      }

      for (const value of uniqueValues) {
        const path = [value]; // Simplified path for now
        const isExpanded = this.isPathExpanded(path, expandedPaths);

        headerLevels[level].push({
          label: value || '(empty)',
          level,
          span: 1, // Calculate proper span based on hierarchy
          path,
          field,
          isExpandable: level < this.config.rows.length - 1,
          isExpanded,
        });
      }
    }

    return headerLevels;
  }

  /** Build column headers structure */
  private buildColumnHeaders(
    columnCombinations: string[][],
    expandedPaths: string[][]
  ): PivotHeader[][] {
    const headerLevels: PivotHeader[][] = [];

    // Add column dimension headers
    for (let level = 0; level < this.config.columns.length; level++) {
      const field = this.config.columns[level];
      const levelHeaders: PivotHeader[] = [];

      const uniqueValues = new Set<string>();
      for (const combination of columnCombinations) {
        uniqueValues.add(combination[level]);
      }

      for (const value of uniqueValues) {
        const path = [value]; // Simplified path for now
        const isExpanded = this.isPathExpanded(path, expandedPaths);

        levelHeaders.push({
          label: value || '(empty)',
          level,
          span: this.config.values.length,
          path,
          field,
          isExpandable: level < this.config.columns.length - 1,
          isExpanded,
        });
      }

      headerLevels.push(levelHeaders);
    }

    // Add value field headers
    if (this.config.values.length > 0) {
      const valueHeaders: PivotHeader[] = [];

      for (const combination of columnCombinations) {
        for (const valueField of this.config.values) {
          valueHeaders.push({
            label: valueField.displayName || valueField.field.name,
            level: this.config.columns.length,
            span: 1,
            path: [...combination, valueField.field.id],
            field: valueField.field,
            isExpandable: false,
            isExpanded: false,
          });
        }
      }

      headerLevels.push(valueHeaders);
    }

    return headerLevels;
  }

  /** Fill matrix with aggregated data */
  private fillMatrix(
    matrix: Matrix<PivotCell>,
    aggregatedData: Map<string, any>,
    rowCombinations: string[][],
    columnCombinations: string[][]
  ): void {
    for (let rowIndex = 0; rowIndex < rowCombinations.length; rowIndex++) {
      const rowCombination = rowCombinations[rowIndex];

      for (let colCombIndex = 0; colCombIndex < columnCombinations.length; colCombIndex++) {
        const columnCombination = columnCombinations[colCombIndex];

        // Find corresponding aggregated data
        const groupKey = [...rowCombination, ...columnCombination].join('|');
        const data = aggregatedData.get(groupKey);

        if (data) {
          // Fill cells for each value field
          for (let valueIndex = 0; valueIndex < this.config.values.length; valueIndex++) {
            const valueField = this.config.values[valueIndex];
            const displayName = valueField.displayName || valueField.field.name;
            const value = data.aggregatedValues[displayName];

            const colIndex = colCombIndex * this.config.values.length + valueIndex;

            matrix[rowIndex][colIndex] = {
              value: value,
              formattedValue: String(value),
              type: 'data',
              path: [...rowCombination, ...columnCombination, valueField.field.id],
              originalRows: data.originalRows?.map((_: any, idx: number) => idx) || [],
            };
          }
        }
      }
    }
  }

  /** Add grand totals to the matrix */
  private addGrandTotals(
    matrix: Matrix<PivotCell>,
    aggregatedData: Map<string, any>,
    rowCombinations: string[][],
    columnCombinations: string[][]
  ): void {
    // Implementation for grand totals
    // This would calculate totals across all data and add them to the last row/column
    console.log('Grand totals calculation would be implemented here');
  }

  /** Create an empty cell */
  private createEmptyCell(): PivotCell {
    return {
      value: null,
      formattedValue: '',
      type: 'empty',
    };
  }

  /** Check if a path is expanded */
  private isPathExpanded(path: string[], expandedPaths: string[][]): boolean {
    return expandedPaths.some(expandedPath =>
      path.length === expandedPath.length &&
      path.every((segment, index) => segment === expandedPath[index])
    );
  }

  /** Calculate total possible rows with all expansions */
  private calculateTotalRows(aggregatedData: Map<string, any>, expandedPaths: string[][]): number {
    // For now, return current row count
    // In a full implementation, this would calculate the total possible rows
    // if all groups were expanded
    const rowCombinations = this.getUniqueCombinations(aggregatedData, 'row');
    return rowCombinations.length;
  }

  /** Calculate total possible columns with all expansions */
  private calculateTotalColumns(aggregatedData: Map<string, any>, expandedPaths: string[][]): number {
    // For now, return current column count
    const columnCombinations = this.getUniqueCombinations(aggregatedData, 'column');
    return columnCombinations.length * this.config.values.length;
  }

  /** Expand a specific path and recompute */
  expandPath(path: string[]): PivotStructure {
    // Add path to expanded paths and recompute
    const currentExpandedPaths: string[][] = []; // Get current expanded paths from state
    const newExpandedPaths = [...currentExpandedPaths, path];
    return this.computePivot(newExpandedPaths);
  }

  /** Collapse a specific path and recompute */
  collapsePath(path: string[]): PivotStructure {
    // Remove path from expanded paths and recompute
    const currentExpandedPaths: string[][] = []; // Get current expanded paths from state
    const newExpandedPaths = currentExpandedPaths.filter(expandedPath =>
      !(path.length === expandedPath.length &&
        path.every((segment, index) => segment === expandedPath[index]))
    );
    return this.computePivot(newExpandedPaths);
  }

  /** Get available field values for filtering */
  getFieldValues(fieldId: string): any[] {
    const values = new Set<any>();
    for (const row of this.data) {
      if (row[fieldId] != null) {
        values.add(row[fieldId]);
      }
    }
    return Array.from(values).sort();
  }

  /** Validate configuration */
  validateConfiguration(config: PivotConfiguration): string[] {
    const errors: string[] = [];

    // Check that we have at least one value field
    if (config.values.length === 0) {
      errors.push('At least one value field is required');
    }

    // Check that we have at least one dimension (row or column)
    if (config.rows.length === 0 && config.columns.length === 0) {
      errors.push('At least one row or column field is required');
    }

    // Validate that all referenced fields exist in the data
    const dataFields = new Set(Object.keys(this.data[0] || {}));

    const allFields = [
      ...config.rows,
      ...config.columns,
      ...config.values.map(v => v.field),
      ...config.filters.map(f => f.field),
    ];

    for (const field of allFields) {
      if (!dataFields.has(field.id)) {
        errors.push(`Field '${field.id}' not found in data`);
      }
    }

    return errors;
  }
}