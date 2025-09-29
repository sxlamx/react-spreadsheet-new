import * as React from 'react';
import { PerformanceMetrics, usePerformanceManager } from './PerformanceManager';
import './PerformanceMonitor.css';

/** Performance monitor props */
export interface PerformanceMonitorProps {
  /** Whether to show the monitor */
  show?: boolean;
  /** Position of the monitor */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show detailed metrics */
  detailed?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Called when monitor is toggled */
  onToggle?: (show: boolean) => void;
}

/** Performance chart component */
const PerformanceChart: React.FC<{
  data: number[];
  label: string;
  color: string;
  unit?: string;
  height?: number;
}> = ({ data, label, color, unit = 'ms', height = 40 }) => {
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - value) / maxValue) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="PerformanceChart">
      <div className="PerformanceChart__label">
        {label}: {data[data.length - 1]?.toFixed(1) || '0'}{unit}
      </div>
      <svg
        className="PerformanceChart__svg"
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1"
          points={points}
        />
        <circle
          cx="100"
          cy={((maxValue - (data[data.length - 1] || 0)) / maxValue) * height}
          r="1"
          fill={color}
        />
      </svg>
    </div>
  );
};

/** Memory usage component */
const MemoryUsage: React.FC<{
  metrics: PerformanceMetrics;
}> = ({ metrics }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="MemoryUsage">
      <div className="MemoryUsage__title">Memory Usage</div>
      <div className="MemoryUsage__bar">
        <div className="MemoryUsage__segment MemoryUsage__segment--data"
             style={{ width: `${(metrics.memoryUsage.dataSize / metrics.memoryUsage.totalEstimate) * 100}%` }}
             title={`Data: ${formatBytes(metrics.memoryUsage.dataSize)}`} />
        <div className="MemoryUsage__segment MemoryUsage__segment--structure"
             style={{ width: `${(metrics.memoryUsage.structureSize / metrics.memoryUsage.totalEstimate) * 100}%` }}
             title={`Structure: ${formatBytes(metrics.memoryUsage.structureSize)}`} />
      </div>
      <div className="MemoryUsage__label">
        Total: {formatBytes(metrics.memoryUsage.totalEstimate)}
      </div>
    </div>
  );
};

/** Cache statistics component */
const CacheStats: React.FC<{
  metrics: PerformanceMetrics;
  onClearCache: () => void;
}> = ({ metrics, onClearCache }) => {
  const hitRate = (metrics.cache.hitRate * 100).toFixed(1);
  const efficiency = metrics.cache.hits > 0 ? 'good' : metrics.cache.misses > 10 ? 'poor' : 'fair';

  return (
    <div className="CacheStats">
      <div className="CacheStats__header">
        <span className="CacheStats__title">Cache</span>
        <button
          className="CacheStats__clear"
          onClick={onClearCache}
          title="Clear cache"
        >
          🗑️
        </button>
      </div>
      <div className="CacheStats__metrics">
        <div className={`CacheStats__hit-rate CacheStats__hit-rate--${efficiency}`}>
          {hitRate}% hit rate
        </div>
        <div className="CacheStats__details">
          {metrics.cache.hits} hits, {metrics.cache.misses} misses
        </div>
        <div className="CacheStats__size">
          {metrics.cache.size} entries
        </div>
      </div>
    </div>
  );
};

