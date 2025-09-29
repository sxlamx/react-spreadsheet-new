import type { Meta, StoryObj } from '@storybook/react';
import { PivotTable } from '../PivotTable';
import { PivotConfiguration, PivotDataSet } from '../types';

// Sample data for stories
const sampleData: PivotDataSet = [
  { region: 'North', product: 'Widget A', quarter: 'Q1', sales: 1000, quantity: 50, cost: 500 },
  { region: 'North', product: 'Widget A', quarter: 'Q2', sales: 1200, quantity: 60, cost: 600 },
  { region: 'North', product: 'Widget B', quarter: 'Q1', sales: 800, quantity: 40, cost: 400 },
  { region: 'North', product: 'Widget B', quarter: 'Q2', sales: 900, quantity: 45, cost: 450 },
  { region: 'South', product: 'Widget A', quarter: 'Q1', sales: 1500, quantity: 75, cost: 750 },
  { region: 'South', product: 'Widget A', quarter: 'Q2', sales: 1300, quantity: 65, cost: 650 },
  { region: 'South', product: 'Widget B', quarter: 'Q1', sales: 700, quantity: 35, cost: 350 },
  { region: 'South', product: 'Widget B', quarter: 'Q2', sales: 750, quantity: 38, cost: 375 },
  { region: 'East', product: 'Widget A', quarter: 'Q1', sales: 1100, quantity: 55, cost: 550 },
  { region: 'East', product: 'Widget A', quarter: 'Q2', sales: 1250, quantity: 63, cost: 625 },
  { region: 'East', product: 'Widget B', quarter: 'Q1', sales: 850, quantity: 43, cost: 425 },
  { region: 'East', product: 'Widget B', quarter: 'Q2', sales: 920, quantity: 46, cost: 460 },
];

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

