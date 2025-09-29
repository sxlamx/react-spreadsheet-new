import * as React from 'react';
import { PivotTable } from '../PivotTable';
import { ExportDialog, QuickExportButtons, useExportManager, triggerDownload } from '../ExportUI';
import { PivotConfiguration, PivotDataSet } from '../types';

// Sample sales data for export demonstration
const sampleData: PivotDataSet = [
  { region: 'North', product: 'Widget A', quarter: 'Q1 2023', sales: 1000, quantity: 50, cost: 500 },
  { region: 'North', product: 'Widget A', quarter: 'Q2 2023', sales: 1200, quantity: 60, cost: 600 },
  { region: 'North', product: 'Widget A', quarter: 'Q3 2023', sales: 1100, quantity: 55, cost: 550 },
  { region: 'North', product: 'Widget A', quarter: 'Q4 2023', sales: 1300, quantity: 65, cost: 650 },
  { region: 'North', product: 'Widget B', quarter: 'Q1 2023', sales: 800, quantity: 40, cost: 400 },
  { region: 'North', product: 'Widget B', quarter: 'Q2 2023', sales: 900, quantity: 45, cost: 450 },
  { region: 'North', product: 'Widget B', quarter: 'Q3 2023', sales: 850, quantity: 43, cost: 425 },
  { region: 'North', product: 'Widget B', quarter: 'Q4 2023', sales: 950, quantity: 48, cost: 475 },

  { region: 'South', product: 'Widget A', quarter: 'Q1 2023', sales: 1500, quantity: 75, cost: 750 },
  { region: 'South', product: 'Widget A', quarter: 'Q2 2023', sales: 1300, quantity: 65, cost: 650 },
  { region: 'South', product: 'Widget A', quarter: 'Q3 2023', sales: 1400, quantity: 70, cost: 700 },
  { region: 'South', product: 'Widget A', quarter: 'Q4 2023', sales: 1600, quantity: 80, cost: 800 },
  { region: 'South', product: 'Widget B', quarter: 'Q1 2023', sales: 700, quantity: 35, cost: 350 },
  { region: 'South', product: 'Widget B', quarter: 'Q2 2023', sales: 750, quantity: 38, cost: 375 },
  { region: 'South', product: 'Widget B', quarter: 'Q3 2023', sales: 800, quantity: 40, cost: 400 },
  { region: 'South', product: 'Widget B', quarter: 'Q4 2023', sales: 850, quantity: 43, cost: 425 },

  { region: 'East', product: 'Widget A', quarter: 'Q1 2023', sales: 1100, quantity: 55, cost: 550 },
  { region: 'East', product: 'Widget A', quarter: 'Q2 2023', sales: 1250, quantity: 63, cost: 625 },
  { region: 'East', product: 'Widget A', quarter: 'Q3 2023', sales: 1200, quantity: 60, cost: 600 },
  { region: 'East', product: 'Widget A', quarter: 'Q4 2023', sales: 1350, quantity: 68, cost: 675 },
  { region: 'East', product: 'Widget B', quarter: 'Q1 2023', sales: 850, quantity: 43, cost: 425 },
  { region: 'East', product: 'Widget B', quarter: 'Q2 2023', sales: 920, quantity: 46, cost: 460 },
  { region: 'East', product: 'Widget B', quarter: 'Q3 2023', sales: 880, quantity: 44, cost: 440 },
  { region: 'East', product: 'Widget B', quarter: 'Q4 2023', sales: 980, quantity: 49, cost: 490 },

  { region: 'West', product: 'Widget A', quarter: 'Q1 2023', sales: 950, quantity: 48, cost: 475 },
  { region: 'West', product: 'Widget A', quarter: 'Q2 2023', sales: 1050, quantity: 53, cost: 525 },
  { region: 'West', product: 'Widget A', quarter: 'Q3 2023', sales: 1000, quantity: 50, cost: 500 },
  { region: 'West', product: 'Widget A', quarter: 'Q4 2023', sales: 1150, quantity: 58, cost: 575 },
  { region: 'West', product: 'Widget B', quarter: 'Q1 2023', sales: 600, quantity: 30, cost: 300 },
  { region: 'West', product: 'Widget B', quarter: 'Q2 2023', sales: 680, quantity: 34, cost: 340 },
  { region: 'West', product: 'Widget B', quarter: 'Q3 2023', sales: 650, quantity: 33, cost: 325 },
  { region: 'West', product: 'Widget B', quarter: 'Q4 2023', sales: 720, quantity: 36, cost: 360 },
];

