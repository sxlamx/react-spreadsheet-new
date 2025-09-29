import * as React from 'react';
import { useExportManager, ExportOptions, ExportFormat, triggerDownload } from './ExportManager';
import { PivotStructure, PivotConfiguration } from './types';
import './ExportUI.css';

/** Export dialog props */
export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close dialog callback */
  onClose: () => void;
  /** Pivot data to export */
  pivotData: PivotStructure;
  /** Pivot configuration */
  configuration: PivotConfiguration;
  /** Called when export is triggered */
  onExport?: (options: ExportOptions) => void;
  /** Custom class name */
  className?: string;
}

/** Export dialog component */
export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  pivotData,
  configuration,
  onExport,
  className,
}) => {
  const { exportData, isExporting } = useExportManager();

  // Form state
  const [format, setFormat] = React.useState<ExportFormat>('csv');
  const [filename, setFilename] = React.useState('pivot-export');
  const [includeHeaders, setIncludeHeaders] = React.useState(true);
  const [includeTotals, setIncludeTotals] = React.useState(true);
  const [includeFilters, setIncludeFilters] = React.useState(true);

  // Format-specific options
  const [csvDelimiter, setCsvDelimiter] = React.useState<',' | ';' | '\t'>(',');
  const [excelSheetName, setExcelSheetName] = React.useState('Pivot Data');
  const [pdfOrientation, setPdfOrientation] = React.useState<'portrait' | 'landscape'>('landscape');
  const [pdfTitle, setPdfTitle] = React.useState('Pivot Table Export');

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      filename,
      includeHeaders,
      includeTotals,
      includeFilters,
    };

    // Add format-specific options
    switch (format) {
      case 'csv':
        options.csv = {
          delimiter: csvDelimiter,
          encoding: 'utf-8',
          includeQuotes: true,
        };
        break;
      case 'excel':
        options.excel = {
          sheetName: excelSheetName,
          includeFormulas: false,
          freezePanes: true,
          autoFilter: true,
        };
        break;
      case 'pdf':
        options.pdf = {
          orientation: pdfOrientation,
          pageSize: 'A4',
          title: pdfTitle,
          includeMetadata: true,
        };
        break;
    }

    try {
      const result = await exportData(pivotData, configuration, options);

      if (result.success) {
        triggerDownload(result);
        onExport?.(options);
        onClose();
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`ExportDialog ${className || ''}`}>
      <div className="ExportDialog__overlay" onClick={handleClose} />
      <div className="ExportDialog__content">
        <div className="ExportDialog__header">
          <h3 className="ExportDialog__title">Export Pivot Table</h3>
          <button
            className="ExportDialog__close"
            onClick={handleClose}
            disabled={isExporting}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="ExportDialog__body">
          <form onSubmit={(e) => { e.preventDefault(); handleExport(); }}>
            {/* Format Selection */}
            <div className="ExportDialog__section">
              <h4 className="ExportDialog__section-title">Export Format</h4>
              <div className="ExportDialog__format-options">
                <label className="ExportDialog__format-option">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    disabled={isExporting}
                  />
                  <div className="ExportDialog__format-info">
                    <strong>CSV</strong>
                    <span>Comma-separated values, widely compatible</span>
                  </div>
                </label>

                <label className="ExportDialog__format-option">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    disabled={isExporting}
                  />
                  <div className="ExportDialog__format-info">
                    <strong>Excel</strong>
                    <span>Microsoft Excel format (.xls)</span>
                  </div>
                </label>

                <label className="ExportDialog__format-option">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    disabled={isExporting}
                  />
                  <div className="ExportDialog__format-info">
                    <strong>PDF</strong>
                    <span>Portable document format, print-ready</span>
                  </div>
                </label>

                <label className="ExportDialog__format-option">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    disabled={isExporting}
                  />
                  <div className="ExportDialog__format-info">
                    <strong>JSON</strong>
                    <span>JavaScript object notation, for developers</span>
                  </div>
                </label>
              </div>
            </div>

            {/* General Options */}
            <div className="ExportDialog__section">
              <h4 className="ExportDialog__section-title">General Options</h4>

              <div className="ExportDialog__field">
                <label className="ExportDialog__label">
                  Filename
                  <input
                    type="text"
                    className="ExportDialog__input"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    disabled={isExporting}
                    placeholder="pivot-export"
                  />
                </label>
              </div>

              <div className="ExportDialog__checkboxes">
                <label className="ExportDialog__checkbox">
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    disabled={isExporting}
                  />
                  Include column headers
                </label>

                <label className="ExportDialog__checkbox">
                  <input
                    type="checkbox"
                    checked={includeTotals}
                    onChange={(e) => setIncludeTotals(e.target.checked)}
                    disabled={isExporting}
                  />
                  Include totals and subtotals
                </label>

                <label className="ExportDialog__checkbox">
                  <input
                    type="checkbox"
                    checked={includeFilters}
                    onChange={(e) => setIncludeFilters(e.target.checked)}
                    disabled={isExporting}
                  />
                  Include filter information
                </label>
              </div>
            </div>

            {/* Format-specific options */}
            {format === 'csv' && (
              <div className="ExportDialog__section">
                <h4 className="ExportDialog__section-title">CSV Options</h4>
                <div className="ExportDialog__field">
                  <label className="ExportDialog__label">
                    Delimiter
                    <select
                      className="ExportDialog__select"
                      value={csvDelimiter}
                      onChange={(e) => setCsvDelimiter(e.target.value as ',' | ';' | '\t')}
                      disabled={isExporting}
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="\t">Tab</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {format === 'excel' && (
              <div className="ExportDialog__section">
                <h4 className="ExportDialog__section-title">Excel Options</h4>
                <div className="ExportDialog__field">
                  <label className="ExportDialog__label">
                    Sheet Name
                    <input
                      type="text"
                      className="ExportDialog__input"
                      value={excelSheetName}
                      onChange={(e) => setExcelSheetName(e.target.value)}
                      disabled={isExporting}
                      placeholder="Pivot Data"
                    />
                  </label>
                </div>
              </div>
            )}

            {format === 'pdf' && (
              <div className="ExportDialog__section">
                <h4 className="ExportDialog__section-title">PDF Options</h4>
                <div className="ExportDialog__field">
                  <label className="ExportDialog__label">
                    Document Title
                    <input
                      type="text"
                      className="ExportDialog__input"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      disabled={isExporting}
                      placeholder="Pivot Table Export"
                    />
                  </label>
                </div>
                <div className="ExportDialog__field">
                  <label className="ExportDialog__label">
                    Orientation
                    <select
                      className="ExportDialog__select"
                      value={pdfOrientation}
                      onChange={(e) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')}
                      disabled={isExporting}
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {format === 'json' && (
              <div className="ExportDialog__section">
                <h4 className="ExportDialog__section-title">JSON Options</h4>
                <p className="ExportDialog__help">
                  JSON export includes both the pivot configuration and computed data,
                  allowing for complete reconstruction of the pivot table.
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="ExportDialog__footer">
          <button
            type="button"
            className="ExportDialog__button ExportDialog__button--secondary"
            onClick={handleClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ExportDialog__button ExportDialog__button--primary"
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
          >
            {isExporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Export button component */
export const ExportButton: React.FC<{
  pivotData: PivotStructure;
  configuration: PivotConfiguration;
  onExport?: (options: ExportOptions) => void;
  className?: string;
  children?: React.ReactNode;
}> = ({ pivotData, configuration, onExport, className, children }) => {
  const [showDialog, setShowDialog] = React.useState(false);

  return (
    <>
      <button
        className={`ExportButton ${className || ''}`}
        onClick={() => setShowDialog(true)}
        type="button"
      >
        {children || '📤 Export'}
      </button>

      <ExportDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        pivotData={pivotData}
        configuration={configuration}
        onExport={onExport}
      />
    </>
  );
};

/** Quick export buttons for common formats */
export const QuickExportButtons: React.FC<{
  pivotData: PivotStructure;
  configuration: PivotConfiguration;
  onExport?: (options: ExportOptions) => void;
  className?: string;
}> = ({ pivotData, configuration, onExport, className }) => {
  const { exportData } = useExportManager();

  const handleQuickExport = async (format: ExportFormat) => {
    const options: ExportOptions = {
      format,
      filename: `pivot-export-${new Date().toISOString().split('T')[0]}`,
      includeHeaders: true,
      includeTotals: true,
      includeFilters: true,
    };

    try {
      const result = await exportData(pivotData, configuration, options);

      if (result.success) {
        triggerDownload(result);
        onExport?.(options);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className={`QuickExportButtons ${className || ''}`}>
      <button
        className="QuickExportButtons__button QuickExportButtons__button--csv"
        onClick={() => handleQuickExport('csv')}
        title="Export as CSV"
        type="button"
      >
        📊 CSV
      </button>
      <button
        className="QuickExportButtons__button QuickExportButtons__button--excel"
        onClick={() => handleQuickExport('excel')}
        title="Export as Excel"
        type="button"
      >
        📈 Excel
      </button>
      <button
        className="QuickExportButtons__button QuickExportButtons__button--pdf"
        onClick={() => handleQuickExport('pdf')}
        title="Export as PDF"
        type="button"
      >
        📄 PDF
      </button>
    </div>
  );
};

export default ExportDialog;