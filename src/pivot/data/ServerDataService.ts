/**
 * Server Data Service
 * Simulates server-side data access patterns and provides data binding for front-end components
 */

import { PivotDataSet, PivotField, PivotConfiguration } from '../types';
import { ServerDataGenerator, DataGenerationConfig, DATASET_PRESETS } from './ServerDataGenerator';

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  recordCount: number;
  lastUpdated: Date;
  domains: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface DataQueryOptions {
  /** Limit number of records returned */
  limit?: number;
  /** Skip number of records (pagination) */
  offset?: number;
  /** Filter conditions */
  filters?: Array<{
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
    value: any;
  }>;
  /** Sort configuration */
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DataQueryResult {
  data: PivotDataSet;
  totalCount: number;
  hasMore: boolean;
  executionTime: number;
  fromCache: boolean;
}

/**
 * In-memory cache for dataset storage and retrieval
 */
class DataCache {
  private cache: Map<string, { data: PivotDataSet; metadata: DatasetInfo; timestamp: number }> = new Map();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  set(datasetId: string, data: PivotDataSet, metadata: DatasetInfo): void {
    this.cache.set(datasetId, {
      data: [...data], // Deep copy to prevent mutations
      metadata: { ...metadata },
      timestamp: Date.now()
    });
  }

  get(datasetId: string): { data: PivotDataSet; metadata: DatasetInfo } | null {
    const cached = this.cache.get(datasetId);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(datasetId);
      return null;
    }

    return {
      data: [...cached.data], // Return copy to prevent mutations
      metadata: { ...cached.metadata }
    };
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; datasets: string[] } {
    return {
      size: this.cache.size,
      datasets: Array.from(this.cache.keys())
    };
  }
}

/**
 * Main server data service that provides realistic server-like data access
 */
export class ServerDataService {
  private cache = new DataCache();
  private generator: ServerDataGenerator;
  private simulateLatency: boolean;

  constructor(simulateLatency = true) {
    this.simulateLatency = simulateLatency;
    this.generator = new ServerDataGenerator({ recordCount: 0, dateRange: { start: new Date(), end: new Date() }, domains: [] });
  }

  /**
   * Initialize predefined datasets (simulates server data loading)
   */
  async initializeDatasets(): Promise<void> {
    const startTime = Date.now();

    // Generate all preset datasets
    for (const [presetName, config] of Object.entries(DATASET_PRESETS)) {
      const generator = new ServerDataGenerator(config);
      const data = generator.generateDataset(config);

      const metadata: DatasetInfo = {
        id: presetName,
        name: this.formatDatasetName(presetName),
        description: this.generateDatasetDescription(presetName, config),
        recordCount: data.length,
        lastUpdated: new Date(),
        domains: config.domains,
        dateRange: config.dateRange
      };

      this.cache.set(presetName, data, metadata);
    }

    // Add some artificial delay to simulate server processing
    if (this.simulateLatency) {
      const elapsed = Date.now() - startTime;
      const minLoadTime = 500; // Minimum 500ms to feel realistic
      if (elapsed < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
      }
    }

    console.log('📊 Server datasets initialized:', this.cache.getStats());
  }

  /**
   * Get list of available datasets (simulates server dataset discovery)
   */
  async getAvailableDatasets(): Promise<DatasetInfo[]> {
    if (this.simulateLatency) {
      await this.simulateDelay(100, 300);
    }

    const datasets: DatasetInfo[] = [];
    for (const [datasetId] of this.cache.getStats().datasets.entries()) {
      const cached = this.cache.get(this.cache.getStats().datasets[datasetId]);
      if (cached) {
        datasets.push(cached.metadata);
      }
    }

    return datasets;
  }

  /**
   * Get available fields for a dataset (simulates server field metadata discovery)
   */
  async getDatasetFields(datasetId: string): Promise<PivotField[]> {
    if (this.simulateLatency) {
      await this.simulateDelay(50, 200);
    }

    const cached = this.cache.get(datasetId);
    if (!cached) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    // Generate field metadata based on the dataset's domains
    return this.generator.generateFieldMetadata(cached.metadata.domains);
  }

