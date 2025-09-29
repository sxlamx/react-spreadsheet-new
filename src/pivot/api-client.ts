import {
  PivotRequest,
  PivotResponse,
  PivotDrillRequest,
  PivotField,
  PivotConfiguration,
  ExportConfig,
} from './types';

/** Configuration for the API client */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
}

/** Error types for API operations */
export class PivotApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PivotApiError';
  }
}

/** Main API client for server-side pivot operations */
export class PivotApiClient {
  private config: ApiClientConfig;
  private abortController: AbortController | null = null;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /** Compute pivot table on server */
  async computePivot(request: PivotRequest): Promise<PivotResponse> {
    this.cancelPreviousRequest();
    this.abortController = new AbortController();

    const url = `${this.config.baseUrl}/pivot/compute`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to compute pivot table',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new PivotApiError('Request was cancelled');
      }
      throw error;
    }
  }

  /** Perform drill-down operation */
  async drillDown(request: PivotDrillRequest): Promise<PivotResponse> {
    const url = `${this.config.baseUrl}/pivot/drill`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to perform drill-down',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Get available fields for a dataset */
  async getAvailableFields(dataset: string): Promise<PivotField[]> {
    const url = `${this.config.baseUrl}/datasets/${encodeURIComponent(dataset)}/fields`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to get available fields',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Get available datasets */
  async getDatasets(): Promise<Array<{ id: string; name: string; description?: string; rowCount?: number }>> {
    const url = `${this.config.baseUrl}/datasets`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to get datasets',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Get field values for filtering */
  async getFieldValues(dataset: string, fieldId: string, limit?: number): Promise<any[]> {
    const url = `${this.config.baseUrl}/datasets/${encodeURIComponent(dataset)}/fields/${encodeURIComponent(fieldId)}/values`;
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    try {
      const response = await this.makeRequest(`${url}?${params}`, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to get field values',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Export pivot table in specified format */
  async exportPivot(
    request: PivotRequest,
    exportConfig: ExportConfig
  ): Promise<Blob> {
    const url = `${this.config.baseUrl}/pivot/export/${exportConfig.format}`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ ...request, exportConfig }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PivotApiError(
          errorText || 'Failed to export pivot table',
          response.status
        );
      }

      return await response.blob();
    } catch (error) {
      throw error;
    }
  }

  /** Save pivot configuration */
  async savePivotConfiguration(
    name: string,
    configuration: PivotConfiguration,
    dataset: string
  ): Promise<{ id: string }> {
    const url = `${this.config.baseUrl}/pivot/configurations`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ name, configuration, dataset }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to save configuration',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Load pivot configuration */
  async loadPivotConfiguration(id: string): Promise<{
    name: string;
    configuration: PivotConfiguration;
    dataset: string;
  }> {
    const url = `${this.config.baseUrl}/pivot/configurations/${encodeURIComponent(id)}`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to load configuration',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Get saved pivot configurations */
  async getPivotConfigurations(): Promise<Array<{
    id: string;
    name: string;
    dataset: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    const url = `${this.config.baseUrl}/pivot/configurations`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new PivotApiError(
          result.message || 'Failed to get configurations',
          response.status,
          result.code,
          result.details
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /** Cancel any ongoing request */
  cancelRequest(): void {
    this.cancelPreviousRequest();
  }

  /** Get API health status */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; version?: string; uptime?: number }> {
    const url = `${this.config.baseUrl}/health`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.config.headers,
      });

      const result = await response.json();

      if (!response.ok) {
        return { status: 'unhealthy' };
      }

      return result;
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  /** Internal method to make HTTP requests with retry logic */
  private async makeRequest(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Merge abort signals if one is already provided
      const signal = options.signal
        ? this.combineAbortSignals([options.signal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        ...options,
        signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts! && this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay! * attempt);
        return this.makeRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /** Check if error should trigger a retry */
  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx responses
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      (error.status >= 500 && error.status < 600)
    );
  }

  /** Utility to combine multiple abort signals */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }

  /** Cancel previous request if any */
  private cancelPreviousRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** Utility delay function */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Factory function to create API client with default configuration */
export function createPivotApiClient(baseUrl: string, config?: Partial<ApiClientConfig>): PivotApiClient {
  return new PivotApiClient({
    baseUrl,
    ...config,
  });
}

/** Mock API client for development and testing */
export class MockPivotApiClient extends PivotApiClient {
  private mockData: Map<string, any> = new Map();
  private mockDelay: number;

  constructor(config: ApiClientConfig, mockDelay = 1000) {
    super(config);
    this.mockDelay = mockDelay;
  }

  setMockData(key: string, data: any): void {
    this.mockData.set(key, data);
  }

  async computePivot(request: PivotRequest): Promise<PivotResponse> {
    await this.delay(this.mockDelay);

    // Return mock response
    return {
      structure: {
        matrix: [],
        rowHeaders: [],
        columnHeaders: [],
        rowCount: 0,
        columnCount: 0,
        totalRows: 0,
        totalColumns: 0,
      },
      metadata: {
        totalDataRows: 100,
        computationTime: this.mockDelay,
        cacheKey: 'mock-cache-key',
        timestamp: Date.now(),
      },
    };
  }

  async getAvailableFields(dataset: string): Promise<PivotField[]> {
    await this.delay(200);

    return [
      { id: 'category', name: 'Category', dataType: 'string' },
      { id: 'sales', name: 'Sales', dataType: 'number' },
      { id: 'date', name: 'Date', dataType: 'date' },
      { id: 'region', name: 'Region', dataType: 'string' },
    ];
  }

  async getDatasets(): Promise<Array<{ id: string; name: string; description?: string; rowCount?: number }>> {
    await this.delay(200);

    return [
      { id: 'sales-data', name: 'Sales Data', description: 'Monthly sales data', rowCount: 1000 },
      { id: 'customer-data', name: 'Customer Data', description: 'Customer information', rowCount: 500 },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}