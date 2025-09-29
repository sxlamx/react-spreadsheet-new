import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ExportDialog, ExportButton, QuickExportButtons } from '../ExportUI';
import { PivotStructure, PivotConfiguration } from '../types';

// Sample pivot data for export demonstrations
const samplePivotData: PivotStructure = {
  rowCount: 6,
  columnCount: 4,
  rowHeaders: [
    [
      { value: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['North', 'Widget A'] }
    ],
    [
      { value: 'North', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['North'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['North', 'Widget B'] }
    ],
    [
      { value: 'South', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['South'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['South', 'Widget A'] }
    ],
    [
      { value: 'South', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['South'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['South', 'Widget B'] }
    ],
    [
      { value: 'East', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['East'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['East', 'Widget A'] }
    ],
    [
      { value: 'East', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['East'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['East', 'Widget B'] }
    ],
  ],
  columnHeaders: [
    [
      { value: 'Q1 Sales', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q1', 'Sales'] },
      { value: 'Q2 Sales', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q2', 'Sales'] },
      { value: 'Q3 Sales', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q3', 'Sales'] },
      { value: 'Q4 Sales', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q4', 'Sales'] },
    ]
  ],
  matrix: [
    [
      { value: 1000, formattedValue: '$1,000', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1200, formattedValue: '$1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1100, formattedValue: '$1,100', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1300, formattedValue: '$1,300', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
    [
      { value: 800, formattedValue: '$800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 900, formattedValue: '$900', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 850, formattedValue: '$850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 950, formattedValue: '$950', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
    [
      { value: 1500, formattedValue: '$1,500', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1300, formattedValue: '$1,300', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1400, formattedValue: '$1,400', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1600, formattedValue: '$1,600', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
    [
      { value: 700, formattedValue: '$700', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 750, formattedValue: '$750', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 800, formattedValue: '$800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 850, formattedValue: '$850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
    [
      { value: 1100, formattedValue: '$1,100', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1250, formattedValue: '$1,250', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1200, formattedValue: '$1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 1350, formattedValue: '$1,350', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
    [
      { value: 850, formattedValue: '$850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 920, formattedValue: '$920', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 880, formattedValue: '$880', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
      { value: 980, formattedValue: '$980', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: [] },
    ],
  ],
};

const sampleConfiguration: PivotConfiguration = {
  rows: [
    { name: 'region', dataType: 'string' },
    { name: 'product', dataType: 'string' },
  ],
  columns: [
    { name: 'quarter', dataType: 'string' },
  ],
  values: [
    { name: 'sales', dataType: 'number', aggregation: 'sum' },
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

const meta: Meta<typeof ExportDialog> = {
  title: 'Pivot/Export',
  component: ExportDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The Export UI components provide a comprehensive interface for exporting pivot table data in multiple formats:

- **ExportDialog**: Full-featured modal with format selection and options
- **ExportButton**: Simple button that opens the export dialog
- **QuickExportButtons**: One-click export buttons for common formats

## Supported Formats

### CSV (Comma-Separated Values)
- Customizable delimiters (comma, semicolon, tab)
- UTF-8 encoding support
- Optional quote escaping
- Widely compatible with spreadsheet applications

### Excel
- Microsoft Excel format (.xls)
- Custom sheet naming
- Data type preservation
- Compatible with Excel and similar applications

### PDF
- Print-ready document format
- Portrait or landscape orientation
- Custom titles and metadata
- Formatted tables with styling

### JSON
- Complete data and configuration export
- Developer-friendly format
- Supports re-importing configurations
- Includes metadata and timestamps

## Features

- **Format-specific Options**: Each format has customizable export settings
- **Preview Support**: See what will be exported before downloading
- **Batch Export**: Export multiple formats simultaneously
- **Progress Tracking**: Real-time export progress monitoring
- **Error Handling**: Comprehensive error reporting and recovery
        `,
      },
    },
  },
  argTypes: {
    isOpen: {
      description: 'Whether the export dialog is open',
      control: 'boolean',
    },
    pivotData: {
      description: 'Pivot table data to export',
      control: false,
    },
    configuration: {
      description: 'Pivot table configuration',
      control: false,
    },
    onClose: {
      description: 'Callback when dialog is closed',
      action: 'dialog closed',
    },
    onExport: {
      description: 'Callback when export is triggered',
      action: 'export triggered',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ExportDialog>;

export const ExportDialogDefault: Story = {
  args: {
    isOpen: true,
    pivotData: samplePivotData,
    configuration: sampleConfiguration,
  },
};

export const ExportDialogClosed: Story = {
  args: {
    isOpen: false,
    pivotData: samplePivotData,
    configuration: sampleConfiguration,
  },
  parameters: {
    docs: {
      description: {
        story: 'Export dialog in closed state.',
      },
    },
  },
};

// Export Button Stories
const ExportButtonMeta: Meta<typeof ExportButton> = {
  title: 'Pivot/Export/ExportButton',
  component: ExportButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Simple export button that opens the full export dialog when clicked.',
      },
    },
  },
  argTypes: {
    pivotData: {
      description: 'Pivot table data to export',
      control: false,
    },
    configuration: {
      description: 'Pivot table configuration',
      control: false,
    },
    onExport: {
      description: 'Callback when export is triggered',
      action: 'export triggered',
    },
    children: {
      description: 'Button content',
      control: 'text',
    },
  },
};

type ExportButtonStory = StoryObj<typeof ExportButton>;

export const ButtonDefault: ExportButtonStory = {
  ...ExportButtonMeta,
  args: {
    pivotData: samplePivotData,
    configuration: sampleConfiguration,
  },
};

export const ButtonCustomText: ExportButtonStory = {
  ...ExportButtonMeta,
  args: {
    pivotData: samplePivotData,
    configuration: sampleConfiguration,
    children: 'Download Data',
  },
  parameters: {
    docs: {
      description: {
        story: 'Export button with custom text.',
      },
    },
  },
};

// Quick Export Buttons Stories
const QuickExportMeta: Meta<typeof QuickExportButtons> = {
  title: 'Pivot/Export/QuickExportButtons',
  component: QuickExportButtons,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Quick export buttons for one-click exports in common formats.',
      },
    },
  },
  argTypes: {
    pivotData: {
      description: 'Pivot table data to export',
      control: false,
    },
    configuration: {
      description: 'Pivot table configuration',
      control: false,
    },
    onExport: {
      description: 'Callback when export is triggered',
      action: 'export triggered',
    },
  },
};

type QuickExportStory = StoryObj<typeof QuickExportButtons>;

export const QuickButtonsDefault: QuickExportStory = {
  ...QuickExportMeta,
  args: {
    pivotData: samplePivotData,
    configuration: sampleConfiguration,
  },
};

// Interactive Demo
const ExportDemo = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    format: string;
    filename: string;
    timestamp: number;
  }>>([]);

  const handleExport = (options: any) => {
    const exportInfo = {
      format: options.format?.toUpperCase() || 'UNKNOWN',
      filename: options.filename || 'pivot-export',
      timestamp: Date.now(),
    };

    setExportHistory(prev => [exportInfo, ...prev.slice(0, 9)]); // Keep last 10
    console.log('Export triggered:', options);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h3>Export Functionality Demo</h3>
      <p>Try the different export options and see the simulated export history below.</p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <QuickExportButtons
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          onExport={handleExport}
        />

        <ExportButton
          pivotData={samplePivotData}
          configuration={sampleConfiguration}
          onExport={handleExport}
        >
          📤 Advanced Export
        </ExportButton>

        <button
          onClick={() => setShowDialog(true)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          🔧 Show Dialog Directly
        </button>
      </div>

      {exportHistory.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          border: '1px solid #bbdefb'
        }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Export History</h4>
          <div style={{ fontSize: '14px' }}>
            {exportHistory.map((exp, index) => (
              <div key={index} style={{
                padding: '8px',
                backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                borderRadius: '3px',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  <strong>{exp.format}</strong> - {exp.filename}
                </span>
                <span style={{ color: '#6c757d', fontSize: '12px' }}>
                  {new Date(exp.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setExportHistory([])}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Clear History
          </button>
        </div>
      )}

      <ExportDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        pivotData={samplePivotData}
        configuration={sampleConfiguration}
        onExport={handleExport}
      />
    </div>
  );
};

export const InteractiveDemo: Story = {
  render: ExportDemo,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing all export components working together with simulated export history.',
      },
    },
  },
};

// Responsive Mobile Demo
export const ResponsiveMobile: Story = {
  render: ExportDemo,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Export components optimized for mobile devices.',
      },
    },
  },
};

// Dark Mode Demo
export const DarkMode: Story = {
  render: () => (
    <div className="Spreadsheet--dark-mode">
      <ExportDemo />
    </div>
  ),
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Export components with dark mode styling.',
      },
    },
  },
};

// Large Dataset Demo
const LargeDatasetDemo = () => {
  // Generate larger dataset for demonstration
  const largePivotData: PivotStructure = {
    ...samplePivotData,
    rowCount: 1000,
    columnCount: 50,
  };

  const largeConfiguration: PivotConfiguration = {
    ...sampleConfiguration,
    rows: [
      { name: 'region', dataType: 'string' },
      { name: 'product', dataType: 'string' },
      { name: 'category', dataType: 'string' },
      { name: 'subcategory', dataType: 'string' },
    ],
    columns: [
      { name: 'quarter', dataType: 'string' },
      { name: 'month', dataType: 'string' },
    ],
    values: [
      { name: 'sales', dataType: 'number', aggregation: 'sum' },
      { name: 'quantity', dataType: 'number', aggregation: 'sum' },
      { name: 'profit', dataType: 'number', aggregation: 'avg' },
    ],
    filters: [
      { name: 'sales', operator: 'greaterThan', value: 1000 },
      { name: 'region', operator: 'in', value: ['North', 'South', 'East'] },
    ],
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Large Dataset Export Demo</h3>
      <p>
        This demo simulates exporting a large pivot table with 1,000 rows and 50 columns
        (50,000 cells total) to test export performance and file size handling.
      </p>

      <div style={{
        padding: '16px',
        backgroundColor: '#fff3cd',
        borderRadius: '4px',
        border: '1px solid #ffeaa7',
        marginBottom: '20px'
      }}>
        <strong>Dataset Info:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Rows: {largePivotData.rowCount.toLocaleString()}</li>
          <li>Columns: {largePivotData.columnCount}</li>
          <li>Total Cells: {(largePivotData.rowCount * largePivotData.columnCount).toLocaleString()}</li>
          <li>Hierarchical Levels: 4 row levels, 2 column levels</li>
          <li>Value Fields: 3 (Sales, Quantity, Profit)</li>
          <li>Active Filters: 2</li>
        </ul>
      </div>

      <ExportDialog
        isOpen={true}
        onClose={() => {}}
        pivotData={largePivotData}
        configuration={largeConfiguration}
        onExport={(options) => console.log('Large dataset export:', options)}
      />
    </div>
  );
};

export const LargeDataset: Story = {
  render: LargeDatasetDemo,
  parameters: {
    docs: {
      description: {
        story: 'Export dialog with large dataset simulation to demonstrate performance with complex pivot tables.',
      },
    },
  },
};