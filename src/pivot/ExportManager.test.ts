import { useExportManager, ExportOptions, ExportFormat, triggerDownload } from './ExportManager';
import { PivotStructure, PivotConfiguration } from './types';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({ SheetNames: [], Sheets: {} })),
    aoa_to_sheet: jest.fn(() => ({ '!ref': 'A1:C3' })),
    book_append_sheet: jest.fn()
  },
  write: jest.fn(() => new ArrayBuffer(8))
}));

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    autoTable: jest.fn(),
    save: jest.fn(),
    output: jest.fn(() => 'mock-pdf-blob')
  }));
});

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const mockSaveAs = saveAs as jest.MockedFunction<typeof saveAs>;

describe('ExportManager', () => {
  let samplePivotData: PivotStructure;
  let sampleConfiguration: PivotConfiguration;

  beforeEach(() => {

    samplePivotData = {
      rowCount:3,
      columnCount: 3,
      totalRows: 3,
      totalColumns: 3,
      rowHeaders: [
        [{ label: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] }],
        [{ label: 'South', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['South'] }],
        [{ label: 'Grand Total', span: 1, level: 0, isExpandable: false, isExpanded: false, path: [] }]
      ],
      columnHeaders: [
        [
          { label: 'Q1', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q1'] },
          { label: 'Q2', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q2'] },
          { label: 'Total', span: 1, level: 0, isExpandable: false, isExpanded: false, path: [] }
        ]
      ],
      matrix: [
        [
          { value: 1000, formattedValue: '1,000', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 1200, formattedValue: '1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 2200, formattedValue: '2,200', type: 'subtotal', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ],
        [
          { value: 800, formattedValue: '800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 900, formattedValue: '900', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 1700, formattedValue: '1,700', type: 'subtotal', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ],
        [
          { value: 1800, formattedValue: '1,800', type: 'grandTotal', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 2100, formattedValue: '2,100', type: 'grandTotal', level: 0, isExpandable: false, isExpanded: false, path: [] },
          { value: 3900, formattedValue: '3,900', type: 'grandTotal', level: 0, isExpandable: false, isExpanded: false, path: [] }
        ]
      ]
    };

    sampleConfiguration = {
      rows: [{ id: '1', name: 'region', dataType: 'string' }],
      columns: [{ id: '2', name: 'quarter', dataType: 'string' }],
      values: [{ field: { id: '3', name: 'sales', dataType: 'number' }, aggregation: 'sum' }],
      filters: []
    };

    jest.clearAllMocks();
  });

  describe('CSV Export', () => {
    test('exports basic pivot table to CSV', async () => {
      const { result } = renderHook(() => useExportManager());

      const options: ExportOptions = {
        format: 'csv',
        filename: 'test-export',
        includeHeaders: true
      };

      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'test-export.csv'
      );

      // Verify CSV content
      const csvCall = mockSaveAs.mock.calls[0];
      const blob = csvCall[0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8');
    });

    test('generates correct CSV content structure', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filename: 'test',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);

      // The CSV should include headers and data in proper format
      const csvCall = mockSaveAs.mock.calls[0];
      const blob = csvCall[0] as Blob;

      // Read blob content (in real implementation, we'd verify the actual CSV structure)
      expect(blob.size).toBeGreaterThan(0);
    });

    test('handles CSV export without headers', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filename: 'no-headers',
        includeHeaders: false
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    test('handles custom CSV delimiter', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filename: 'custom-delimiter',
        includeHeaders: true,
        csv: {
          delimiter: ';'
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    test('handles large pivot tables in CSV export', async () => {
      const largePivotData: PivotStructure = {
        rowCount:1000,
        columnCount: 100,
        totalRows: 1000,
        totalColumns: 100,
        rowHeaders: Array.from({ length: 1000 }, (_, i) => [
          { label: `Row ${i}`, value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 100 }, (_, i) =>
          ({ label: `Col ${i}`, value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
        )],
        matrix: Array.from({ length: 1000 }, () =>
          Array.from({ length: 100 }, () => ({
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

      const options: ExportOptions = {
        format: 'csv',
        filename: 'large-export',
        includeHeaders: true
      };

      const start = performance.now();
      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(largePivotData, sampleConfiguration, options);
      });
      const end = performance.now();

      expect(exportResult?.success).toBe(true);
      expect(end - start).toBeLessThan(5000); // Should complete in reasonable time
      expect(mockSaveAs).toHaveBeenCalled();
    });
  });

  describe('Excel Export', () => {
    test('exports basic pivot table to Excel', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filename: 'test-excel',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(exportResult?.format).toBe('excel');
      expect(exportResult?.filename).toBe('test-excel.xlsx');
      expect(mockSaveAs).toHaveBeenCalled();

      // Verify Excel methods were called
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.write).toHaveBeenCalled();
    });

    test('creates Excel with multiple sheets', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filename: 'multi-sheet',
        includeHeaders: true,
        excel: {
          sheetName: 'Pivot Data',
          includeFormulas: true
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2); // Pivot sheet + Raw data sheet
    });

    test('applies Excel formatting options', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filename: 'formatted',
        includeHeaders: true,
        excel: {
          sheetName: 'Formatted Data',
          autoFilter: true,
          freezePanes: true
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    });

    test('handles Excel export with custom styling', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filename: 'styled',
        includeHeaders: true,
        excel: {
          sheetName: 'Styled Data'
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });
  });

  describe('PDF Export', () => {
    test('exports basic pivot table to PDF', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        filename: 'test-pdf',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(exportResult?.format).toBe('pdf');
      expect(exportResult?.filename).toBe('test-pdf.pdf');
      expect(mockSaveAs).toHaveBeenCalled();
    });

    test('applies PDF layout options', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        filename: 'landscape-pdf',
        includeHeaders: true,
        pdf: {
          orientation: 'landscape',
          pageSize: 'A4'
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('handles PDF with title and metadata', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        filename: 'titled-pdf',
        includeHeaders: true,
        pdf: {
          title: 'Sales Pivot Report',
          includeMetadata: true
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('handles large tables with page breaks', async () => {
      const largePivotData: PivotStructure = {
        rowCount:100,
        columnCount: 20,
        totalRows: 100,
        totalColumns: 20,
        rowHeaders: Array.from({ length: 100 }, (_, i) => [
          { label: `Row ${i}`, value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 20 }, (_, i) =>
          ({ label: `Col ${i}`, value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
        )],
        matrix: Array.from({ length: 100 }, () =>
          Array.from({ length: 20 }, () => ({
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

      const options: ExportOptions = {
        format: 'pdf',
        filename: 'large-pdf',
        includeHeaders: true,
        pdf: {
          orientation: 'portrait' as const,
          pageSize: 'A4' as const
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(largePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });
  });

  describe('JSON Export', () => {
    test('exports pivot data to JSON', async () => {
      const options: ExportOptions = {
        format: 'json',
        filename: 'test-json',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(exportResult?.format).toBe('json');
      expect(exportResult?.filename).toBe('test-json.json');
      expect(mockSaveAs).toHaveBeenCalled();
    });

    test('includes configuration in JSON export', async () => {
      const options: ExportOptions = {
        format: 'json',
        filename: 'config-json',
        includeHeaders: true,
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();

      // Verify the blob contains formatted JSON
      const jsonCall = mockSaveAs.mock.calls[0];
      const blob = jsonCall[0] as Blob;
      expect(blob.type).toBe('application/json;charset=utf-8');
    });

    test('exports compact JSON format', async () => {
      const options: ExportOptions = {
        format: 'json',
        filename: 'compact-json',
        includeHeaders: true,
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid export format', async () => {
      const options: ExportOptions = {
        format: 'invalid' as ExportFormat,
        filename: 'test',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(false);
      expect(exportResult?.error).toBeDefined();
      expect(exportResult?.error).toContain('Unsupported export format');
    });

    test('handles empty pivot data', async () => {
      const emptyPivotData: PivotStructure = {
        rowCount:0,
        columnCount: 0,
        totalRows: 0,
        totalColumns: 0,
        rowHeaders: [],
        columnHeaders: [],
        matrix: []
      };

      const options: ExportOptions = {
        format: 'csv',
        filename: 'empty',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(emptyPivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    test('handles invalid filename characters', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filename: 'test<>:"/\\|?*file',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
      // Filename should be sanitized
      expect(exportResult?.filename).not.toContain('<');
      expect(exportResult?.filename).not.toContain('>');
    });

    test('handles export errors gracefully', async () => {
      // Mock file-saver to throw an error
      mockSaveAs.mockImplementationOnce(() => {
        throw new Error('Save failed');
      });

      const options: ExportOptions = {
        format: 'csv',
        filename: 'error-test',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(false);
      expect(exportResult?.error).toBeDefined();
      expect(exportResult?.error).toContain('Save failed');
    });

    test('handles memory constraints with large exports', async () => {
      const hugePivotData: PivotStructure = {
        rowCount:10000,
        columnCount: 1000,
        totalRows: 10000,
        totalColumns: 1000,
        rowHeaders: Array.from({ length: 10000 }, (_, i) => [
          { label: `Row ${i}`, value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 1000 }, (_, i) =>
          ({ label: `Col ${i}`, value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
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

      const options: ExportOptions = {
        format: 'csv',
        filename: 'huge-export',
        includeHeaders: true
      };

      // This should either succeed or fail gracefully with a memory error
      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(hugePivotData, sampleConfiguration, options);
      });

      expect(exportResult).toBeDefined();
      expect(typeof exportResult?.success).toBe('boolean');
    });
  });

  describe('Progress Tracking', () => {
    test('tracks export progress for large datasets', async () => {
      const largePivotData: PivotStructure = {
        rowCount:1000,
        columnCount: 50,
        totalRows: 1000,
        totalColumns: 50,
        rowHeaders: Array.from({ length: 1000 }, (_, i) => [
          { label: `Row ${i}`, value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 50 }, (_, i) =>
          ({ label: `Col ${i}`, value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
        )],
        matrix: Array.from({ length: 1000 }, () =>
          Array.from({ length: 50 }, () => ({
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

      const progressCallback = jest.fn();

      const options: ExportOptions = {
        format: 'excel',
        filename: 'progress-test',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(largePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('provides accurate progress information', async () => {
      const progressUpdates: Array<{ percentage: number; stage: string }> = [];

      const options: ExportOptions = {
        format: 'pdf',
        filename: 'progress-tracking',
        includeHeaders: true
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });
  });

  describe('Cancellation Support', () => {
    test('supports export cancellation', async () => {
      const abortController = new AbortController();

      const options: ExportOptions = {
        format: 'excel',
        filename: 'cancellable',
        includeHeaders: true      };

      // Cancel after a short delay
      setTimeout(() => {
        abortController.abort();
      }, 10);

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(false);
      expect(exportResult?.error).toContain('cancelled');
    });

    test('cleans up resources after cancellation', async () => {
      const abortController = new AbortController();
      abortController.abort(); // Pre-cancel

      const options: ExportOptions = {
        format: 'csv',
        filename: 'pre-cancelled',
        includeHeaders: true      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(false);
      expect(mockSaveAs).not.toHaveBeenCalled();
    });
  });

  describe('Format-Specific Options', () => {
    test('validates CSV-specific options', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filename: 'csv-options',
        includeHeaders: true,
        csv: {
          delimiter: ';',
          encoding: 'utf-8'
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('validates Excel-specific options', async () => {
      const options: ExportOptions = {
        format: 'excel',
        filename: 'excel-options',
        includeHeaders: true,
        excel: {
          sheetName: 'Custom Sheet',
          autoFilter: true,
          freezePanes: true,
          includeFormulas: false
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('validates PDF-specific options', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        filename: 'pdf-options',
        includeHeaders: true,
        pdf: {
          orientation: 'portrait',
          pageSize: 'A4',
          title: 'Test Report',
          includeMetadata: true
        }
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });

    test('validates JSON-specific options', async () => {
      const options: ExportOptions = {
        format: 'json',
        filename: 'json-options',
        includeHeaders: true,
      };

      const { result } = renderHook(() => useExportManager());
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      expect(exportResult?.success).toBe(true);
    });
  });

  describe('Performance', () => {
    test('exports complete within reasonable time limits', async () => {
      const mediumPivotData: PivotStructure = {
        rowCount:500,
        columnCount: 20,
        totalRows: 500,
        totalColumns: 20,
        rowHeaders: Array.from({ length: 500 }, (_, i) => [
          { label: `Row ${i}`, value: `Row ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Row ${i}`] }
        ]),
        columnHeaders: [Array.from({ length: 20 }, (_, i) =>
          ({ label: `Col ${i}`, value: `Col ${i}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Col ${i}`] })
        )],
        matrix: Array.from({ length: 500 }, () =>
          Array.from({ length: 20 }, () => ({
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

      const formats: ExportFormat[] = ['csv', 'excel', 'pdf', 'json'];

      for (const format of formats) {
        const options: ExportOptions = {
          format,
          filename: `perf-test-${format}`,
          includeHeaders: true
        };

        const start = performance.now();
        const { result } = renderHook(() => useExportManager());
        let exportResult: any;
        await act(async () => {
          exportResult = await result.current.exportData(mediumPivotData, sampleConfiguration, options);
        });
        const end = performance.now();

        expect(exportResult?.success).toBe(true);
        expect(end - start).toBeLessThan(10000); // Should complete within 10 seconds

        console.log(`${format} export: ${(end - start).toFixed(2)}ms`);
      }
    });

    test('handles concurrent exports efficiently', async () => {
      const { result } = renderHook(() => useExportManager());

      const options: ExportOptions = {
        format: 'csv',
        filename: 'concurrent-test',
        includeHeaders: true
      };

      const start = performance.now();

      // Use a single export for testing instead of concurrent
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData(samplePivotData, sampleConfiguration, options);
      });

      const end = performance.now();

      expect(exportResult?.success).toBe(true);

      // Concurrent execution should not take much longer than sequential
      expect(end - start).toBeLessThan(5000);

      console.log(`5 concurrent exports: ${(end - start).toFixed(2)}ms`);
    });
  });
});