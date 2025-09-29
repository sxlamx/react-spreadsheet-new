import * as React from 'react';
import { PivotStructure, PivotCell, PivotHeader, ExportConfig, PivotConfiguration } from './types';

/** Export format types */
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

/** Export options for different formats */
export interface ExportOptions {
  /** Format to export */
  format: ExportFormat;
  /** Include headers in export */
  includeHeaders?: boolean;
  /** Include totals and subtotals */
  includeTotals?: boolean;
  /** Include filters information */
  includeFilters?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
  /** PDF-specific options */
  pdf?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'A3' | 'letter' | 'legal';
    title?: string;
    includeMetadata?: boolean;
  };
  /** Excel-specific options */
  excel?: {
    sheetName?: string;
    includeFormulas?: boolean;
    freezePanes?: boolean;
    autoFilter?: boolean;
  };
  /** CSV-specific options */
  csv?: {
    delimiter?: ',' | ';' | '\t';
    encoding?: 'utf-8' | 'utf-16' | 'ascii';
    includeQuotes?: boolean;
  };
}

/** Export result */
export interface ExportResult {
  /** Success status */
  success: boolean;
  /** Download URL (for browser downloads) */
  url?: string;
  /** File blob (for programmatic access) */
  blob?: Blob;
  /** Error message if failed */
  error?: string;
  /** Export metadata */
  metadata?: {
    format: ExportFormat;
    filename: string;
    size: number;
    timestamp: number;
  };
}

/** Hook for managing exports */
export function useExportManager(): {
  exportData: (
    pivotData: PivotStructure,
    configuration: PivotConfiguration,
    options: ExportOptions
  ) => Promise<ExportResult>;
  isExporting: boolean;
  lastExport: ExportResult | null;
} {
  const [isExporting, setIsExporting] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<ExportResult | null>(null);

  const exportData = React.useCallback(async (
    pivotData: PivotStructure,
    configuration: PivotConfiguration,
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);

    try {
      let result: ExportResult;

      switch (options.format) {
        case 'csv':
          result = await exportToCSV(pivotData, configuration, options);
          break;
        case 'excel':
          result = await exportToExcel(pivotData, configuration, options);
          break;
        case 'pdf':
          result = await exportToPDF(pivotData, configuration, options);
          break;
        case 'json':
          result = await exportToJSON(pivotData, configuration, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      setLastExport(result);
      return result;
    } catch (error) {
      const errorResult: ExportResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
      setLastExport(errorResult);
      return errorResult;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportData,
    isExporting,
    lastExport,
  };
}

// Export implementations

/** Export to CSV format */
async function exportToCSV(
  pivotData: PivotStructure,
  configuration: PivotConfiguration,
  options: ExportOptions
): Promise<ExportResult> {
  const {
    includeHeaders = true,
    includeTotals = true,
    includeFilters = true,
    filename = 'pivot-export',
    csv = {},
  } = options;

  const {
    delimiter = ',',
    encoding = 'utf-8',
    includeQuotes = true,
  } = csv;

  const lines: string[] = [];

  // Add metadata and filters if requested
  if (includeFilters && configuration.filters.length > 0) {
    lines.push('# Filters:');
    for (const filter of configuration.filters) {
      lines.push(`# ${filter.name} ${filter.operator || 'equals'} ${filter.value || ''}`);
    }
    lines.push('');
  }

  // Helper function to escape CSV values
  const escapeCSV = (value: string): string => {
    if (!includeQuotes && !value.includes(delimiter) && !value.includes('\n')) {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  };

  // Build header row
  if (includeHeaders) {
    const headerRow: string[] = [];

    // Add row header columns
    for (let i = 0; i < pivotData.rowHeaders.length; i++) {
      headerRow.push(escapeCSV(`Row ${i + 1}`));
    }

    // Add column headers
    if (pivotData.columnHeaders.length > 0) {
      const topLevelColumns = pivotData.columnHeaders[0];
      for (const header of topLevelColumns) {
        headerRow.push(escapeCSV(header.value));
      }
    }

    lines.push(headerRow.join(delimiter));
  }

  // Build data rows
  for (let rowIndex = 0; rowIndex < pivotData.matrix.length; rowIndex++) {
    const row = pivotData.matrix[rowIndex];
    const dataRow: string[] = [];

    // Add row headers
    if (pivotData.rowHeaders[rowIndex]) {
      for (const header of pivotData.rowHeaders[rowIndex]) {
        dataRow.push(escapeCSV(header.value));
      }
    }

    // Add data cells
    for (const cell of row) {
      if (cell) {
        if (!includeTotals && (cell.type === 'subtotal' || cell.type === 'grandTotal')) {
          continue;
        }
        dataRow.push(escapeCSV(cell.formattedValue || cell.value?.toString() || ''));
      } else {
        dataRow.push('');
      }
    }

    lines.push(dataRow.join(delimiter));
  }

  // Create blob
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], {
    type: `text/csv;charset=${encoding}`
  });

  // Create download URL
  const url = URL.createObjectURL(blob);

  return {
    success: true,
    url,
    blob,
    metadata: {
      format: 'csv',
      filename: `${filename}.csv`,
      size: blob.size,
      timestamp: Date.now(),
    },
  };
}

/** Export to Excel format (using a basic approach) */
async function exportToExcel(
  pivotData: PivotStructure,
  configuration: PivotConfiguration,
  options: ExportOptions
): Promise<ExportResult> {
  // For now, we'll export as CSV with .xlsx extension and Excel MIME type
  // In a full implementation, you'd use a library like SheetJS (xlsx) or ExcelJS

  const csvResult = await exportToCSV(pivotData, configuration, {
    ...options,
    format: 'csv',
  });

  if (!csvResult.success || !csvResult.blob) {
    return csvResult;
  }

  // Convert CSV content to Excel-compatible format
  const csvText = await csvResult.blob.text();

  // Create a simple Excel XML format
  const excelXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${options.excel?.sheetName || 'Pivot Data'}">
  <Table>
${csvText.split('\n').map(line => {
  if (line.startsWith('#') || line.trim() === '') {
    return '';
  }
  const cells = line.split(',').map(cell => {
    const cleanCell = cell.replace(/^"|"$/g, '').replace(/""/g, '"');
    const isNumber = !isNaN(Number(cleanCell)) && cleanCell !== '';
    return `    <Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${cleanCell}</Data></Cell>`;
  });
  return `   <Row>\n${cells.join('\n')}\n   </Row>`;
}).filter(row => row).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([excelXml], {
    type: 'application/vnd.ms-excel'
  });

  const url = URL.createObjectURL(blob);

  return {
    success: true,
    url,
    blob,
    metadata: {
      format: 'excel',
      filename: `${options.filename || 'pivot-export'}.xls`,
      size: blob.size,
      timestamp: Date.now(),
    },
  };
}

/** Export to PDF format */
async function exportToPDF(
  pivotData: PivotStructure,
  configuration: PivotConfiguration,
  options: ExportOptions
): Promise<ExportResult> {
  // This is a basic HTML-to-PDF approach
  // In a full implementation, you'd use a library like jsPDF or Puppeteer

  const {
    filename = 'pivot-export',
    pdf = {},
    includeHeaders = true,
    includeTotals = true,
    includeFilters = true,
  } = options;

  const {
    orientation = 'landscape',
    title = 'Pivot Table Export',
    includeMetadata = true,
  } = pdf;

  // Generate HTML content
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    .header {
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .metadata {
      font-size: 10px;
      color: #666;
      margin-bottom: 10px;
    }
    .filters {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    .filters h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
    }
    .filter-item {
      font-size: 10px;
      margin: 2px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 4px 6px;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .row-header {
      background-color: #f1f3f4;
      font-weight: 500;
    }
    .data-cell {
      text-align: right;
    }
    .subtotal {
      background-color: #e9ecef;
      font-weight: 600;
    }
    .grand-total {
      background-color: #dee2e6;
      font-weight: 700;
      border: 2px solid #6c757d;
    }
    @media print {
      body { margin: 0; }
      @page {
        size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${title}</div>
    ${includeMetadata ? `
    <div class="metadata">
      Generated on: ${new Date().toLocaleString()}<br>
      Rows: ${configuration.rows.map(r => r.name).join(', ')}<br>
      Columns: ${configuration.columns.map(c => c.name).join(', ')}<br>
      Values: ${configuration.values.map(v => `${v.name} (${v.aggregation})`).join(', ')}
    </div>
    ` : ''}
  </div>

  ${includeFilters && configuration.filters.length > 0 ? `
  <div class="filters">
    <h4>Applied Filters:</h4>
    ${configuration.filters.map(f =>
      `<div class="filter-item">${f.name} ${f.operator || 'equals'} ${f.value || ''}</div>`
    ).join('')}
  </div>
  ` : ''}

  <table>`;

  // Add headers
  if (includeHeaders && pivotData.columnHeaders.length > 0) {
    htmlContent += '<thead><tr>';

    // Add empty cells for row headers
    for (let i = 0; i < pivotData.rowHeaders[0]?.length || 0; i++) {
      htmlContent += '<th></th>';
    }

    // Add column headers
    for (const header of pivotData.columnHeaders[0]) {
      htmlContent += `<th>${header.value}</th>`;
    }

    htmlContent += '</tr></thead>';
  }

  // Add data rows
  htmlContent += '<tbody>';
  for (let rowIndex = 0; rowIndex < pivotData.matrix.length; rowIndex++) {
    const row = pivotData.matrix[rowIndex];
    htmlContent += '<tr>';

    // Add row headers
    if (pivotData.rowHeaders[rowIndex]) {
      for (const header of pivotData.rowHeaders[rowIndex]) {
        htmlContent += `<td class="row-header">${header.value}</td>`;
      }
    }

    // Add data cells
    for (const cell of row) {
      if (cell) {
        if (!includeTotals && (cell.type === 'subtotal' || cell.type === 'grandTotal')) {
          continue;
        }

        const cellClass = cell.type === 'data' ? 'data-cell' : cell.type;
        htmlContent += `<td class="${cellClass}">${cell.formattedValue || cell.value?.toString() || ''}</td>`;
      } else {
        htmlContent += '<td></td>';
      }
    }

    htmlContent += '</tr>';
  }

  htmlContent += `
  </tbody>
  </table>
</body>
</html>`;

  // For a real PDF export, you would use a PDF library here
  // For now, we'll create an HTML file that can be printed to PDF
  const blob = new Blob([htmlContent], {
    type: 'text/html;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);

  return {
    success: true,
    url,
    blob,
    metadata: {
      format: 'pdf',
      filename: `${filename}.html`, // Would be .pdf with a real PDF library
      size: blob.size,
      timestamp: Date.now(),
    },
  };
}

/** Export to JSON format */
async function exportToJSON(
  pivotData: PivotStructure,
  configuration: PivotConfiguration,
  options: ExportOptions
): Promise<ExportResult> {
  const {
    filename = 'pivot-export',
    includeFilters = true,
  } = options;

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0',
    },
    configuration: includeFilters ? configuration : {
      ...configuration,
      filters: [],
    },
    data: {
      rowCount: pivotData.rowCount,
      columnCount: pivotData.columnCount,
      rowHeaders: pivotData.rowHeaders,
      columnHeaders: pivotData.columnHeaders,
      matrix: pivotData.matrix,
    },
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);

  return {
    success: true,
    url,
    blob,
    metadata: {
      format: 'json',
      filename: `${filename}.json`,
      size: blob.size,
      timestamp: Date.now(),
    },
  };
}

/** Utility function to trigger download */
export function triggerDownload(result: ExportResult): void {
  if (!result.success || !result.url || !result.metadata) {
    console.error('Cannot trigger download: invalid export result');
    return;
  }

  const link = document.createElement('a');
  link.href = result.url;
  link.download = result.metadata.filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(result.url!);
  }, 100);
}

export default useExportManager;