const meta: Meta<typeof PivotTable> = {
  title: 'Pivot/PivotTable',
  component: PivotTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The PivotTable component provides a comprehensive multi-dimensional data analysis tool with the following features:

- **Multi-dimensional Analysis**: Organize data by rows, columns, and values
- **Interactive Configuration**: Drag-and-drop field selector
- **Drill-down Capabilities**: Expand and collapse hierarchical data
- **Export Functionality**: Export to CSV, Excel, PDF, and JSON formats
- **Performance Optimization**: Caching, virtualization, and monitoring
- **State Management**: Save and load pivot configurations
- **Responsive Design**: Works on desktop and mobile devices

## Basic Usage

\`\`\`tsx
import { PivotTable } from '@/pivot';

<PivotTable
  data={yourData}
  configuration={yourConfiguration}
  onConfigurationChange={handleConfigChange}
  mode="client"
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    data: {
      description: 'Array of data objects to be analyzed',
      control: false,
    },
    configuration: {
      description: 'Pivot table configuration object',
      control: false,
    },
    mode: {
      description: 'Computation mode: client-side or server-side',
      control: 'select',
      options: ['client', 'server', 'hybrid'],
    },
    showFieldSelector: {
      description: 'Whether to show the field selector interface',
      control: 'boolean',
    },
    showExportControls: {
      description: 'Whether to show export controls',
      control: 'boolean',
    },
    enableDrillDown: {
      description: 'Enable drill-down functionality',
      control: 'boolean',
    },
    maxHeight: {
      description: 'Maximum height of the table in pixels',
      control: 'number',
    },
    fillContainer: {
      description: 'Whether the table should fill its container',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PivotTable>;

export const Default: Story = {
  args: {
    data: sampleData,
    configuration: defaultConfiguration,
    onConfigurationChange: (config) => console.log('Configuration changed:', config),
    mode: 'client',
    showFieldSelector: true,
    showExportControls: true,
    enableDrillDown: true,
    maxHeight: 600,
    fillContainer: false,
  },
};

export const WithoutFieldSelector: Story = {
  args: {
    ...Default.args,
    showFieldSelector: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable without the field selector, showing only the computed pivot data.',
      },
    },
  },
};

export const CompactMode: Story = {
  args: {
    ...Default.args,
    maxHeight: 400,
    showFieldSelector: false,
    showExportControls: false,
    configuration: {
      ...defaultConfiguration,
      options: {
        ...defaultConfiguration.options,
        showSubtotals: false,
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact mode with reduced height and hidden controls, ideal for dashboards.',
      },
    },
  },
};

export const SingleValue: Story = {
  args: {
    ...Default.args,
    configuration: {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: false,
        computeMode: 'client',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple pivot table with single value field for basic analysis.',
      },
    },
  },
};

export const WithFilters: Story = {
  args: {
    ...Default.args,
    configuration: {
      ...defaultConfiguration,
      filters: [
        { name: 'sales', operator: 'greaterThan', value: 1000 },
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable with filters applied to show only high-value sales.',
      },
    },
  },
};

export const MultipleAggregations: Story = {
  args: {
    ...Default.args,
    configuration: {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'product', dataType: 'string' }],
      values: [
        { name: 'sales', dataType: 'number', aggregation: 'sum' },
        { name: 'sales', dataType: 'number', aggregation: 'avg' },
        { name: 'quantity', dataType: 'number', aggregation: 'count' },
        { name: 'cost', dataType: 'number', aggregation: 'min' },
        { name: 'cost', dataType: 'number', aggregation: 'max' },
      ],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Advanced pivot table showing multiple aggregation functions for comprehensive analysis.',
      },
    },
  },
};

export const ThreeLevelHierarchy: Story = {
  args: {
    ...Default.args,
    data: [
      ...sampleData,
      { region: 'North', product: 'Widget A', quarter: 'Q3', category: 'Premium', sales: 1300, quantity: 65, cost: 650 },
      { region: 'North', product: 'Widget A', quarter: 'Q4', category: 'Premium', sales: 1400, quantity: 70, cost: 700 },
      { region: 'North', product: 'Widget B', quarter: 'Q3', category: 'Standard', sales: 950, quantity: 48, cost: 475 },
      { region: 'North', product: 'Widget B', quarter: 'Q4', category: 'Standard', sales: 1000, quantity: 50, cost: 500 },
      { region: 'South', product: 'Widget A', quarter: 'Q3', category: 'Premium', sales: 1600, quantity: 80, cost: 800 },
      { region: 'South', product: 'Widget A', quarter: 'Q4', category: 'Premium', sales: 1700, quantity: 85, cost: 850 },
      { region: 'South', product: 'Widget B', quarter: 'Q3', category: 'Standard', sales: 800, quantity: 40, cost: 400 },
      { region: 'South', product: 'Widget B', quarter: 'Q4', category: 'Standard', sales: 850, quantity: 43, cost: 425 },
    ],
    configuration: {
      rows: [
        { name: 'region', dataType: 'string' },
        { name: 'product', dataType: 'string' },
        { name: 'category', dataType: 'string' },
      ],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Three-level hierarchy showing drill-down capabilities with nested row groupings.',
      },
    },
  },
};

export const ResponsiveDesign: Story = {
  args: {
    ...Default.args,
    fillContainer: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'PivotTable in responsive mode, adapting to mobile screen sizes.',
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    ...Default.args,
    className: 'Spreadsheet--dark-mode',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'PivotTable with dark mode styling for better visibility in dark interfaces.',
      },
    },
  },
};

export const LoadingState: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable showing loading state while data is being processed.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    ...Default.args,
    error: 'Failed to load pivot data. Please check your data source and try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable displaying an error state when data loading fails.',
      },
    },
  },
};

export const EmptyData: Story = {
  args: {
    ...Default.args,
    data: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable with empty data set, showing the empty state message.',
      },
    },
  },
};

export const CustomDisplayOptions: Story = {
  args: {
    ...Default.args,
    displayOptions: {
      showTooltips: true,
      showRowNumbers: true,
      showColumnLetters: true,
      customClasses: {
        table: ['custom-pivot-table'],
        cell: ['custom-cell'],
        header: ['custom-header'],
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'PivotTable with custom display options including tooltips and row/column indicators.',
      },
    },
  },
};