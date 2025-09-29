import * as React from 'react';
import { PivotTable } from '../PivotTable';
import { VirtualizedPivotTable } from '../VirtualizedPivotTable';
import { PerformanceMonitor, usePerformanceMonitoring } from '../PerformanceMonitor';
import { useOptimizedPivotEngine } from '../OptimizedPivotEngine';
import { PivotConfiguration, PivotDataSet } from '../types';

// Generate large sample dataset for performance testing
const generateLargeDataset = (rowCount: number): PivotDataSet => {
  const data: PivotDataSet = [];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const products = ['Widget A', 'Widget B', 'Widget C', 'Gadget X', 'Gadget Y', 'Tool Z'];
  const categories = ['Electronics', 'Tools', 'Gadgets', 'Widgets'];
  const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'];

  for (let i = 0; i < rowCount; i++) {
    data.push({
      id: i,
      region: regions[Math.floor(Math.random() * regions.length)],
      product: products[Math.floor(Math.random() * products.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      quarter: quarters[Math.floor(Math.random() * quarters.length)],
      sales: Math.floor(Math.random() * 10000) + 1000,
      quantity: Math.floor(Math.random() * 1000) + 50,
      cost: Math.floor(Math.random() * 5000) + 500,
      profit: Math.floor(Math.random() * 3000) + 200,
      discount: Math.random() * 0.3,
    });
  }

  return data;
};

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
    { name: 'quantity', dataType: 'number', aggregation: 'sum' },
    { name: 'profit', dataType: 'number', aggregation: 'avg' },
  ],
  filters: [],
  options: {
    showGrandTotals: true,
    showSubtotals: true,
    computeMode: 'client',
  },
};