/** Main performance monitor component */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  show = false,
  position = 'top-right',
  detailed = false,
  className,
  onToggle,
}) => {
  const { metrics, clearCache } = usePerformanceManager();
  const [isCollapsed, setIsCollapsed] = React.useState(!detailed);
  const [renderTimes, setRenderTimes] = React.useState<number[]>([]);
  const [computationTimes, setComputationTimes] = React.useState<number[]>([]);

  // Track performance history
  React.useEffect(() => {
    setRenderTimes(prev => [...prev.slice(-19), metrics.render.lastRenderTime]);
    setComputationTimes(prev => [...prev.slice(-19), metrics.computationTime]);
  }, [metrics.render.lastRenderTime, metrics.computationTime]);

  if (!show) {
    return (
      <button
        className="PerformanceMonitor__toggle"
        onClick={() => onToggle?.(true)}
        title="Show performance monitor"
      >
        📊
      </button>
    );
  }

  const getPerformanceStatus = () => {
    const avgRender = metrics.render.averageRenderTime;
    const frameDrops = metrics.render.frameDrops;

    if (avgRender < 16 && frameDrops < 5) return 'excellent';
    if (avgRender < 33 && frameDrops < 10) return 'good';
    if (avgRender < 50 && frameDrops < 20) return 'fair';
    return 'poor';
  };

  const status = getPerformanceStatus();

  return (
    <div className={`PerformanceMonitor PerformanceMonitor--${position} ${className || ''}`}>
      <div className="PerformanceMonitor__header">
        <div className={`PerformanceMonitor__status PerformanceMonitor__status--${status}`}>
          Performance: {status}
        </div>
        <div className="PerformanceMonitor__controls">
          <button
            className="PerformanceMonitor__control"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '📈' : '📉'}
          </button>
          <button
            className="PerformanceMonitor__control"
            onClick={() => onToggle?.(false)}
            title="Hide monitor"
          >
            ✕
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="PerformanceMonitor__content">
          {/* Quick metrics */}
          <div className="PerformanceMonitor__quick-metrics">
            <div className="PerformanceMonitor__metric">
              <span className="PerformanceMonitor__metric-label">Render:</span>
              <span className="PerformanceMonitor__metric-value">
                {metrics.render.lastRenderTime.toFixed(1)}ms
              </span>
            </div>
            <div className="PerformanceMonitor__metric">
              <span className="PerformanceMonitor__metric-label">Compute:</span>
              <span className="PerformanceMonitor__metric-value">
                {metrics.computationTime.toFixed(1)}ms
              </span>
            </div>
            <div className="PerformanceMonitor__metric">
              <span className="PerformanceMonitor__metric-label">Dimensions:</span>
              <span className="PerformanceMonitor__metric-value">
                {metrics.dimensions.rows}×{metrics.dimensions.columns}
              </span>
            </div>
          </div>

          {detailed && (
            <>
              {/* Performance charts */}
              <div className="PerformanceMonitor__charts">
                <PerformanceChart
                  data={renderTimes}
                  label="Render Time"
                  color="#007bff"
                  unit="ms"
                />
                <PerformanceChart
                  data={computationTimes}
                  label="Computation Time"
                  color="#28a745"
                  unit="ms"
                />
              </div>

              {/* Memory usage */}
              <MemoryUsage metrics={metrics} />

              {/* Cache statistics */}
              <CacheStats metrics={metrics} onClearCache={clearCache} />

              {/* Detailed metrics */}
              <div className="PerformanceMonitor__detailed">
                <div className="PerformanceMonitor__section">
                  <div className="PerformanceMonitor__section-title">Render Stats</div>
                  <div className="PerformanceMonitor__section-content">
                    <div>Average: {metrics.render.averageRenderTime.toFixed(1)}ms</div>
                    <div>Frame drops: {metrics.render.frameDrops}</div>
                  </div>
                </div>

                <div className="PerformanceMonitor__section">
                  <div className="PerformanceMonitor__section-title">Data Size</div>
                  <div className="PerformanceMonitor__section-content">
                    <div>Rows: {metrics.dimensions.rows.toLocaleString()}</div>
                    <div>Columns: {metrics.dimensions.columns.toLocaleString()}</div>
                    <div>Cells: {metrics.dimensions.cells.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Hook for performance monitoring integration */
export function usePerformanceMonitoring(
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const [showMonitor, setShowMonitor] = React.useState(enabled);
  const [performanceAlerts, setPerformanceAlerts] = React.useState<string[]>([]);
  const { metrics } = usePerformanceManager();

  // Performance alerts
  React.useEffect(() => {
    if (!enabled) return;

    const alerts: string[] = [];

    // Check render performance
    if (metrics.render.averageRenderTime > 50) {
      alerts.push('Slow rendering detected (>50ms average)');
    }

    // Check computation time
    if (metrics.computationTime > 1000) {
      alerts.push('Slow computation detected (>1s)');
    }

    // Check cache efficiency
    if (metrics.cache.hits + metrics.cache.misses > 20 && metrics.cache.hitRate < 0.5) {
      alerts.push('Low cache hit rate (<50%)');
    }

    // Check memory usage
    if (metrics.memoryUsage.totalEstimate > 100 * 1024 * 1024) { // 100MB
      alerts.push('High memory usage detected (>100MB)');
    }

    setPerformanceAlerts(alerts);
  }, [enabled, metrics]);

  return {
    showMonitor,
    setShowMonitor,
    performanceAlerts,
    metrics,
  };
}

export default PerformanceMonitor;