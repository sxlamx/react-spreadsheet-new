/**
 * API Client for FastAPI Pivot Service
 * Provides type-safe methods for interacting with the DuckDB-powered backend
 */

import React from 'react';
import { PivotDataSet, PivotField, PivotConfiguration } from '../types';
import { getSettingsManager, SpreadsheetSettings } from '../../config/settings';

export interface DatasetInfo {
  id: string;
  name: string;
  description?: string;
  rowCount?: number;
  path: string;
}

export interface PivotCell {
  value: any;
  formattedValue: string;
  type: string;
  level?: number;
  isExpandable: boolean;
  isExpanded: boolean;
  path: string[];
  originalRows: number[];
}

export interface PivotHeader {
  label: string;
  level: number;
  span: number;
  path: string[];
  field?: PivotField;
  isExpandable: boolean;
  isExpanded: boolean;
}

export interface PivotStructure {
  matrix: PivotCell[][];
  rowHeaders: PivotHeader[][];
  columnHeaders: PivotHeader[][];
  rowCount: number;
  columnCount: number;
  totalRows: number;
  totalColumns: number;
}

export interface PivotResponse {
  structure: PivotStructure;
  metadata: {
    totalDataRows: number;
    computationTime: number;
    cacheKey: string;
    timestamp: number;
  };
  hasMore: boolean;
  error?: any;
}

export interface PivotRequest {
  dataset: string;
  configuration: PivotConfiguration;
  page?: { offset: number; limit: number };
  expandedPaths: string[][];
  cacheKey?: string;
}

export interface PivotDrillRequest {
  cacheKey: string;
  path: string[];
  action: 'expand' | 'collapse';
}

export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  includeHeaders: boolean;
  includeSubtotals: boolean;
  includeGrandTotals: boolean;
  filename?: string;
}

export class PivotApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public detail?: any
  ) {
    super(message);
    this.name = 'PivotApiError';
  }
}

