import type { Meta, StoryObj } from '@storybook/react';
import { VirtualizedPivotTable } from '../VirtualizedPivotTable';
import { PivotStructure, PivotCell, PivotHeader } from '../types';

// Generate large dataset for virtualization demonstration
const generateLargeDataset = (rows: number, cols: number): PivotStructure => {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const products = ['Widget A', 'Widget B', 'Widget C', 'Gadget X', 'Gadget Y'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Generate row headers
  const rowHeaders: PivotHeader[][] = [];
  for (let i = 0; i < rows; i++) {
    const region = regions[i % regions.length];
    const product = products[Math.floor(i / regions.length) % products.length];
    rowHeaders.push([
      { value: region, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [region] },
      { value: product, span: 1, level: 1, isExpandable: false, isExpanded: false, path: [region, product] }
    ]);
  }

  // Generate column headers
  const columnHeaders: PivotHeader[][] = [
    quarters.map((quarter, index) => ({
      value: quarter,
      span: Math.floor(cols / quarters.length),
      level: 0,
      isExpandable: false,
      isExpanded: false,
      path: [quarter]
    }))
  ];

  // Generate matrix data
  const matrix: (PivotCell | null)[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowData: (PivotCell | null)[] = [];
    for (let col = 0; col < cols; col++) {
      const value = Math.floor(Math.random() * 10000) + 1000;
      rowData.push({
        value,
        formattedValue: value.toLocaleString(),
        type: 'data',
        level: 0,
        isExpandable: false,
        isExpanded: false,
        path: [rowHeaders[row][0].value, rowHeaders[row][1].value, quarters[col % quarters.length]]
      });
    }
    matrix.push(rowData);
  }

  return {
    rowCount: rows,
    columnCount: cols,
    rowHeaders,
    columnHeaders,
    matrix,
  };
};

// Sample small dataset
const smallDataset: PivotStructure = {
  rowCount: 6,
  columnCount: 4,
  rowHeaders: [
    [
      { value: 'North', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['North'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['North', 'Widget A'] }
    ],
    [
      { value: 'North', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['North'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['North', 'Widget B'] }
    ],
    [
      { value: 'South', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['South'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['South', 'Widget A'] }
    ],
    [
      { value: 'South', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['South'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['South', 'Widget B'] }
    ],
    [
      { value: 'East', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['East'] },
      { value: 'Widget A', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['East', 'Widget A'] }
    ],
    [
      { value: 'East', span: 1, level: 0, isExpandable: true, isExpanded: true, path: ['East'] },
      { value: 'Widget B', span: 1, level: 1, isExpandable: false, isExpanded: false, path: ['East', 'Widget B'] }
    ],
  ],
  columnHeaders: [
    [
      { value: 'Q1', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q1'] },
      { value: 'Q2', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q2'] },
      { value: 'Q3', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q3'] },
      { value: 'Q4', span: 1, level: 0, isExpandable: false, isExpanded: false, path: ['Q4'] },
    ]
  ],
  matrix: [
    [
      { value: 1000, formattedValue: '1,000', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget A', 'Q1'] },
      { value: 1200, formattedValue: '1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget A', 'Q2'] },
      { value: 1100, formattedValue: '1,100', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget A', 'Q3'] },
      { value: 1300, formattedValue: '1,300', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget A', 'Q4'] },
    ],
    [
      { value: 800, formattedValue: '800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget B', 'Q1'] },
      { value: 900, formattedValue: '900', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget B', 'Q2'] },
      { value: 850, formattedValue: '850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget B', 'Q3'] },
      { value: 950, formattedValue: '950', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['North', 'Widget B', 'Q4'] },
    ],
    [
      { value: 1500, formattedValue: '1,500', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget A', 'Q1'] },
      { value: 1300, formattedValue: '1,300', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget A', 'Q2'] },
      { value: 1400, formattedValue: '1,400', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget A', 'Q3'] },
      { value: 1600, formattedValue: '1,600', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget A', 'Q4'] },
    ],
    [
      { value: 700, formattedValue: '700', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget B', 'Q1'] },
      { value: 750, formattedValue: '750', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget B', 'Q2'] },
      { value: 800, formattedValue: '800', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget B', 'Q3'] },
      { value: 850, formattedValue: '850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['South', 'Widget B', 'Q4'] },
    ],
    [
      { value: 1100, formattedValue: '1,100', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget A', 'Q1'] },
      { value: 1250, formattedValue: '1,250', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget A', 'Q2'] },
      { value: 1200, formattedValue: '1,200', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget A', 'Q3'] },
      { value: 1350, formattedValue: '1,350', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget A', 'Q4'] },
    ],
    [
      { value: 850, formattedValue: '850', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget B', 'Q1'] },
      { value: 920, formattedValue: '920', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget B', 'Q2'] },
      { value: 880, formattedValue: '880', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget B', 'Q3'] },
      { value: 980, formattedValue: '980', type: 'data', level: 0, isExpandable: false, isExpanded: false, path: ['East', 'Widget B', 'Q4'] },
    ],
  ],
};

const meta: Meta<typeof VirtualizedPivotTable> = {
  title: 'Pivot/VirtualizedPivotTable',
  component: VirtualizedPivotTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The VirtualizedPivotTable component provides high-performance rendering for large pivot datasets using virtualization:

- **Virtual Scrolling**: Only renders visible rows and columns for optimal performance
- **Smooth Scrolling**: Efficient scroll handling with configurable buffer zones
- **Memory Efficient**: Minimal memory footprint even with millions of data points
- **Customizable Dimensions**: Configurable row heights, column widths, and buffer sizes
- **Interactive Features**: Click handlers, hover states, and keyboard navigation
- **Performance Monitoring**: Built-in render time tracking and optimization

## Performance Benefits

### Virtual Scrolling
- Renders only visible items plus a small buffer
- Handles datasets with millions of rows efficiently
- Maintains smooth 60fps scrolling performance

### Memory Optimization
- Constant memory usage regardless of dataset size
- Automatic cleanup of off-screen elements
- Efficient DOM manipulation and recycling

### Customization
- Configurable row heights and column widths
- Custom cell and header renderers
- Flexible styling and theming support
        `,
      },
    },
  },
  argTypes: {
    pivotData: {
      description: 'Pivot data structure containing headers and matrix data',
      control: false,
    },
    height: {
      description: 'Container height in pixels',
      control: 'number',
    },
    width: {
      description: 'Container width in pixels',
      control: 'number',
    },
    rowHeight: {
      description: 'Height of each row in pixels',
      control: 'number',
    },
    columnWidth: {
      description: 'Width of each column in pixels',
      control: 'number',
    },
    headerHeight: {
      description: 'Height of header rows in pixels',
      control: 'number',
    },
    bufferSize: {
      description: 'Number of rows to render outside visible area',
      control: 'number',
    },
    showRowHeaders: {
      description: 'Whether to show row headers',
      control: 'boolean',
    },
    showColumnHeaders: {
      description: 'Whether to show column headers',
      control: 'boolean',
    },
    onCellClick: {
      description: 'Callback when a cell is clicked',
      action: 'cell clicked',
    },
    onHeaderClick: {
      description: 'Callback when a header is clicked',
      action: 'header clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof VirtualizedPivotTable>;

export const Default: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 10,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
};

export const LargeDataset: Story = {
  args: {
    pivotData: generateLargeDataset(10000, 20),
    height: 600,
    width: 1000,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 20,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Virtualized table with 10,000 rows demonstrating performance with large datasets.',
      },
    },
  },
};

export const ExtremeDataset: Story = {
  args: {
    pivotData: generateLargeDataset(100000, 50),
    height: 600,
    width: 1200,
    rowHeight: 28,
    columnWidth: 100,
    headerHeight: 28,
    bufferSize: 50,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Extreme performance test with 100,000 rows and 50 columns.',
      },
    },
  },
};

export const CompactSize: Story = {
  args: {
    pivotData: smallDataset,
    height: 300,
    width: 600,
    rowHeight: 24,
    columnWidth: 80,
    headerHeight: 24,
    bufferSize: 5,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact table with smaller dimensions for space-constrained layouts.',
      },
    },
  },
};

export const WideColumns: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 1200,
    rowHeight: 40,
    columnWidth: 200,
    headerHeight: 40,
    bufferSize: 10,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with wider columns and taller rows for better content visibility.',
      },
    },
  },
};

export const NoHeaders: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 10,
    showRowHeaders: false,
    showColumnHeaders: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Virtualized table without headers, showing only data cells.',
      },
    },
  },
};

export const ColumnHeadersOnly: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 10,
    showRowHeaders: false,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table showing only column headers, useful for simple data grids.',
      },
    },
  },
};

export const RowHeadersOnly: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 10,
    showRowHeaders: true,
    showColumnHeaders: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Table showing only row headers, useful for hierarchical displays.',
      },
    },
  },
};

export const CustomRenderers: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 36,
    columnWidth: 140,
    headerHeight: 36,
    bufferSize: 10,
    showRowHeaders: true,
    showColumnHeaders: true,
    cellRenderer: (cell, coordinates) => (
      <div style={{
        padding: '4px 8px',
        backgroundColor: cell.type === 'data' && (cell.value as number) > 1000 ? '#e3f2fd' : 'transparent',
        borderRadius: '3px',
        fontWeight: cell.type === 'data' && (cell.value as number) > 1200 ? 'bold' : 'normal',
      }}>
        {cell.type === 'data' && (cell.value as number) > 1000 && '🔥 '}
        {cell.formattedValue}
      </div>
    ),
    headerRenderer: (header, type) => (
      <div style={{
        padding: '4px 8px',
        backgroundColor: type === 'row' ? '#f1f3f4' : '#e8f5e8',
        fontWeight: 'bold',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {type === 'row' ? '📊' : '📈'} {header.value}
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with custom cell and header renderers for enhanced visualization.',
      },
    },
  },
};

export const HighPerformanceBuffer: Story = {
  args: {
    pivotData: generateLargeDataset(50000, 30),
    height: 600,
    width: 1000,
    rowHeight: 30,
    columnWidth: 110,
    headerHeight: 30,
    bufferSize: 100, // Large buffer for smoother scrolling
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'High-performance configuration with large buffer size for ultra-smooth scrolling.',
      },
    },
  },
};

export const ResponsiveMobile: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 350,
    rowHeight: 36,
    columnWidth: 80,
    headerHeight: 36,
    bufferSize: 5,
    showRowHeaders: true,
    showColumnHeaders: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized virtualized table with smaller dimensions.',
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    pivotData: smallDataset,
    height: 400,
    width: 800,
    rowHeight: 32,
    columnWidth: 120,
    headerHeight: 32,
    bufferSize: 10,
    showRowHeaders: true,
    showColumnHeaders: true,
    className: 'Spreadsheet--dark-mode',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Virtualized table with dark mode styling.',
      },
    },
  },
};