/** Performance comparison component */
const PerformanceComparison: React.FC<{
  data: PivotDataSet;
  configuration: PivotConfiguration;
}> = ({ data, configuration }) => {
  const [currentMode, setCurrentMode] = React.useState<'standard' | 'optimized' | 'virtualized'>('standard');
  const [enableMonitoring, setEnableMonitoring] = React.useState(true);

  const { showMonitor, setShowMonitor, performanceAlerts } = usePerformanceMonitoring(enableMonitoring);

  // Optimized engine hook
  const {
    pivotStructure: optimizedStructure,
    isComputing: isOptimizedComputing,
    computationError: optimizedError,
  } = useOptimizedPivotEngine(data, configuration, {
    enableIncremental: true,
    enableParallel: true,
    batchSize: 1000,
    cacheIntermediates: true,
  });

  const renderModeSelector = () => (
    <div className="PerformanceExample__mode-selector">
      <h4>Rendering Mode:</h4>
      <div className="PerformanceExample__mode-buttons">
        <button
          className={`PerformanceExample__mode-button ${
            currentMode === 'standard' ? 'PerformanceExample__mode-button--active' : ''
          }`}
          onClick={() => setCurrentMode('standard')}
        >
          Standard
        </button>
        <button
          className={`PerformanceExample__mode-button ${
            currentMode === 'optimized' ? 'PerformanceExample__mode-button--active' : ''
          }`}
          onClick={() => setCurrentMode('optimized')}
        >
          Optimized Engine
        </button>
        <button
          className={`PerformanceExample__mode-button ${
            currentMode === 'virtualized' ? 'PerformanceExample__mode-button--active' : ''
          }`}
          onClick={() => setCurrentMode('virtualized')}
        >
          Virtualized
        </button>
      </div>
    </div>
  );

  const renderPerformanceControls = () => (
    <div className="PerformanceExample__controls">
      <label className="PerformanceExample__control">
        <input
          type="checkbox"
          checked={enableMonitoring}
          onChange={(e) => setEnableMonitoring(e.target.checked)}
        />
        Enable Performance Monitoring
      </label>
      {enableMonitoring && (
        <label className="PerformanceExample__control">
          <input
            type="checkbox"
            checked={showMonitor}
            onChange={(e) => setShowMonitor(e.target.checked)}
          />
          Show Performance Monitor
        </label>
      )}
    </div>
  );

  const renderPerformanceAlerts = () => {
    if (performanceAlerts.length === 0) return null;

    return (
      <div className="PerformanceExample__alerts">
        <h4>Performance Alerts:</h4>
        {performanceAlerts.map((alert, index) => (
          <div key={index} className="PerformanceExample__alert">
            ⚠️ {alert}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="PerformanceExample__comparison">
      {renderModeSelector()}
      {renderPerformanceControls()}
      {renderPerformanceAlerts()}

      <div className="PerformanceExample__content">
        {currentMode === 'standard' && (
          <PivotTable
            data={data}
            configuration={configuration}
            onConfigurationChange={() => {}}
            mode="client"
            showFieldSelector={false}
            showExportControls={false}
            maxHeight={500}
            className="PerformanceExample__pivot-table"
          />
        )}

        {currentMode === 'optimized' && (
          <div className="PerformanceExample__optimized">
            {isOptimizedComputing && (
              <div className="PerformanceExample__loading">
                Computing optimized pivot...
              </div>
            )}
            {optimizedError && (
              <div className="PerformanceExample__error">
                Error: {optimizedError}
              </div>
            )}
            {optimizedStructure && (
              <PivotTable
                data={data}
                configuration={configuration}
                onConfigurationChange={() => {}}
                mode="client"
                showFieldSelector={false}
                showExportControls={false}
                maxHeight={500}
                className="PerformanceExample__pivot-table"
              />
            )}
          </div>
        )}

        {currentMode === 'virtualized' && optimizedStructure && (
          <VirtualizedPivotTable
            pivotData={optimizedStructure}
            height={500}
            width={800}
            rowHeight={32}
            columnWidth={120}
            bufferSize={20}
            showRowHeaders={true}
            showColumnHeaders={true}
            className="PerformanceExample__virtualized-table"
          />
        )}
      </div>

      {enableMonitoring && (
        <PerformanceMonitor
          show={showMonitor}
          position="top-right"
          detailed={true}
          onToggle={setShowMonitor}
        />
      )}
    </div>
  );
};

/** Main performance example component */
export const PerformanceExample: React.FC = () => {
  const [dataSize, setDataSize] = React.useState(1000);
  const [configuration, setConfiguration] = React.useState<PivotConfiguration>(defaultConfiguration);
  const [data, setData] = React.useState<PivotDataSet>(() => generateLargeDataset(1000));

  const handleDataSizeChange = (newSize: number) => {
    setDataSize(newSize);
    setData(generateLargeDataset(newSize));
  };

  const dataSizeOptions = [
    { value: 100, label: '100 rows (Small)' },
    { value: 1000, label: '1K rows (Medium)' },
    { value: 10000, label: '10K rows (Large)' },
    { value: 50000, label: '50K rows (Very Large)' },
    { value: 100000, label: '100K rows (Extreme)' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '100vw', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Pivot Table Performance Optimization Example</h2>
        <p>
          This example demonstrates performance optimizations and monitoring capabilities:
        </p>
        <ul>
          <li><strong>Optimized Engine:</strong> Caching, incremental updates, and parallel processing</li>
          <li><strong>Virtualization:</strong> Efficient rendering for large datasets</li>
          <li><strong>Performance Monitoring:</strong> Real-time metrics and alerts</li>
          <li><strong>Memory Management:</strong> LRU caching and memory-aware optimizations</li>
        </ul>
      </div>

      {/* Data size selector */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Dataset Size:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {dataSizeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleDataSizeChange(option.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #007bff',
                backgroundColor: dataSize === option.value ? '#007bff' : 'white',
                color: dataSize === option.value ? 'white' : '#007bff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#6c757d' }}>
          Current dataset: {data.length.toLocaleString()} rows
        </div>
      </div>

      {/* Performance comparison */}
      <PerformanceComparison
        data={data}
        configuration={configuration}
      />

      {/* Performance tips */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Performance Tips</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>🚀 Optimization Strategies</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Use caching for repeated computations</li>
              <li>Enable incremental updates for small changes</li>
              <li>Implement parallel processing for large datasets</li>
              <li>Use virtualization for rendering performance</li>
            </ul>
          </div>

          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>📊 Monitoring Best Practices</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Monitor render times (&lt;16ms for 60fps)</li>
              <li>Track cache hit rates (&gt;70% is good)</li>
              <li>Watch memory usage trends</li>
              <li>Profile computation bottlenecks</li>
            </ul>
          </div>

          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>⚡ Performance Thresholds</h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px' }}>
              <li>Excellent: &lt;16ms render, &lt;500ms compute</li>
              <li>Good: &lt;33ms render, &lt;1s compute</li>
              <li>Fair: &lt;50ms render, &lt;2s compute</li>
              <li>Poor: &gt;50ms render, &gt;2s compute</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceExample;