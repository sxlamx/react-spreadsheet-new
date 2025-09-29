import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PivotTableWithConfiguration } from '../PivotTableWithConfiguration';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { PivotConfiguration, PivotDataSet } from '../types';

// Comprehensive sample dataset
const comprehensiveData: PivotDataSet = [
  // Electronics - North
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Jan', sales: 45000, quantity: 15, cost: 30000, profit: 15000, rating: 4.5, active: true },
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Feb', sales: 52000, quantity: 18, cost: 34800, profit: 17200, rating: 4.6, active: true },
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Mar', sales: 48000, quantity: 16, cost: 32000, profit: 16000, rating: 4.4, active: true },
  { region: 'North', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Jan', sales: 28000, quantity: 35, cost: 17500, profit: 10500, rating: 4.2, active: true },
  { region: 'North', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Feb', sales: 32000, quantity: 40, cost: 20000, profit: 12000, rating: 4.3, active: true },
  { region: 'North', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Mar', sales: 30000, quantity: 38, cost: 19000, profit: 11000, rating: 4.1, active: true },

  // Electronics - South
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Jan', sales: 38000, quantity: 12, cost: 25200, profit: 12800, rating: 4.3, active: true },
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Feb', sales: 41000, quantity: 14, cost: 27300, profit: 13700, rating: 4.4, active: true },
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q1 2023', month: 'Mar', sales: 44000, quantity: 15, cost: 29400, profit: 14600, rating: 4.5, active: true },
  { region: 'South', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Jan', sales: 25000, quantity: 31, cost: 15625, profit: 9375, rating: 4.0, active: true },
  { region: 'South', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Feb', sales: 27000, quantity: 34, cost: 16875, profit: 10125, rating: 4.1, active: true },
  { region: 'South', category: 'Electronics', product: 'Tablet Max', quarter: 'Q1 2023', month: 'Mar', sales: 29000, quantity: 36, cost: 18125, profit: 10875, rating: 4.2, active: true },

  // Home & Garden - North
  { region: 'North', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Jan', sales: 15000, quantity: 50, cost: 10000, profit: 5000, rating: 4.7, active: true },
  { region: 'North', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Feb', sales: 18000, quantity: 60, cost: 12000, profit: 6000, rating: 4.8, active: true },
  { region: 'North', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Mar', sales: 16500, quantity: 55, cost: 11000, profit: 5500, rating: 4.6, active: true },
  { region: 'North', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Jan', sales: 8000, quantity: 80, cost: 4800, profit: 3200, rating: 4.1, active: true },
  { region: 'North', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Feb', sales: 9500, quantity: 95, cost: 5700, profit: 3800, rating: 4.2, active: true },
  { region: 'North', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Mar', sales: 11000, quantity: 110, cost: 6600, profit: 4400, rating: 4.3, active: true },

  // Home & Garden - South
  { region: 'South', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Jan', sales: 12000, quantity: 40, cost: 8000, profit: 4000, rating: 4.5, active: true },
  { region: 'South', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Feb', sales: 14000, quantity: 47, cost: 9333, profit: 4667, rating: 4.6, active: true },
  { region: 'South', category: 'Home & Garden', product: 'Smart Thermostat', quarter: 'Q1 2023', month: 'Mar', sales: 13500, quantity: 45, cost: 9000, profit: 4500, rating: 4.4, active: true },
  { region: 'South', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Jan', sales: 7200, quantity: 72, cost: 4320, profit: 2880, rating: 3.9, active: true },
  { region: 'South', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Feb', sales: 8100, quantity: 81, cost: 4860, profit: 3240, rating: 4.0, active: true },
  { region: 'South', category: 'Home & Garden', product: 'Garden Tool Set', quarter: 'Q1 2023', month: 'Mar', sales: 8800, quantity: 88, cost: 5280, profit: 3520, rating: 4.1, active: true },

  // Q2 Data (abbreviated for space)
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'Apr', sales: 55000, quantity: 19, cost: 36300, profit: 18700, rating: 4.7, active: true },
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'May', sales: 58000, quantity: 20, cost: 38600, profit: 19400, rating: 4.8, active: true },
  { region: 'North', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'Jun', sales: 61000, quantity: 21, cost: 40600, profit: 20400, rating: 4.9, active: true },
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'Apr', sales: 47000, quantity: 16, cost: 31333, profit: 15667, rating: 4.6, active: true },
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'May', sales: 50000, quantity: 17, cost: 33333, profit: 16667, rating: 4.7, active: true },
  { region: 'South', category: 'Electronics', product: 'Laptop Pro', quarter: 'Q2 2023', month: 'Jun', sales: 53000, quantity: 18, cost: 35333, profit: 17667, rating: 4.8, active: true },

  // Discontinued products
  { region: 'North', category: 'Electronics', product: 'Old Tablet', quarter: 'Q1 2023', month: 'Jan', sales: 5000, quantity: 10, cost: 3500, profit: 1500, rating: 3.2, active: false },
  { region: 'South', category: 'Electronics', product: 'Old Tablet', quarter: 'Q1 2023', month: 'Jan', sales: 4500, quantity: 9, cost: 3150, profit: 1350, rating: 3.1, active: false },
];

const defaultConfiguration: PivotConfiguration = {
  rows: [
    { name: 'region', dataType: 'string' },
    { name: 'category', dataType: 'string' },
  ],
  columns: [
    { name: 'quarter', dataType: 'string' },
  ],
  values: [
    { name: 'sales', dataType: 'number', aggregation: 'sum' },
    { name: 'profit', dataType: 'number', aggregation: 'sum' },
  ],
  filters: [
    { name: 'active', operator: 'equals', value: true },
  ],
  options: {
    showGrandTotals: true,
    showSubtotals: true,
    computeMode: 'client',
  },
};

const meta: Meta<typeof PivotTableWithConfiguration> = {
  title: 'Pivot/Overview',
  component: PivotTableWithConfiguration,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Pivot Table Complete Feature Overview

This comprehensive demo showcases all the advanced features of the Pivot Table system:

## 🚀 Core Features

### **Multi-dimensional Analysis**
- Drag-and-drop field configuration
- Hierarchical row and column groupings
- Multiple aggregation functions (sum, count, avg, min, max, countDistinct)
- Advanced filtering with multiple operators

### **State Management**
- Save and load pivot configurations
- Import/export configurations as JSON
- Configuration history with undo/redo
- Auto-save functionality
- Search and organize saved configurations

### **Export Capabilities**
- CSV export with customizable delimiters
- Excel export with sheet customization
- PDF export with formatting options
- JSON export for developer integration
- Batch export multiple formats

### **Performance Optimization**
- Intelligent caching with LRU algorithm
- Virtual scrolling for large datasets
- Incremental updates for efficiency
- Real-time performance monitoring
- Memory usage optimization

### **Interactive Features**
- Drill-down functionality with breadcrumb navigation
- Expandable/collapsible hierarchies
- Click handlers and event management
- Keyboard navigation support
- Touch-friendly mobile interface

## 🎨 UI/UX Features

### **Responsive Design**
- Mobile-optimized layouts
- Touch gesture support
- Adaptive column sizing
- Collapsible field selector

### **Accessibility**
- ARIA labels and descriptions
- Keyboard navigation
- Screen reader support
- High contrast mode support
- Reduced motion preferences

### **Theming**
- Light and dark mode support
- Customizable CSS variables
- Flexible styling system
- Print-optimized layouts

## 📊 Advanced Analytics

### **Data Types**
- String/text fields
- Numeric fields with formatting
- Date/time fields
- Boolean fields
- Custom data type handling

### **Aggregation Functions**
- Sum, Count, Average
- Min, Max values
- Count Distinct
- Custom aggregation functions
- Multiple aggregations per field

### **Filtering**
- Equals, Not Equals
- Greater Than, Less Than
- Contains, Starts With, Ends With
- Between ranges
- In/Not In lists
- Custom filter operators

## 🔧 Developer Features

### **Architecture**
- TypeScript throughout
- React hooks for state management
- Modular component design
- Plugin architecture
- Comprehensive error handling

### **Integration**
- React Query for data fetching
- Server-side computation support
- FastAPI backend integration
- DuckDB for advanced analytics
- RESTful API design

### **Testing & Documentation**
- Comprehensive Storybook stories
- Interactive examples
- Performance benchmarks
- API documentation
- Usage guides

Try the interactive demo below to explore all features!
        `,
      },
    },
  },
  argTypes: {
    initialConfiguration: {
      description: 'Initial pivot configuration',
      control: false,
    },
    showConfigurationBrowser: {
      description: 'Show configuration browser on startup',
      control: 'boolean',
    },
    showConfigurationToolbar: {
      description: 'Show configuration management toolbar',
      control: 'boolean',
    },
    configurationStorage: {
      description: 'Configuration storage options',
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof PivotTableWithConfiguration>;

// Complete Feature Demo
const CompleteFeatureDemo = (args: any) => {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(true);
  const [currentDataset, setCurrentDataset] = useState<'sample' | 'large'>('sample');

  // Generate larger dataset for performance testing
  const generateLargeDataset = (size: number): PivotDataSet => {
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const categories = ['Electronics', 'Home & Garden', 'Sports', 'Books', 'Clothing'];
    const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
    const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data: PivotDataSet = [];
    for (let i = 0; i < size; i++) {
      data.push({
        id: i,
        region: regions[Math.floor(Math.random() * regions.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        product: products[Math.floor(Math.random() * products.length)],
        quarter: quarters[Math.floor(Math.random() * quarters.length)],
        month: months[Math.floor(Math.random() * months.length)],
        sales: Math.floor(Math.random() * 100000) + 5000,
        quantity: Math.floor(Math.random() * 1000) + 10,
        cost: Math.floor(Math.random() * 50000) + 2000,
        profit: Math.floor(Math.random() * 30000) + 1000,
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
        active: Math.random() > 0.1, // 90% active
      });
    }
    return data;
  };

  const currentData = currentDataset === 'sample' ? comprehensiveData : generateLargeDataset(5000);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Demo Controls */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 1001,
        padding: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
          Demo Controls
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={showPerformanceMonitor}
              onChange={(e) => setShowPerformanceMonitor(e.target.checked)}
            />
            Performance Monitor
          </label>

          <div style={{ fontSize: '11px' }}>
            <div>Dataset:</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              <input
                type="radio"
                checked={currentDataset === 'sample'}
                onChange={() => setCurrentDataset('sample')}
              />
              Sample ({comprehensiveData.length} rows)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              <input
                type="radio"
                checked={currentDataset === 'large'}
                onChange={() => setCurrentDataset('large')}
              />
              Large (5,000 rows)
            </label>
          </div>
        </div>
      </div>

      {/* Main Pivot Table */}
      <PivotTableWithConfiguration
        {...args}
        data={currentData}
        initialConfiguration={defaultConfiguration}
        configurationStorage={{
          type: 'localStorage',
          keyPrefix: 'pivot-demo-',
        }}
        configurationOptions={{
          maxHistorySize: 20,
          autoSave: false,
          validateOnChange: true,
        }}
      />

      {/* Performance Monitor */}
      {showPerformanceMonitor && (
        <PerformanceMonitor
          show={true}
          position="top-right"
          detailed={true}
          onToggle={setShowPerformanceMonitor}
        />
      )}

      {/* Feature Highlights */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          💡 Try These Features:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <div>• Drag fields between drop zones</div>
          <div>• Change aggregation functions</div>
          <div>• Save/load configurations</div>
          <div>• Export to different formats</div>
          <div>• Monitor performance metrics</div>
          <div>• Use drill-down functionality</div>
        </div>
      </div>
    </div>
  );
};

export const CompleteFeatureShowcase: Story = {
  render: CompleteFeatureDemo,
  args: {
    showFieldSelector: true,
    showExportControls: true,
    showConfigurationToolbar: true,
    enableDrillDown: true,
    fillContainer: false,
    maxHeight: 600,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Complete Feature Showcase**

This interactive demo includes:
- Full pivot table with drag-and-drop configuration
- Configuration management (save/load/import/export)
- Export functionality (CSV, Excel, PDF, JSON)
- Performance monitoring with real-time metrics
- Drill-down capabilities
- Responsive design
- Dataset switching (sample vs. large data)

Use the controls to explore different features and datasets.
        `,
      },
    },
  },
};

export const ProductionReady: Story = {
  render: CompleteFeatureDemo,
  args: {
    showFieldSelector: true,
    showExportControls: true,
    showConfigurationToolbar: true,
    enableDrillDown: true,
    fillContainer: true,
    configurationStorage: {
      type: 'localStorage',
      keyPrefix: 'production-pivot-',
    },
    configurationOptions: {
      maxHistorySize: 50,
      autoSave: true,
      autoSaveDelay: 3000,
      validateOnChange: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
**Production-Ready Configuration**

This demo shows a production-ready setup with:
- Auto-save enabled (3-second delay)
- Larger configuration history (50 operations)
- Validation on all changes
- Full container sizing
- Persistent localStorage storage
        `,
      },
    },
  },
};

export const MinimalSetup: Story = {
  args: {
    data: comprehensiveData.slice(0, 12), // Smaller dataset
    initialConfiguration: {
      rows: [{ name: 'region', dataType: 'string' }],
      columns: [{ name: 'quarter', dataType: 'string' }],
      values: [{ name: 'sales', dataType: 'number', aggregation: 'sum' }],
      filters: [],
      options: {
        showGrandTotals: false,
        showSubtotals: false,
        computeMode: 'client',
      },
    },
    showFieldSelector: false,
    showExportControls: false,
    showConfigurationToolbar: false,
    enableDrillDown: false,
    maxHeight: 300,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Minimal Setup**

Simple pivot table with:
- Basic configuration (region × quarter = sales)
- No field selector or controls
- Minimal height
- No totals or subtotals
- Read-only mode
        `,
      },
    },
  },
};

export const DarkModeShowcase: Story = {
  render: (args) => (
    <div className="Spreadsheet--dark-mode">
      <CompleteFeatureDemo {...args} />
    </div>
  ),
  args: {
    showFieldSelector: true,
    showExportControls: true,
    showConfigurationToolbar: true,
    enableDrillDown: true,
    fillContainer: false,
    maxHeight: 600,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Complete feature showcase with dark mode styling.',
      },
    },
  },
};

export const MobileOptimized: Story = {
  render: CompleteFeatureDemo,
  args: {
    showFieldSelector: true,
    showExportControls: true,
    showConfigurationToolbar: true,
    enableDrillDown: true,
    fillContainer: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout with touch-friendly controls and responsive design.',
      },
    },
  },
};