  /**
   * Query dataset with filtering, sorting, and pagination (simulates server data processing)
   */
  async queryDataset(datasetId: string, options: DataQueryOptions = {}): Promise<DataQueryResult> {
    const startTime = Date.now();

    if (this.simulateLatency) {
      // Simulate processing time based on complexity
      const complexity = this.calculateQueryComplexity(options);
      await this.simulateDelay(complexity * 10, complexity * 50);
    }

    const cached = this.cache.get(datasetId);
    if (!cached) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    let processedData = [...cached.data];

    // Apply filters
    if (options.filters) {
      processedData = this.applyFilters(processedData, options.filters);
    }

    // Apply date range filter
    if (options.dateRange) {
      processedData = this.applyDateRangeFilter(processedData, options.dateRange);
    }

    // Apply sorting
    if (options.sort) {
      processedData = this.applySorting(processedData, options.sort);
    }

    const totalCount = processedData.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || totalCount;
    const paginatedData = processedData.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    const executionTime = Date.now() - startTime;

    return {
      data: paginatedData,
      totalCount,
      hasMore,
      executionTime,
      fromCache: true
    };
  }

  /**
   * Get aggregated data for pivot computation (simulates server-side aggregation)
   */
  async getAggregatedData(datasetId: string, configuration: PivotConfiguration): Promise<DataQueryResult> {
    const startTime = Date.now();

    if (this.simulateLatency) {
      // Simulate longer processing time for aggregations
      await this.simulateDelay(200, 800);
    }

    // For now, return the full dataset - in a real server this would be pre-aggregated
    const result = await this.queryDataset(datasetId, {});

    return {
      ...result,
      executionTime: Date.now() - startTime,
      fromCache: false // Aggregations are typically not cached
    };
  }

  /**
   * Generate custom dataset (simulates server data generation)
   */
  async generateCustomDataset(config: DataGenerationConfig, datasetId?: string): Promise<string> {
    const startTime = Date.now();

    if (this.simulateLatency) {
      // Simulate generation time based on record count
      const baseDelay = 200;
      const recordDelay = Math.min(config.recordCount / 100, 2000); // Max 2 seconds
      await new Promise(resolve => setTimeout(resolve, baseDelay + recordDelay));
    }

    const generator = new ServerDataGenerator(config);
    const data = generator.generateDataset(config);

    const id = datasetId || `custom_${Date.now()}`;
    const metadata: DatasetInfo = {
      id,
      name: `Custom Dataset (${config.recordCount} records)`,
      description: `Generated dataset with ${config.domains.join(', ')} data`,
      recordCount: data.length,
      lastUpdated: new Date(),
      domains: config.domains,
      dateRange: config.dateRange
    };

    this.cache.set(id, data, metadata);

    const generationTime = Date.now() - startTime;
    console.log(`📈 Generated custom dataset "${id}" with ${data.length} records in ${generationTime}ms`);

    return id;
  }

  /**
   * Get field value suggestions (simulates server field value discovery)
   */
  async getFieldValues(datasetId: string, fieldName: string, limit = 100): Promise<any[]> {
    if (this.simulateLatency) {
      await this.simulateDelay(50, 150);
    }

    const cached = this.cache.get(datasetId);
    if (!cached) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const values = new Set<any>();
    for (const record of cached.data) {
      if (record[fieldName] !== undefined && record[fieldName] !== null) {
        values.add(record[fieldName]);
        if (values.size >= limit) break;
      }
    }

    return Array.from(values).sort();
  }