export class PivotApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private settings: SpreadsheetSettings;

  constructor(baseUrl?: string, headers: Record<string, string> = {}) {
    this.settings = getSettingsManager().getSettings();
    this.baseUrl = (baseUrl || this.settings.api.baseUrl).replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Subscribe to settings changes
    getSettingsManager().subscribe((newSettings) => {
      this.settings = newSettings;
      if (!baseUrl) {
        this.baseUrl = newSettings.api.baseUrl.replace(/\/$/, '');
      }
    });
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add authentication header if available
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };

    if (this.authToken && this.settings.auth.enabled) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.settings.api.timeout)
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && this.settings.auth.enabled && this.refreshToken) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.authToken}`;
          const retryResponse = await fetch(url, { ...config, headers });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PivotApiError(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof PivotApiError) {
        throw error;
      }

      // Handle network errors, parsing errors, etc.
      throw new PivotApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        error
      );
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; version: string; uptime: number }> {
    return this.request('/health');
  }

  /**
   * Get list of available datasets
   */
  async getDatasets(): Promise<DatasetInfo[]> {
    return this.request('/datasets');
  }

  /**
   * Get available fields for a dataset
   */
  async getDatasetFields(dataset: string): Promise<PivotField[]> {
    return this.request(`/datasets/${encodeURIComponent(dataset)}/fields`);
  }

  /**
   * Get unique values for a field (for filtering)
   */
  async getFieldValues(
    dataset: string,
    fieldId: string,
    limit: number = 100
  ): Promise<any[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.request(
      `/datasets/${encodeURIComponent(dataset)}/fields/${encodeURIComponent(fieldId)}/values?${params}`
    );
  }

  /**
   * Compute pivot table
   */
  async computePivot(request: PivotRequest): Promise<PivotResponse> {
    return this.request('/pivot/compute', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Perform drill-down operation
   */
  async drillDown(request: PivotDrillRequest): Promise<PivotResponse> {
    return this.request('/pivot/drill', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Export pivot table in specified format - returns blob for download
   */
  async exportPivot(
    format: string,
    request: PivotRequest,
    exportConfig: ExportConfig
  ): Promise<Blob> {
    const url = `${this.baseUrl}/pivot/export/${encodeURIComponent(format)}`;

    // Add authentication header if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders
    };

    if (this.authToken && this.settings.auth.enabled) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // FastAPI expects the body to match the endpoint parameters directly
    // The endpoint signature is: export_pivot(format: str, request: PivotRequest, export_config: ExportConfig)
    // So we send both objects at the top level
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...request,
        export_config: exportConfig
      }),
      signal: AbortSignal.timeout(this.settings.api.timeout)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PivotApiError(
        errorData.detail || `Export failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.blob();
  }

  /**
   * Batch operations for multiple requests
   */
  async batchRequest<T>(
    requests: Array<{ endpoint: string; options?: RequestInit }>
  ): Promise<Array<T | PivotApiError>> {
    const promises = requests.map(async ({ endpoint, options }) => {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        return error as PivotApiError;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Set authentication tokens
   */
  setAuthToken(accessToken: string, refreshToken?: string): void {
    this.authToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    // Store tokens securely (placeholder for production implementation)
    if (typeof window !== 'undefined') {
      // In production, use secure storage like httpOnly cookies
      sessionStorage.setItem('pivot_access_token', accessToken);
      if (refreshToken) {
        sessionStorage.setItem('pivot_refresh_token', refreshToken);
      }
    }
  }

  /**
   * Clear authentication tokens
   */
  clearAuthToken(): void {
    this.authToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pivot_access_token');
      sessionStorage.removeItem('pivot_refresh_token');
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.authToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return Boolean(this.authToken && this.settings.auth.enabled);
  }

  /**
   * Refresh authentication token (placeholder for JWT refresh)
   */
  private async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken || !this.settings.auth.enabled) {
      return false;
    }

    try {
      // TODO: Implement actual token refresh logic
      // This would typically call a refresh endpoint on the backend
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      if (response.ok) {
        const { accessToken, refreshToken } = await response.json();
        this.setAuthToken(accessToken, refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // If refresh fails, clear tokens
    this.clearAuthToken();
    return false;
  }

  /**
   * Initialize authentication from stored tokens (call on app startup)
   */
  initializeAuth(): void {
    if (typeof window !== 'undefined' && this.settings.auth.enabled) {
      const accessToken = sessionStorage.getItem('pivot_access_token');
      const refreshToken = sessionStorage.getItem('pivot_refresh_token');

      if (accessToken) {
        this.authToken = accessToken;
        if (refreshToken) {
          this.refreshToken = refreshToken;
        }
      }
    }
  }

  /**
   * Authenticate with Google ID token (placeholder)
   */
  async authenticateWithGoogle(idToken: string): Promise<boolean> {
    if (!this.settings.auth.enabled || this.settings.auth.provider !== 'google') {
      return false;
    }

    try {
      // TODO: Implement actual Google ID token verification
      // This would send the Google ID token to the backend for verification
      const response = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          clientId: this.settings.auth.clientId
        })
      });

      if (response.ok) {
        const { accessToken, refreshToken } = await response.json();
        this.setAuthToken(accessToken, refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Google authentication failed:', error);
    }

    return false;
  }

  /**
   * Sign out and clear tokens
   */
  async signOut(): Promise<void> {
    if (this.authToken && this.settings.auth.enabled) {
      try {
        // Notify backend of logout (optional)
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    this.clearAuthToken();
  }

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test connection to the API service
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Default API client instance
 */
export const pivotApiClient = new PivotApiClient();

/**
 * Create a new API client with custom configuration
 */
export function createPivotApiClient(
  baseUrl?: string,
  headers?: Record<string, string>
): PivotApiClient {
  return new PivotApiClient(baseUrl, headers);
}

/**
 * React hook for using the pivot API client
 */
export function usePivotApi(
  baseUrl?: string,
  headers?: Record<string, string>
): PivotApiClient {
  const [client] = React.useState(() =>
    baseUrl || headers ? createPivotApiClient(baseUrl, headers) : pivotApiClient
  );

  return client;
}

/**
 * Utility function to handle API errors gracefully
 */
export function handleApiError(error: unknown): string {
  if (error instanceof PivotApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Utility function to retry API calls with exponential backoff
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i === maxRetries - 1) break;

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}