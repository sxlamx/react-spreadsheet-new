/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ExportDialog, ExportButton, QuickExportButtons, useExportManager } from './ExportUI';
import { PivotStructure, PivotConfiguration } from './types';

// Mock the ExportManager
jest.mock('./ExportManager', () => ({
  ExportManager: jest.fn().mockImplementation(() => ({
    exportData: jest.fn()
  }))
}));

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

describe('ExportUI Components', () => {
  let samplePivotData: PivotStructure;
  let sampleConfiguration: PivotConfiguration;
  let mockExportData: jest.Mock;

  beforeEach(() => {
    samplePivotData = {
      rowCount: 2,
      columnCount: 2,
      rowHeaders: [
        [{ value: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] }],
        [{ value: 'South', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['South'] }]
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
        ]
      ]
    };

    sampleConfiguration = {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
    };

    mockExportData = jest.fn().mockResolvedValue({
      success: true,
      format: 'csv',
      filename: 'test.csv',
      size: 1024
    });

    // Mock the ExportManager constructor to return our mock
    const { ExportManager } = require('./ExportManager');
    ExportManager.mockImplementation(() => ({
      exportData: mockExportData
    }));

    jest.clearAllMocks();
  });

  describe('useExportManager Hook', () => {
    const TestComponent = () => {
      const { exportData, isExporting, lastExport } = useExportManager();

      return (
        <div>
          <div data-testid="is-exporting">{isExporting ? 'true' : 'false'}</div>
          <div data-testid="last-export">{lastExport ? JSON.stringify(lastExport) : 'null'}</div>
          <button
            onClick={() => exportData(samplePivotData, sampleConfiguration, {
              format: 'csv',
              filename: 'test',
              includeHeaders: true
            })}
          >
            Export
          </button>
        </div>
      );
    };

    test('manages export state correctly', async () => {
      render(<TestComponent />);

      expect(screen.getByTestId('is-exporting')).toHaveTextContent('false');
      expect(screen.getByTestId('last-export')).toHaveTextContent('null');

      fireEvent.click(screen.getByText('Export'));

      // Should show exporting state
      expect(screen.getByTestId('is-exporting')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('is-exporting')).toHaveTextContent('false');
      });

      // Should have last export result
      const lastExportText = screen.getByTestId('last-export').textContent;
      expect(lastExportText).toContain('csv');
      expect(lastExportText).toContain('test.csv');
    });

    test('handles export errors', async () => {
      mockExportData.mockRejectedValueOnce(new Error('Export failed'));

      const TestComponentWithError = () => {
        const { exportData, isExporting, error } = useExportManager();

        return (
          <div>
            <div data-testid="is-exporting">{isExporting ? 'true' : 'false'}</div>
            <div data-testid="error">{error ? error.message : 'null'}</div>
            <button
              onClick={() => exportData(samplePivotData, sampleConfiguration, {
                format: 'csv',
                filename: 'test',
                includeHeaders: true
              })}
            >
              Export
            </button>
          </div>
        );
      };

      render(<TestComponentWithError />);

      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Export failed');
        expect(screen.getByTestId('is-exporting')).toHaveTextContent('false');
      });
    });
  });

  describe('ExportButton Component', () => {
    test('renders basic export button', () => {
      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/csv/i)).toBeInTheDocument();
    });

    test('handles button click and export', async () => {
      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockExportData).toHaveBeenCalledWith(
          samplePivotData,
          sampleConfiguration,
          expect.objectContaining({
            format: 'excel',
            filename: 'test-excel'
          })
        );
      });
    });

    test('shows loading state during export', async () => {
      // Make export take some time
      mockExportData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          format="pdf"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show loading state
      expect(button).toBeDisabled();
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    test('displays custom labels and icons', () => {
      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          format="json"
          label="Download JSON"
          icon="📊"
        />
      );

      expect(screen.getByText('Download JSON')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    test('applies custom styling', () => {
      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          className="custom-button"
          style={{ backgroundColor: 'red' }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-button');
      expect(button).toHaveStyle('background-color: red');
    });

    test('handles disabled state', () => {
      render(
        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(mockExportData).not.toHaveBeenCalled();
    });
  });

  describe('QuickExportButtons Component', () => {
    test('renders all quick export buttons', () => {
      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.getByText(/csv/i)).toBeInTheDocument();
      expect(screen.getByText(/excel/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/json/i)).toBeInTheDocument();
    });

    test('handles individual button clicks', async () => {
      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      // Test CSV export
      fireEvent.click(screen.getByText(/csv/i));
      await waitFor(() => {
        expect(mockExportData).toHaveBeenCalledWith(
          samplePivotData,
          sampleConfiguration,
          expect.objectContaining({ format: 'csv' })
        );
      });

      // Test Excel export
      fireEvent.click(screen.getByText(/excel/i));
      await waitFor(() => {
        expect(mockExportData).toHaveBeenCalledWith(
          samplePivotData,
          sampleConfiguration,
          expect.objectContaining({ format: 'excel' })
        );
      });
    });

    test('applies compact styling', () => {
      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          compact={true}
        />
      );

      const container = screen.getByTestId('quick-export-buttons');
      expect(container).toHaveClass('compact');
    });

    test('shows only specified formats', () => {
      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          formats={['csv', 'pdf']}
        />
      );

      expect(screen.getByText(/csv/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      expect(screen.queryByText(/excel/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/json/i)).not.toBeInTheDocument();
    });
  });

  describe('ExportDialog Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders export dialog when open', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/export options/i)).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(
        <ExportDialog
          isOpen={false}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows format selection options', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    test('allows filename customization', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const filenameInput = screen.getByLabelText(/filename/i);
      expect(filenameInput).toHaveValue('custom-name');

      fireEvent.change(filenameInput, { target: { value: 'new-filename' } });
      expect(filenameInput).toHaveValue('new-filename');
    });

    test('shows format-specific options', async () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      // Select Excel format
      const formatSelect = screen.getByLabelText(/format/i);
      fireEvent.change(formatSelect, { target: { value: 'excel' } });

      await waitFor(() => {
        expect(screen.getByText(/sheet name/i)).toBeInTheDocument();
        expect(screen.getByText(/include raw data/i)).toBeInTheDocument();
      });

      // Select PDF format
      fireEvent.change(formatSelect, { target: { value: 'pdf' } });

      await waitFor(() => {
        expect(screen.getByText(/orientation/i)).toBeInTheDocument();
        expect(screen.getByText(/page size/i)).toBeInTheDocument();
      });
    });

    test('shows export progress', async () => {
      let progressCallback: ((progress: any) => void) | undefined;

      mockExportData.mockImplementation((_, __, options) => {
        progressCallback = options.onProgress;
        return new Promise(resolve => {
          setTimeout(() => {
            if (progressCallback) {
              progressCallback({ percentage: 50, stage: 'Processing' });
              progressCallback({ percentage: 100, stage: 'Complete' });
            }
            resolve({ success: true, format: 'csv', filename: 'test.csv' });
          }, 100);
        });
      });

      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/complete/i)).toBeInTheDocument();
      });
    });

    test('handles export cancellation', async () => {
      let rejectFn: ((reason: any) => void) | undefined;

      mockExportData.mockImplementation(() => {
        return new Promise((_, reject) => {
          rejectFn = reject;
          setTimeout(() => {
            if (rejectFn) {
              rejectFn(new Error('Export cancelled'));
            }
          }, 1000);
        });
      });

      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      // Wait for export to start
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
      });
    });

    test('validates form inputs', async () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });

      // Try to export with empty filename
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/filename is required/i)).toBeInTheDocument();
      });

      expect(mockExportData).not.toHaveBeenCalled();
    });

    test('closes dialog on successful export', async () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('handles export errors in dialog', async () => {
      mockExportData.mockRejectedValueOnce(new Error('Export failed'));

      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('supports keyboard navigation', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const dialog = screen.getByRole('dialog');

      // ESC key should close dialog
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('traps focus within dialog', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Focus should be trapped within the dialog
      const firstFocusableElement = screen.getByLabelText(/format/i);
      expect(document.activeElement).toBe(firstFocusableElement);
    });

    test('supports advanced export options', async () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={mockOnClose}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          showAdvanced={true}
        />
      );

      // Should show advanced options
      expect(screen.getByText(/include headers/i)).toBeInTheDocument();
      expect(screen.getByText(/date format/i)).toBeInTheDocument();

      // Toggle include headers
      const includeHeadersCheckbox = screen.getByLabelText(/include headers/i);
      fireEvent.click(includeHeadersCheckbox);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportData).toHaveBeenCalledWith(
          samplePivotData,
          sampleConfiguration,
          expect.objectContaining({
            includeHeaders: false
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('export buttons have proper ARIA labels', () => {
      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const csvButton = screen.getByLabelText(/export to csv/i);
      expect(csvButton).toBeInTheDocument();

      const excelButton = screen.getByLabelText(/export to excel/i);
      expect(excelButton).toBeInTheDocument();
    });

    test('export dialog has proper ARIA attributes', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={jest.fn()}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    test('form controls have proper labels', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={jest.fn()}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filename/i)).toBeInTheDocument();
    });

    test('progress indicators are announced to screen readers', async () => {
      mockExportData.mockImplementation((_, __, options) => {
        setTimeout(() => {
          if (options.onProgress) {
            options.onProgress({ percentage: 50, stage: 'Processing data' });
          }
        }, 50);
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <ExportDialog
          isOpen={true}
          onClose={jest.fn()}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        const progressElement = screen.getByRole('progressbar');
        expect(progressElement).toHaveAttribute('aria-label', expect.stringContaining('Processing'));
      });
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const container = screen.getByTestId('quick-export-buttons');
      expect(container).toHaveClass('mobile');
    });

    test('dialog adjusts to screen size', () => {
      render(
        <ExportDialog
          isOpen={true}
          onClose={jest.fn()}
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('responsive');
    });
  });
});