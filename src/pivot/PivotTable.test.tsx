/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PivotTable } from './PivotTable';
import { PivotConfiguration, PivotDataSet } from './types';

// Mock the hooks and engines
jest.mock('./hooks/usePivotData', () => ({
  usePivotData: jest.fn()
}));

jest.mock('./hooks/usePivotEngine', () => ({
  usePivotEngine: jest.fn()
}));

import { usePivotData } from './hooks/usePivotData';
import { usePivotEngine } from './hooks/usePivotEngine';

const mockUsePivotData = usePivotData as jest.MockedFunction<typeof usePivotData>;
const mockUsePivotEngine = usePivotEngine as jest.MockedFunction<typeof usePivotEngine>;

describe('PivotTable Integration Tests', () => {
  let queryClient: QueryClient;
  let sampleData: PivotDataSet;
  let sampleConfiguration: PivotConfiguration;
  let mockPivotStructure: any;
  let mockOnConfigurationChange: jest.Mock;
  let mockOnCellClick: jest.Mock;
  let mockOnDrillDown: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    sampleData = [
      { id: 1, region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: 50 },
      { id: 2, region: 'North', product: 'Widget A', quarter: 'Q2', sales: 1200, quantity: 60 },
      { id: 3, region: 'South', product: 'Widget B', quarter: 'Q1', sales: 800, quantity: 40 },
      { id: 4, region: 'South', product: 'Widget B', quarter: 'Q2', sales: 900, quantity: 45 },
    ];

    sampleConfiguration = {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
    };

    mockPivotStructure = {
      rowCount: 3,
      columnCount: 2,
      rowHeaders: [
        [{ value: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] }],
        [{ value: 'South', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['South'] }],
        [{ value: 'Grand Total', span: 1, level: 0, isExpandable: false, isExpanded: false, path: [] }]
      ],
      columnHeaders: [
        [
          { value: 'Q1', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q1'] },
          { value: 'Q2', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q2'] }
        ]
      ],
      matrix: [
        [
          { value: 1000, formattedValue: '1,000', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 1200, formattedValue: '1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ],
        [
          { value: 800, formattedValue: '800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 900, formattedValue: '900', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ],
        [
          { value: 1800, formattedValue: '1,800', type: 'total', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 2100, formattedValue: '2,100', type: 'total', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ]
      ]
    };

    mockOnConfigurationChange = jest.fn();
    mockOnCellClick = jest.fn();
    mockOnDrillDown = jest.fn();

    // Setup default mock implementations
    mockUsePivotData.mockReturnValue({
      data: sampleData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUsePivotEngine.mockReturnValue({
      computePivot: jest.fn().mockReturnValue(mockPivotStructure),
      drillDown: jest.fn().mockReturnValue(sampleData.slice(0, 2)),
      isComputing: false,
      error: null
    });

    jest.clearAllMocks();
  });

  const renderPivotTable = (props = {}) => {
    const defaultProps = {
      data: sampleData,
      configuration: sampleConfiguration,
      onConfigurationChange: mockOnConfigurationChange,
      mode: 'client' as const,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PivotTable {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    test('renders pivot table with basic structure', () => {
      renderPivotTable();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('North')).toBeInTheDocument();
      expect(screen.getByText('South')).toBeInTheDocument();
      expect(screen.getByText('Q1')).toBeInTheDocument();
      expect(screen.getByText('Q2')).toBeInTheDocument();
    });

    test('displays loading state', () => {
      mockUsePivotData.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      renderPivotTable();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('displays error state', () => {
      mockUsePivotData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load data'),
        refetch: jest.fn()
      });

      renderPivotTable();

      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
    });

    test('renders with field selector when enabled', () => {
      renderPivotTable({ showFieldSelector: true });

      expect(screen.getByText(/field selector/i)).toBeInTheDocument();
    });

    test('renders with export controls when enabled', () => {
      renderPivotTable({ showExportControls: true });

      expect(screen.getByText(/export/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('handles cell click events', () => {
      renderPivotTable({ onCellClick: mockOnCellClick });

      const dataCell = screen.getByText('1,000');
      fireEvent.click(dataCell);

      expect(mockOnCellClick).toHaveBeenCalledWith(
        expect.objectContaining({
          rowIndex: 0,
          columnIndex: 0,
          value: 1000
        })
      );
    });

    test('handles drill down interactions', () => {
      renderPivotTable({ onDrillDown: mockOnDrillDown });

      const dataCell = screen.getByText('1,000');
      fireEvent.doubleClick(dataCell);

      expect(mockOnDrillDown).toHaveBeenCalledWith(
        expect.objectContaining({
          rowPath: ['North'],
          columnPath: ['Q1'],
          data: expect.any(Array)
        })
      );
    });

    test('handles expandable row interactions', () => {
      const expandableStructure = {
        ...mockPivotStructure,
        rowHeaders: [
          [{ value: 'North', span: 1, level: 0, isExpandable: true, isExpanded: false, path: ['North'] }]
        ]
      };

      mockUsePivotEngine.mockReturnValue({
        computePivot: jest.fn().mockReturnValue(expandableStructure),
        drillDown: jest.fn(),
        isComputing: false,
        error: null
      });

      renderPivotTable();

      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Should trigger re-computation with expanded state
      expect(mockUsePivotEngine().computePivot).toHaveBeenCalled();
    });

    test('handles column sorting', () => {
      renderPivotTable();

      const columnHeader = screen.getByText('Q1');
      fireEvent.click(columnHeader);

      // Should trigger configuration change with sort options
      expect(mockOnConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            sortBy: expect.any(Object)
          })
        })
      );
    });

    test('handles right-click context menu', () => {
      renderPivotTable();

      const dataCell = screen.getByText('1,000');
      fireEvent.contextMenu(dataCell);

      expect(screen.getByText(/context menu/i)).toBeInTheDocument();
    });
  });

  describe('Configuration Updates', () => {
    test('recomputes pivot when configuration changes', async () => {
      const { rerender } = renderPivotTable();

      const newConfiguration = {
        ...sampleConfiguration,
        values: [{ name: 'quantity', dataType: 'number', aggregation: 'sum' }]
      };

      rerender(
        <QueryClientProvider client={queryClient}>
          <PivotTable
            data={sampleData}
            configuration={newConfiguration}
            onConfigurationChange={mockOnConfigurationChange}
            mode="client"
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockUsePivotEngine().computePivot).toHaveBeenCalledWith(
          sampleData,
          newConfiguration
        );
      });
    });

    test('updates when filters are applied', async () => {
      const filteredConfiguration = {
        ...sampleConfiguration,
        filters: [{ name: 'sales', operator: 'greaterThan', value: 950 }]
      };

      const { rerender } = renderPivotTable();

      rerender(
        <QueryClientProvider client={queryClient}>
          <PivotTable
            data={sampleData}
            configuration={filteredConfiguration}
            onConfigurationChange={mockOnConfigurationChange}
            mode="client"
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockUsePivotEngine().computePivot).toHaveBeenCalledWith(
          sampleData,
          filteredConfiguration
        );
      });
    });

    test('handles field selector changes', async () => {
      renderPivotTable({ showFieldSelector: true });

      // Simulate dragging a field to columns
      const fieldSelector = screen.getByText(/field selector/i);
      const dropZone = within(fieldSelector).getByText(/columns/i);

      fireEvent.dragStart(screen.getByText('product'));
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone);

      await waitFor(() => {
        expect(mockOnConfigurationChange).toHaveBeenCalledWith(
          expect.objectContaining({
            columns: expect.arrayContaining([
              expect.objectContaining({ name: 'product' })
            ])
          })
        );
      });
    });
  });

  describe('Performance Features', () => {
    test('uses virtualization for large datasets', () => {
      const largeStructure = {
        ...mockPivotStructure,
        rowCount: 10000,
        columnCount: 100
      };

      mockUsePivotEngine.mockReturnValue({
        computePivot: jest.fn().mockReturnValue(largeStructure),
        drillDown: jest.fn(),
        isComputing: false,
        error: null
      });

      renderPivotTable({ enableVirtualization: true });

      // Should render virtualized table
      expect(screen.getByTestId('virtualized-pivot-table')).toBeInTheDocument();
    });

    test('shows performance monitor when enabled', () => {
      renderPivotTable({ showPerformanceMonitor: true });

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });

    test('handles computation timeout gracefully', async () => {
      mockUsePivotEngine.mockReturnValue({
        computePivot: jest.fn().mockImplementation(() => {
          throw new Error('Computation timeout');
        }),
        drillDown: jest.fn(),
        isComputing: false,
        error: new Error('Computation timeout')
      });

      renderPivotTable();

      expect(screen.getByText(/computation timeout/i)).toBeInTheDocument();
    });
  });

  describe('Export Integration', () => {
    test('handles export button clicks', () => {
      renderPivotTable({ showExportControls: true });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      // Should trigger export functionality
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    });

    test('shows export progress dialog', async () => {
      renderPivotTable({ showExportControls: true });

      const exportButton = screen.getByRole('button', { name: /export excel/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export progress/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderPivotTable();

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', expect.stringContaining('Pivot table'));

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);

      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders.length).toBeGreaterThan(0);
    });

    test('supports keyboard navigation', () => {
      renderPivotTable();

      const firstCell = screen.getByText('1,000');
      firstCell.focus();

      fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
      // Should move focus to next cell

      fireEvent.keyDown(firstCell, { key: 'Enter' });
      // Should trigger cell selection or action
    });

    test('provides screen reader announcements', () => {
      renderPivotTable();

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/pivot table loaded/i);
    });

    test('handles high contrast mode', () => {
      renderPivotTable({ className: 'high-contrast' });

      const table = screen.getByRole('table');
      expect(table).toHaveClass('high-contrast');
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderPivotTable();

      expect(screen.getByTestId('mobile-pivot-view')).toBeInTheDocument();
    });

    test('shows horizontal scroll indicators', () => {
      renderPivotTable({ className: 'wide-table' });

      const scrollContainer = screen.getByTestId('pivot-scroll-container');
      expect(scrollContainer).toHaveClass('scrollable');
    });

    test('handles tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderPivotTable();

      expect(screen.getByTestId('tablet-pivot-view')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('recovers from computation errors', () => {
      mockUsePivotEngine.mockReturnValue({
        computePivot: jest.fn().mockImplementation(() => {
          throw new Error('Computation failed');
        }),
        drillDown: jest.fn(),
        isComputing: false,
        error: new Error('Computation failed')
      });

      renderPivotTable();

      expect(screen.getByText(/computation failed/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should attempt to recompute
      expect(mockUsePivotEngine().computePivot).toHaveBeenCalled();
    });

    test('handles invalid data gracefully', () => {
      const invalidData = [
        { id: null, region: undefined, sales: 'invalid' },
        { missing: 'fields' }
      ] as any;

      renderPivotTable({ data: invalidData });

      // Should not crash and show appropriate message
      expect(screen.getByText(/invalid data/i)).toBeInTheDocument();
    });

    test('handles network errors in server mode', () => {
      mockUsePivotData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn()
      });

      renderPivotTable({ mode: 'server' });

      expect(screen.getByText(/network error/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    test('cleans up on unmount', () => {
      const { unmount } = renderPivotTable();

      unmount();

      // Verify no memory leaks by checking that event listeners are removed
      // This would be implementation-specific
    });

    test('handles large pivot structures efficiently', () => {
      const largePivotStructure = {
        rowCount: 10000,
        columnCount: 1000,
        rowHeaders: Array.from({ length: 10000 }, (_, i) => [
          { value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 1000 }, (_, i) =>
          ({ value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
        )],
        matrix: Array.from({ length: 10000 }, () =>
          Array.from({ length: 1000 }, () => ({
            value: Math.random() * 1000,
            formattedValue: '0.00',
            type: 'data' as const,
            level: 0,
            isExpandable: false,
            isExpanded: false,
            path: []
          }))
        )
      };

      mockUsePivotEngine.mockReturnValue({
        computePivot: jest.fn().mockReturnValue(largePivotStructure),
        drillDown: jest.fn(),
        isComputing: false,
        error: null
      });

      renderPivotTable({ enableVirtualization: true });

      // Should handle large structure without performance issues
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});