  /**
   * Get dataset statistics (simulates server analytics)
   */
  async getDatasetStatistics(datasetId: string): Promise<{
    recordCount: number;
    fieldCount: number;
    dateRange: { start: Date; end: Date };
    numericSummary: { [field: string]: { min: number; max: number; avg: number; sum: number } };
    categoricalSummary: { [field: string]: { uniqueValues: number; topValues: Array<{ value: any; count: number }> } };
  }> {
    if (this.simulateLatency) {
      await this.simulateDelay(100, 400);
    }

    const cached = this.cache.get(datasetId);
    if (!cached) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const data = cached.data;
    const fields = this.generator.generateFieldMetadata(cached.metadata.domains);

    // Calculate numeric field statistics
    const numericSummary: { [field: string]: { min: number; max: number; avg: number; sum: number } } = {};
    const categoricalSummary: { [field: string]: { uniqueValues: number; topValues: Array<{ value: any; count: number }> } } = {};

    for (const field of fields) {
      if (field.dataType === 'number') {
        const values = data.map(record => record[field.name]).filter(v => typeof v === 'number');
        if (values.length > 0) {
          numericSummary[field.name] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            sum: values.reduce((a, b) => a + b, 0)
          };
        }
      } else if (field.dataType === 'string') {
        const valueCounts = new Map<any, number>();
        for (const record of data) {
          const value = record[field.name];
          if (value !== undefined && value !== null) {
            valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
          }
        }

        const topValues = Array.from(valueCounts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        categoricalSummary[field.name] = {
          uniqueValues: valueCounts.size,
          topValues
        };
      }
    }

    // Calculate date range
    const dates = data.map(record => new Date(record.date)).filter(d => !isNaN(d.getTime()));
    const dateRange = {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    };

    return {
      recordCount: data.length,
      fieldCount: fields.length,
      dateRange,
      numericSummary,
      categoricalSummary
    };
  }

  /**
   * Clear all cached data (simulates server cache invalidation)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Server data cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; datasets: string[] } {
    return this.cache.getStats();
  }

  // Private helper methods

  private formatDatasetName(presetName: string): string {
    return presetName.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private generateDatasetDescription(presetName: string, config: DataGenerationConfig): string {
    const domainText = config.domains.join(', ');
    const yearSpan = config.dateRange.end.getFullYear() - config.dateRange.start.getFullYear() + 1;
    return `${config.recordCount.toLocaleString()} records of ${domainText} data spanning ${yearSpan} year${yearSpan > 1 ? 's' : ''}`;
  }

  private calculateQueryComplexity(options: DataQueryOptions): number {
    let complexity = 1;

    if (options.filters) complexity += options.filters.length * 2;
    if (options.sort) complexity += options.sort.length;
    if (options.dateRange) complexity += 1;

    return Math.min(complexity, 10); // Cap complexity at 10
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private applyFilters(data: PivotDataSet, filters: DataQueryOptions['filters']): PivotDataSet {
    if (!filters) return data;

    return data.filter(record => {
      return filters.every(filter => {
        const recordValue = record[filter.field];

        switch (filter.operator) {
          case 'equals':
            return recordValue === filter.value;
          case 'notEquals':
            return recordValue !== filter.value;
          case 'contains':
            return String(recordValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greaterThan':
            return Number(recordValue) > Number(filter.value);
          case 'lessThan':
            return Number(recordValue) < Number(filter.value);
          case 'between':
            return Number(recordValue) >= Number(filter.value[0]) && Number(recordValue) <= Number(filter.value[1]);
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(recordValue);
          default:
            return true;
        }
      });
    });
  }

  private applyDateRangeFilter(data: PivotDataSet, dateRange: { start: Date; end: Date }): PivotDataSet {
    return data.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }

  private applySorting(data: PivotDataSet, sorts: DataQueryOptions['sort']): PivotDataSet {
    if (!sorts) return data;

    return [...data].sort((a, b) => {
      for (const sort of sorts) {
        const aValue = a[sort.field];
        const bValue = b[sort.field];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
}

// Singleton instance for global use
export const serverDataService = new ServerDataService();