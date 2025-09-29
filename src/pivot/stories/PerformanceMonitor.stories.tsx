import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { PerformanceManager } from '../PerformanceManager';
import { PivotTable } from '../PivotTable';
import { VirtualizedPivotTable } from '../VirtualizedPivotTable';
import { PivotConfiguration, PivotDataSet, PivotStructure } from '../types';

// Generate test data for performance monitoring
const generateTestData = (size: number): PivotDataSet => {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const products = ['Widget A', 'Widget B', 'Widget C', 'Gadget X', 'Gadget Y'];
  const categories = ['Premium', 'Standard', 'Basic'];
  const data: PivotDataSet = [];

  for (let i = 0; i < size; i++) {
    data.push({
      id: i,
      region: regions[Math.floor(Math.random() * regions.length)],
      product: products[Math.floor(Math.random() * products.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      quarter: `Q${Math.floor(Math.random() * 4) + 1}`,
      sales: Math.floor(Math.random() * 10000) + 1000,
      quantity: Math.floor(Math.random() * 1000) + 50,
      cost: Math.floor(Math.random() * 5000) + 500,
      profit: Math.floor(Math.random() * 3000) + 200,
    });
  }

  return data;
};

const testConfiguration: PivotConfiguration = {
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

const meta: Meta<typeof PerformanceMonitor> = {
  title: 'Pivot/PerformanceMonitor',
  component: PerformanceMonitor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The PerformanceMonitor component provides real-time performance monitoring and optimization insights:

- **Real-time Metrics**: Live performance data including render times and computation times
- **Memory Monitoring**: Track memory usage and detect memory leaks
- **Cache Analytics**: Monitor cache hit rates and efficiency
- **Performance Charts**: Visual representation of performance trends over time
- **Automatic Alerts**: Warnings when performance thresholds are exceeded
- **Development Tools**: Detailed debugging information for optimization

## Features

### Performance Metrics
- Render time tracking (target: <16ms for 60fps)
- Computation time monitoring
- Memory usage estimation
- Cache hit/miss ratios

### Visual Indicators
- Performance status (excellent, good, fair, poor)
- Real-time charts showing trends
- Color-coded alerts and warnings
- Expandable detailed metrics

### Optimization Insights
- Identifies performance bottlenecks
- Suggests optimization strategies
- Tracks improvement over time
- Helps with performance tuning
        `,
      },
    },
  },
  argTypes: {
    show: {
      description: 'Whether the monitor is visible',
      control: 'boolean',
    },
    position: {
      description: 'Position of the monitor on screen',
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    detailed: {
      description: 'Whether to show detailed metrics',
      control: 'boolean',
    },
    onToggle: {
      description: 'Callback when monitor visibility is toggled',
      action: 'monitor toggled',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', padding: '20px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PerformanceMonitor>;

export const Default: Story = {
  args: {
    show: true,
    position: 'top-right',
    detailed: true,
  },
};

export const Compact: Story = {
  args: {
    show: true,
    position: 'top-right',
    detailed: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view showing only essential performance metrics.',
      },
    },
  },
};

export const TopLeft: Story = {
  args: {
    show: true,
    position: 'top-left',
    detailed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance monitor positioned in the top-left corner.',
      },
    },
  },
};

export const BottomRight: Story = {
  args: {
    show: true,
    position: 'bottom-right',
    detailed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance monitor positioned in the bottom-right corner.',
      },
    },
  },
};

// Interactive demo with live performance monitoring
const LivePerformanceDemo = (args: any) => {
  const [dataSize, setDataSize] = useState(1000);
  const [showMonitor, setShowMonitor] = useState(true);
  const [data, setData] = useState(() => generateTestData(1000));
  const [isComputing, setIsComputing] = useState(false);

  // Simulate performance load
  const handleDataSizeChange = (newSize: number) => {
    setIsComputing(true);
    setDataSize(newSize);

    // Simulate computation delay
    setTimeout(() => {
      setData(generateTestData(newSize));
      setIsComputing(false);
    }, 100);
  };

  // Performance stress test
  const runStressTest = () => {
    const sizes = [500, 1000, 2000, 5000, 10000, 20000];
    let index = 0;

    const interval = setInterval(() => {
      if (index < sizes.length) {
        handleDataSizeChange(sizes[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Controls */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Performance Monitor Demo</h4>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={showMonitor}
              onChange={(e) => setShowMonitor(e.target.checked)}
            />
            Show Performance Monitor
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Dataset size:</span>
            {[100, 500, 1000, 2000, 5000].map(size => (
              <button
                key={size}
                onClick={() => handleDataSizeChange(size)}
                disabled={isComputing}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #007bff',
                  backgroundColor: dataSize === size ? '#007bff' : 'white',
                  color: dataSize === size ? 'white' : '#007bff',
                  borderRadius: '3px',
                  cursor: isComputing ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                {size}
              </button>
            ))}
          </div>

          <button
            onClick={runStressTest}
            disabled={isComputing}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isComputing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
            }}
          >
            Run Stress Test
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '14px', color: '#6c757d' }}>
          Current dataset: {data.length.toLocaleString()} rows
          {isComputing && ' (Computing...)'}
        </div>
      </div>

      {/* Pivot Table */}
      <PivotTable
        data={data}
        configuration={testConfiguration}
        onConfigurationChange={() => {}}
        mode="client"
        showFieldSelector={false}
        showExportControls={false}
        maxHeight={500}
        loading={isComputing}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor
        {...args}
        show={showMonitor}
        onToggle={setShowMonitor}
      />
    </div>
  );
};

export const LiveDemo: Story = {
  render: LivePerformanceDemo,
  args: {
    position: 'top-right',
    detailed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing real-time performance monitoring with different dataset sizes.',
      },
    },
  },
};

// Virtualized table performance demo
const VirtualizedPerformanceDemo = (args: any) => {
  const [showMonitor, setShowMonitor] = useState(true);
  const [dataSize, setDataSize] = useState([1000, 20]);

  // Generate large pivot structure for virtualization
  const generatePivotStructure = (rows: number, cols: number): PivotStructure => {
    const rowHeaders = Array.from({ length: rows }, (_, i) => [
      { value: `Region ${i % 5}`, span: 1, level: 0, isExpandable: false, isExpanded: false, path: [`Region ${i % 5}`] },
      { value: `Product ${i}`, span: 1, level: 1, isExpandable: false, isExpanded: false, path: [`Region ${i % 5}`, `Product ${i}`] }
    ]);

    const columnHeaders = [
      Array.from({ length: cols }, (_, i) => ({
        value: `Col ${i}`,
        span: 1,
        level: 0,
        isExpandable: false,
        isExpanded: false,
        path: [`Col ${i}`]
      }))
    ];

    const matrix = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        value: Math.floor(Math.random() * 10000),
        formattedValue: Math.floor(Math.random() * 10000).toLocaleString(),
        type: 'data' as const,
        level: 0,
        isExpandable: false,
        isExpanded: false,
        path: []
      }))
    );

    return {
      rowCount: rows,
      columnCount: cols,
      rowHeaders,
      columnHeaders,
      matrix,
    };
  };

  const [pivotData, setPivotData] = useState(() => generatePivotStructure(1000, 20));

  const handleSizeChange = (rows: number, cols: number) => {
    setDataSize([rows, cols]);
    setPivotData(generatePivotStructure(rows, cols));
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Controls */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Virtualized Performance Demo</h4>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={showMonitor}
              onChange={(e) => setShowMonitor(e.target.checked)}
            />
            Show Performance Monitor
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Size:</span>
            {[
              [1000, 20],
              [5000, 50],
              [10000, 100],
              [50000, 200],
            ].map(([rows, cols]) => (
              <button
                key={`${rows}-${cols}`}
                onClick={() => handleSizeChange(rows, cols)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #007bff',
                  backgroundColor: dataSize[0] === rows && dataSize[1] === cols ? '#007bff' : 'white',
                  color: dataSize[0] === rows && dataSize[1] === cols ? 'white' : '#007bff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {rows.toLocaleString()}×{cols}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '14px', color: '#6c757d' }}>
          Current size: {pivotData.rowCount.toLocaleString()} rows × {pivotData.columnCount} columns
          = {(pivotData.rowCount * pivotData.columnCount).toLocaleString()} cells
        </div>
      </div>

      {/* Virtualized Table */}
      <VirtualizedPivotTable
        pivotData={pivotData}
        height={600}
        width={1000}
        rowHeight={32}
        columnWidth={120}
        bufferSize={50}
        showRowHeaders={true}
        showColumnHeaders={true}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor
        {...args}
        show={showMonitor}
        onToggle={setShowMonitor}
      />
    </div>
  );
};

export const VirtualizedDemo: Story = {
  render: VirtualizedPerformanceDemo,
  args: {
    position: 'top-right',
    detailed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance monitoring with virtualized pivot table, demonstrating efficient rendering of large datasets.',
      },
    },
  },
};

export const DarkMode: Story = {
  render: LivePerformanceDemo,
  args: {
    position: 'top-right',
    detailed: true,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Performance monitor with dark mode styling.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="Spreadsheet--dark-mode" style={{ minHeight: '100vh', padding: '20px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export const ToggleButton: Story = {
  args: {
    show: false,
    position: 'top-right',
    detailed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance monitor toggle button when the monitor is hidden.',
      },
    },
  },
};