// Default pivot configuration
const defaultConfiguration: PivotConfiguration = {
  rows: [
    { name: 'region', dataType: 'string' },
    { name: 'product', dataType: 'string' },
  ],
  columns: [
    { name: 'quarter', dataType: 'string' },
  ],
  values: [
    { name: 'sales', dataType: 'number', aggregation: 'sum' },
    { name: 'quantity', dataType: 'number', aggregation: 'sum' },
    { name: 'cost', dataType: 'number', aggregation: 'sum' },
  ],
  filters: [
    { name: 'sales', operator: 'greaterThan', value: 500 },
  ],
  options: {
    showGrandTotals: true,
    showSubtotals: true,
    computeMode: 'client',
  },
};

/** Example component demonstrating export functionality */
export const ExportExample: React.FC = () => {
  const [configuration, setConfiguration] = React.useState<PivotConfiguration>(defaultConfiguration);
  const [exportStats, setExportStats] = React.useState<{
    lastExport: string | null;
    totalExports: number;
    exportHistory: Array<{ format: string; timestamp: number; filename: string }>;
  }>({
    lastExport: null,
    totalExports: 0,
    exportHistory: [],
  });

  const handleExport = React.useCallback((options: any) => {
    const timestamp = Date.now();
    const exportInfo = {
      format: options.format,
      timestamp,
      filename: options.filename || 'pivot-export',
    };

    setExportStats(prev => ({
      lastExport: `${options.format.toUpperCase()} exported at ${new Date(timestamp).toLocaleTimeString()}`,
      totalExports: prev.totalExports + 1,
      exportHistory: [exportInfo, ...prev.exportHistory.slice(0, 9)], // Keep last 10
    }));

    console.log('Export triggered:', options);
  }, []);

  const handleConfigurationChange = React.useCallback((config: PivotConfiguration) => {
    setConfiguration(config);
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '100vw', height: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Pivot Table Export Functionality Example</h2>
        <p>
          This example demonstrates the comprehensive export functionality for pivot tables:
        </p>
        <ul>
          <li><strong>CSV Export:</strong> Comma-separated values with customizable delimiters</li>
          <li><strong>Excel Export:</strong> Microsoft Excel format with sheet customization</li>
          <li><strong>PDF Export:</strong> Print-ready documents with formatting and metadata</li>
          <li><strong>JSON Export:</strong> Complete data and configuration export for developers</li>
        </ul>
        <p>
          Use the export buttons in the pivot table or try the demonstration controls below.
        </p>
      </div>

      <PivotTable
        data={sampleData}
        configuration={configuration}
        onConfigurationChange={handleConfigurationChange}
        mode="client"
        showFieldSelector={true}
        showExportControls={true}
        enableDrillDown={true}
        fillContainer={false}
        maxHeight={500}
        onExport={handleExport}
        displayOptions={{
          showTooltips: true,
          showRowNumbers: false,
          showColumnLetters: false,
        }}
      />

      {/* Export Statistics */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Export Statistics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <strong>Total Exports:</strong> {exportStats.totalExports}
          </div>
          <div>
            <strong>Last Export:</strong> {exportStats.lastExport || 'None'}
          </div>
        </div>

        {exportStats.exportHistory.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0' }}>Recent Exports:</h5>
            <div style={{ fontSize: '13px' }}>
              {exportStats.exportHistory.map((exp, index) => (
                <div key={index} style={{
                  padding: '4px 8px',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f1f3f4',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    <strong>{exp.format.toUpperCase()}</strong> - {exp.filename}
                  </span>
                  <span style={{ color: '#6c757d' }}>
                    {new Date(exp.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Features Summary */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Export Features</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>📊 CSV Export</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Customizable delimiters (, ; tab)</li>
              <li>UTF-8 encoding support</li>
              <li>Optional quote escaping</li>
              <li>Filter metadata inclusion</li>
            </ul>
          </div>

          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>📈 Excel Export</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Custom sheet naming</li>
              <li>Data type preservation</li>
              <li>Freeze panes option</li>
              <li>Auto-filter support</li>
            </ul>
          </div>

          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>📄 PDF Export</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Portrait/landscape orientation</li>
              <li>Custom document titles</li>
              <li>Metadata inclusion</li>
              <li>Print-optimized formatting</li>
            </ul>
          </div>

          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>🔧 JSON Export</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Complete configuration export</li>
              <li>Computed data preservation</li>
              <li>Developer-friendly format</li>
              <li>Re-import capability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportExample;