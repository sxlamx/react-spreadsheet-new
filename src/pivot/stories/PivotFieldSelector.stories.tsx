import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PivotFieldSelector } from '../PivotFieldSelector';
import { PivotConfiguration, PivotField } from '../types';

const availableFields: PivotField[] = [
  { name: 'region', dataType: 'string' },
  { name: 'product', dataType: 'string' },
  { name: 'category', dataType: 'string' },
  { name: 'quarter', dataType: 'string' },
  { name: 'month', dataType: 'string' },
  { name: 'sales', dataType: 'number' },
  { name: 'quantity', dataType: 'number' },
  { name: 'cost', dataType: 'number' },
  { name: 'profit', dataType: 'number' },
  { name: 'discount', dataType: 'number' },
  { name: 'date', dataType: 'date' },
  { name: 'active', dataType: 'boolean' },
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
  filters: [
    { name: 'sales', operator: 'greaterThan', value: 1000 },
  ],
  options: {
    showGrandTotals: true,
    showSubtotals: true,
    computeMode: 'client',
  },
};

const meta: Meta<typeof PivotFieldSelector> = {
  title: 'Pivot/PivotFieldSelector',
  component: PivotFieldSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
The PivotFieldSelector component provides an intuitive drag-and-drop interface for configuring pivot tables:

- **Drag-and-Drop**: HTML5 drag-and-drop for easy field arrangement
- **Field Categories**: Separate areas for rows, columns, values, and filters
- **Aggregation Selection**: Choose from sum, count, avg, min, max, countDistinct
- **Filter Configuration**: Set up field filters with various operators
- **Visual Feedback**: Clear indicators for drop zones and field states
- **Accessibility**: Full keyboard navigation and screen reader support

## Features

### Drop Zones
- **Rows**: Fields that create row groupings
- **Columns**: Fields that create column groupings
- **Values**: Numeric fields with aggregation functions
- **Filters**: Fields that filter the dataset

### Aggregation Functions
- Sum, Count, Average, Min, Max, Count Distinct

### Filter Operators
- Equals, Not Equals, Contains, Greater Than, Less Than, Between, In, etc.
        `,
      },
    },
  },
  argTypes: {
    availableFields: {
      description: 'Array of available fields that can be dragged into the pivot configuration',
      control: false,
    },
    configuration: {
      description: 'Current pivot configuration',
      control: false,
    },
    onChange: {
      description: 'Callback function called when configuration changes',
      action: 'configuration changed',
    },
    readOnly: {
      description: 'Whether the field selector is in read-only mode',
      control: 'boolean',
    },
    compact: {
      description: 'Use compact layout for smaller spaces',
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '600px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PivotFieldSelector>;

// Interactive story with state management
const InteractiveTemplate = (args: any) => {
  const [configuration, setConfiguration] = useState<PivotConfiguration>(args.configuration);

  return (
    <div>
      <PivotFieldSelector
        {...args}
        configuration={configuration}
        onChange={setConfiguration}
      />

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Current Configuration:</h4>
        <pre style={{
          margin: 0,
          fontSize: '12px',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(configuration, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export const Default: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: defaultConfiguration,
    readOnly: false,
    compact: false,
  },
};

export const EmptyConfiguration: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: {
      rows: [],
      columns: [],
      values: [],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
    readOnly: false,
    compact: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Field selector starting with empty configuration - all fields available to drag.',
      },
    },
  },
};

export const ReadOnlyMode: Story = {
  args: {
    availableFields,
    configuration: defaultConfiguration,
    readOnly: true,
    compact: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Field selector in read-only mode - configuration cannot be changed.',
      },
    },
  },
};

export const CompactLayout: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: defaultConfiguration,
    readOnly: false,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact layout suitable for smaller spaces or mobile devices.',
      },
    },
  },
};

export const LimitedFields: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields: [
      { name: 'region', dataType: 'string' },
      { name: 'product', dataType: 'string' },
      { name: 'sales', dataType: 'number' },
      { name: 'quantity', dataType: 'number' },
    ],
    configuration: {
      rows: [],
      columns: [],
      values: [],
      filters: [],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
    readOnly: false,
    compact: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Field selector with a limited set of available fields.',
      },
    },
  },
};

export const ComplexConfiguration: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: {
      rows: [
        { name: 'region', dataType: 'string' },
        { name: 'product', dataType: 'string' },
        { name: 'category', dataType: 'string' },
      ],
      columns: [
        { name: 'quarter', dataType: 'string' },
        { name: 'month', dataType: 'string' },
      ],
      values: [
        { name: 'sales', dataType: 'number', aggregation: 'sum' },
        { name: 'sales', dataType: 'number', aggregation: 'avg' },
        { name: 'quantity', dataType: 'number', aggregation: 'sum' },
        { name: 'cost', dataType: 'number', aggregation: 'min' },
        { name: 'profit', dataType: 'number', aggregation: 'max' },
      ],
      filters: [
        { name: 'sales', operator: 'greaterThan', value: 500 },
        { name: 'region', operator: 'in', value: ['North', 'South'] },
        { name: 'active', operator: 'equals', value: true },
      ],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
    readOnly: false,
    compact: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex configuration with multiple fields in each category and various aggregations.',
      },
    },
  },
};

export const DifferentDataTypes: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields: [
      { name: 'category', dataType: 'string' },
      { name: 'subcategory', dataType: 'string' },
      { name: 'revenue', dataType: 'number' },
      { name: 'units', dataType: 'number' },
      { name: 'margin', dataType: 'number' },
      { name: 'launch_date', dataType: 'date' },
      { name: 'end_date', dataType: 'date' },
      { name: 'is_active', dataType: 'boolean' },
      { name: 'is_featured', dataType: 'boolean' },
    ],
    configuration: {
      rows: [
        { name: 'category', dataType: 'string' },
      ],
      columns: [
        { name: 'is_active', dataType: 'boolean' },
      ],
      values: [
        { name: 'revenue', dataType: 'number', aggregation: 'sum' },
        { name: 'units', dataType: 'number', aggregation: 'count' },
      ],
      filters: [
        { name: 'launch_date', operator: 'greaterThan', value: '2023-01-01' },
        { name: 'is_featured', operator: 'equals', value: true },
      ],
      options: {
        showGrandTotals: true,
        showSubtotals: true,
        computeMode: 'client',
      },
    },
    readOnly: false,
    compact: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Configuration with different data types (string, number, date, boolean) to showcase type-specific handling.',
      },
    },
  },
};

export const DarkMode: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: defaultConfiguration,
    readOnly: false,
    compact: false,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Field selector with dark mode styling.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="Spreadsheet--dark-mode" style={{ minHeight: '600px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ResponsiveMobile: Story = {
  render: InteractiveTemplate,
  args: {
    availableFields,
    configuration: defaultConfiguration,
    readOnly: false,
    compact: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Field selector optimized for mobile devices with compact layout.',
      },
    },
  },
};