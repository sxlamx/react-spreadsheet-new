import * as React from 'react';
import { PivotTableWithConfiguration } from '../PivotTableWithConfiguration';
import { PivotConfiguration, PivotDataSet } from '../types';

// Sample sales data
const sampleData: PivotDataSet = [
  { region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: 50 },
  { region: 'North', product: 'Widget A', quarter: 'Q2', sales: 1200, quantity: 60 },
  { region: 'North', product: 'Widget B', quarter: 'Q1', sales: 800, quantity: 40 },
  { region: 'North', product: 'Widget B', quarter: 'Q2', sales: 900, quantity: 45 },
  { region: 'South', product: 'Widget A', quarter: 'Q1', sales: 1500, quantity: 75 },
  { region: 'South', product: 'Widget A', quarter: 'Q2', sales: 1300, quantity: 65 },
  { region: 'South', product: 'Widget B', quarter: 'Q1', sales: 700, quantity: 35 },
  { region: 'South', product: 'Widget B', quarter: 'Q2', sales: 750, quantity: 38 },
  { region: 'East', product: 'Widget A', quarter: 'Q1', sales: 1100, quantity: 55 },
  { region: 'East', product: 'Widget A', quarter: 'Q2', sales: 1250, quantity: 63 },
  { region: 'East', product: 'Widget B', quarter: 'Q1', sales: 850, quantity: 43 },
  { region: 'East', product: 'Widget B', quarter: 'Q2', sales: 920, quantity: 46 },
  { region: 'West', product: 'Widget A', quarter: 'Q1', sales: 950, quantity: 48 },
  { region: 'West', product: 'Widget A', quarter: 'Q2', sales: 1050, quantity: 53 },
  { region: 'West', product: 'Widget B', quarter: 'Q1', sales: 600, quantity: 30 },
  { region: 'West', product: 'Widget B', quarter: 'Q2', sales: 680, quantity: 34 },
];

// Default configuration
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
  ],
  filters: [],
  options: {
    showGrandTotals: true,
    showSubtotals: true,
    computeMode: 'client',
  },
};

/** Example component demonstrating configuration management */
export const ConfigurationManagementExample: React.FC = () => {
  const [currentConfig, setCurrentConfig] = React.useState<PivotConfiguration>(defaultConfiguration);

  const handleConfigurationChange = React.useCallback((config: PivotConfiguration) => {
    setCurrentConfig(config);
    console.log('Configuration changed:', config);
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '100vw', height: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Pivot Table Configuration Management Example</h2>
        <p>
          This example demonstrates the configuration management features:
        </p>
        <ul>
          <li><strong>Save/Load:</strong> Save configurations with names, descriptions, and tags</li>
          <li><strong>Import/Export:</strong> Share configurations via JSON files</li>
          <li><strong>History:</strong> Undo/redo configuration changes</li>
          <li><strong>Browser:</strong> Browse and manage saved configurations</li>
          <li><strong>Auto-save:</strong> Automatically save changes (can be enabled)</li>
        </ul>
        <p>
          Try modifying the field configuration, then use the toolbar to save, load, or manage configurations.
        </p>
      </div>

      <PivotTableWithConfiguration
        data={sampleData}
        initialConfiguration={defaultConfiguration}
        mode="client"
        showFieldSelector={true}
        showExportControls={false}
        showConfigurationToolbar={true}
        enableDrillDown={true}
        fillContainer={false}
        maxHeight={600}
        onConfigurationChange={handleConfigurationChange}
        configurationStorage={{
          type: 'localStorage',
          keyPrefix: 'pivot-example-',
        }}
        configurationOptions={{
          maxHistorySize: 20,
          autoSave: false, // Set to true to enable auto-save
          autoSaveDelay: 2000,
          validateOnChange: true,
        }}
        displayOptions={{
          showTooltips: true,
          showRowNumbers: false,
          showColumnLetters: false,
        }}
      />

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Current Configuration Summary:</h4>
        <p>
          <strong>Rows:</strong> {currentConfig.rows.map(r => r.name).join(', ') || 'None'}<br />
          <strong>Columns:</strong> {currentConfig.columns.map(c => c.name).join(', ') || 'None'}<br />
          <strong>Values:</strong> {currentConfig.values.map(v => `${v.name} (${v.aggregation})`).join(', ') || 'None'}<br />
          <strong>Filters:</strong> {currentConfig.filters.length > 0
            ? currentConfig.filters.map(f => `${f.name} ${f.operator || 'equals'} ${f.value || ''}`).join(', ')
            : 'None'
          }
        </p>
      </div>
    </div>
  );
};

export default ConfigurationManagementExample;