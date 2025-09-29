import { PivotValueField, PivotDataRow } from './types';

/** Available aggregation functions */
export type AggregationFunction = (values: any[], field: string, rows: PivotDataRow[]) => number | string;

/** Core aggregation implementations */
export const aggregationFunctions: Record<PivotValueField['aggregation'], AggregationFunction> = {
  sum: (values: any[]) => {
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    return numericValues.reduce((acc, val) => acc + val, 0);
  },

  count: (values: any[]) => {
    return values.filter(v => v != null && v !== '').length;
  },

  avg: (values: any[]) => {
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (numericValues.length === 0) return 0;
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    return sum / numericValues.length;
  },

  min: (values: any[]) => {
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (numericValues.length === 0) return 0;
    return Math.min(...numericValues);
  },

  max: (values: any[]) => {
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (numericValues.length === 0) return 0;
    return Math.max(...numericValues);
  },

  countDistinct: (values: any[]) => {
    const nonEmptyValues = values.filter(v => v != null && v !== '');
    return new Set(nonEmptyValues).size;
  },
};

/** Apply aggregation to a set of values */
export function applyAggregation(
  values: any[],
  field: string,
  aggregationType: PivotValueField['aggregation'],
  sourceRows: PivotDataRow[] = []
): number | string {
  const aggregationFn = aggregationFunctions[aggregationType];
  if (!aggregationFn) {
    throw new Error(`Unknown aggregation type: ${aggregationType}`);
  }

  try {
    return aggregationFn(values, field, sourceRows);
  } catch (error) {
    console.error(`Error applying aggregation ${aggregationType}:`, error);
    return 0;
  }
}

/** Get appropriate aggregation functions for a data type */
export function getAvailableAggregations(dataType: string): PivotValueField['aggregation'][] {
  switch (dataType) {
    case 'number':
      return ['sum', 'count', 'avg', 'min', 'max', 'countDistinct'];
    case 'string':
      return ['count', 'countDistinct'];
    case 'date':
      return ['count', 'countDistinct', 'min', 'max'];
    case 'boolean':
      return ['count', 'countDistinct'];
    default:
      return ['count'];
  }
}

/** Format aggregated values based on aggregation type and field format */
export function formatAggregatedValue(
  value: number | string,
  aggregationType: PivotValueField['aggregation'],
  format?: string,
  customFormatter?: (value: any) => string
): string {
  if (customFormatter) {
    return customFormatter(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  // Apply default formatting based on aggregation type
  switch (aggregationType) {
    case 'sum':
    case 'avg':
      if (format) {
        return formatNumber(value, format);
      }
      return value % 1 === 0 ? value.toString() : value.toFixed(2);

    case 'count':
    case 'countDistinct':
      return value.toString();

    case 'min':
    case 'max':
      if (format) {
        return formatNumber(value, format);
      }
      return value.toString();

    default:
      return value.toString();
  }
}

/** Number formatting utility */
function formatNumber(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);

    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
      }).format(value / 100);

    case 'decimal':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case 'integer':
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(value);

    default:
      // Try to parse custom format (e.g., "0.00", "#,##0")
      return value.toString();
  }
}

/** Aggregate multiple values across different aggregation types */
export function aggregateMultipleValues(
  data: PivotDataRow[],
  valueFields: PivotValueField[]
): Record<string, number | string> {
  const result: Record<string, number | string> = {};

  for (const valueField of valueFields) {
    const fieldId = valueField.field.id;
    const values = data.map(row => row[fieldId]).filter(v => v != null);

    const aggregatedValue = applyAggregation(
      values,
      fieldId,
      valueField.aggregation,
      data
    );

    const formattedValue = formatAggregatedValue(
      aggregatedValue,
      valueField.aggregation,
      valueField.format,
      valueField.field.formatter
    );

    // Use display name if provided, otherwise use field name
    const displayKey = valueField.displayName || valueField.field.name;
    result[displayKey] = formattedValue;
  }

  return result;
}

/** Calculate percentage of total */
export function calculatePercentageOfTotal(
  value: number,
  total: number,
  format: 'decimal' | 'percentage' = 'percentage'
): string {
  if (total === 0) return format === 'percentage' ? '0%' : '0';

  const percentage = (value / total) * 100;

  if (format === 'percentage') {
    return `${percentage.toFixed(1)}%`;
  } else {
    return (value / total).toFixed(3);
  }
}

/** Calculate running totals */
export function calculateRunningTotal(
  values: number[],
  aggregationType: 'sum' | 'avg' = 'sum'
): number[] {
  const runningTotals: number[] = [];
  let accumulator = 0;

  for (let i = 0; i < values.length; i++) {
    if (aggregationType === 'sum') {
      accumulator += values[i];
      runningTotals.push(accumulator);
    } else if (aggregationType === 'avg') {
      accumulator += values[i];
      runningTotals.push(accumulator / (i + 1));
    }
  }

  return runningTotals;
}

/** Validate that aggregation is applicable to data type */
export function isValidAggregation(
  aggregationType: PivotValueField['aggregation'],
  dataType: string
): boolean {
  const availableAggregations = getAvailableAggregations(dataType);
  return availableAggregations.includes(aggregationType);
}

/** Get default aggregation for a data type */
export function getDefaultAggregation(dataType: string): PivotValueField['aggregation'] {
  switch (dataType) {
    case 'number':
      return 'sum';
    case 'string':
    case 'date':
    case 'boolean':
    default:
      return 'count';
  }
}

/** Custom aggregation function type for advanced use cases */
export type CustomAggregationFunction = {
  name: string;
  label: string;
  calculate: AggregationFunction;
  applicableDataTypes: string[];
  formatter?: (value: any) => string;
};

/** Registry for custom aggregation functions */
export class AggregationRegistry {
  private customAggregations: Map<string, CustomAggregationFunction> = new Map();

  register(aggregation: CustomAggregationFunction): void {
    this.customAggregations.set(aggregation.name, aggregation);
  }

  unregister(name: string): void {
    this.customAggregations.delete(name);
  }

  get(name: string): CustomAggregationFunction | undefined {
    return this.customAggregations.get(name);
  }

  getAll(): CustomAggregationFunction[] {
    return Array.from(this.customAggregations.values());
  }

  getForDataType(dataType: string): CustomAggregationFunction[] {
    return this.getAll().filter(agg =>
      agg.applicableDataTypes.includes(dataType) ||
      agg.applicableDataTypes.includes('*')
    );
  }
}

/** Global registry instance */
export const customAggregationRegistry = new AggregationRegistry();