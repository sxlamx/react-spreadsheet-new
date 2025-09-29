import * as React from 'react';
import classNames from 'classnames';
import { PivotStructure, PivotCell, PivotHeader } from './types';
import { useVirtualScrolling, usePerformanceManager } from './PerformanceManager';
import './VirtualizedPivotTable.css';

/** Virtualized pivot table props */
export interface VirtualizedPivotTableProps {
  /** Pivot data structure */
  pivotData: PivotStructure;
  /** Cell click handler */
  onCellClick?: (cell: PivotCell, coordinates: { row: number; column: number }) => void;
  /** Header click handler */
  onHeaderClick?: (header: PivotHeader) => void;
  /** Row height in pixels */
  rowHeight?: number;
  /** Header height in pixels */
  headerHeight?: number;
  /** Column width in pixels */
  columnWidth?: number;
  /** Container height */
  height?: number;
  /** Container width */
  width?: number;
  /** Virtual scroll buffer size */
  bufferSize?: number;
  /** Custom CSS class */
  className?: string;
  /** Whether to show row headers */
  showRowHeaders?: boolean;
  /** Whether to show column headers */
  showColumnHeaders?: boolean;
  /** Custom cell renderer */
  cellRenderer?: (cell: PivotCell, coordinates: { row: number; column: number }) => React.ReactNode;
  /** Custom header renderer */
  headerRenderer?: (header: PivotHeader, type: 'row' | 'column') => React.ReactNode;
}

/** Virtual row component */
const VirtualRow: React.FC<{
  rowIndex: number;
  row: (PivotCell | null)[];
  rowHeaders?: PivotHeader[];
  columnWidth: number;
  rowHeight: number;
  onCellClick?: (cell: PivotCell, coordinates: { row: number; column: number }) => void;
  showRowHeaders: boolean;
  cellRenderer?: (cell: PivotCell, coordinates: { row: number; column: number }) => React.ReactNode;
  headerRenderer?: (header: PivotHeader, type: 'row' | 'column') => React.ReactNode;
}> = ({
  rowIndex,
  row,
  rowHeaders,
  columnWidth,
  rowHeight,
  onCellClick,
  showRowHeaders,
  cellRenderer,
  headerRenderer,
}) => {
  const { measureComputation } = usePerformanceManager();

  const renderedRow = measureComputation(() => {
    const cells: React.ReactNode[] = [];

    // Render row headers
    if (showRowHeaders && rowHeaders) {
      rowHeaders.forEach((header, headerIndex) => {
        const headerContent = headerRenderer
          ? headerRenderer(header, 'row')
          : header.value;

        cells.push(
          <div
            key={`header-${headerIndex}`}
            className="VirtualizedPivotTable__row-header"
            style={{
              width: columnWidth,
              height: rowHeight,
              left: headerIndex * columnWidth,
            }}
          >
            {headerContent}
          </div>
        );
      });
    }

    // Render data cells
    row.forEach((cell, columnIndex) => {
      const actualColumnIndex = showRowHeaders
        ? columnIndex + (rowHeaders?.length || 0)
        : columnIndex;

      const cellContent = cell && cellRenderer
        ? cellRenderer(cell, { row: rowIndex, column: columnIndex })
        : cell?.formattedValue || cell?.value?.toString() || '';

      const cellClass = cell ? getCellClassName(cell) : 'VirtualizedPivotTable__cell--empty';

      cells.push(
        <div
          key={`cell-${columnIndex}`}
          className={`VirtualizedPivotTable__cell ${cellClass}`}
          style={{
            width: columnWidth,
            height: rowHeight,
            left: actualColumnIndex * columnWidth,
          }}
          onClick={() => {
            if (cell && onCellClick) {
              onCellClick(cell, { row: rowIndex, column: columnIndex });
            }
          }}
        >
          {cellContent}
        </div>
      );
    });

    return cells;
  }, `Row ${rowIndex} render`);

  return (
    <div
      className="VirtualizedPivotTable__row"
      style={{
        height: rowHeight,
        top: rowIndex * rowHeight,
      }}
    >
      {renderedRow}
    </div>
  );
};

/** Virtual column headers component */
const VirtualColumnHeaders: React.FC<{
  columnHeaders: PivotHeader[][];
  columnWidth: number;
  headerHeight: number;
  showRowHeaders: boolean;
  rowHeaderCount: number;
  onHeaderClick?: (header: PivotHeader) => void;
  headerRenderer?: (header: PivotHeader, type: 'row' | 'column') => React.ReactNode;
}> = ({
  columnHeaders,
  columnWidth,
  headerHeight,
  showRowHeaders,
  rowHeaderCount,
  onHeaderClick,
  headerRenderer,
}) => {
  if (columnHeaders.length === 0) return null;

  return (
    <div className="VirtualizedPivotTable__column-headers">
      {columnHeaders.map((headerLevel, levelIndex) => (
        <div
          key={levelIndex}
          className="VirtualizedPivotTable__header-level"
          style={{
            height: headerHeight,
            top: levelIndex * headerHeight,
          }}
        >
          {/* Empty cells for row headers */}
          {showRowHeaders &&
            Array.from({ length: rowHeaderCount }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="VirtualizedPivotTable__header-empty"
                style={{
                  width: columnWidth,
                  height: headerHeight,
                  left: index * columnWidth,
                }}
              />
            ))}

          {/* Column headers */}
          {headerLevel.map((header, headerIndex) => {
            const actualColumnIndex = showRowHeaders
              ? headerIndex + rowHeaderCount
              : headerIndex;

            const headerContent = headerRenderer
              ? headerRenderer(header, 'column')
              : header.value;

            return (
              <div
                key={headerIndex}
                className={`VirtualizedPivotTable__column-header ${
                  header.isExpandable ? 'VirtualizedPivotTable__column-header--expandable' : ''
                }`}
                style={{
                  width: columnWidth * (header.span || 1),
                  height: headerHeight,
                  left: actualColumnIndex * columnWidth,
                }}
                onClick={() => onHeaderClick?.(header)}
              >
                {headerContent}
                {header.isExpandable && (
                  <span className="VirtualizedPivotTable__expand-indicator">
                    {header.isExpanded ? '−' : '+'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Main virtualized pivot table component */
export const VirtualizedPivotTable: React.FC<VirtualizedPivotTableProps> = ({
  pivotData,
  onCellClick,
  onHeaderClick,
  rowHeight = 32,
  headerHeight = 32,
  columnWidth = 120,
  height = 400,
  width = 800,
  bufferSize = 10,
  className,
  showRowHeaders = true,
  showColumnHeaders = true,
  cellRenderer,
  headerRenderer,
}) => {
  const { metrics, measureComputation } = usePerformanceManager({
    enableVirtualization: true,
    virtualBufferSize: bufferSize,
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate dimensions
  const totalRows = pivotData.matrix.length;
  const rowHeaderCount = showRowHeaders ? (pivotData.rowHeaders[0]?.length || 0) : 0;
  const totalColumns = rowHeaderCount + (pivotData.matrix[0]?.length || 0);
  const headersTotalHeight = showColumnHeaders ? pivotData.columnHeaders.length * headerHeight : 0;
  const contentHeight = height - headersTotalHeight;

  // Virtual scrolling for rows
  const {
    startIndex: startRowIndex,
    endIndex: endRowIndex,
    totalHeight: totalRowHeight,
    offsetY: rowOffsetY,
    handleScroll,
  } = useVirtualScrolling(totalRows, rowHeight, contentHeight, bufferSize);

  // Render performance tracking
  const renderStartTime = React.useRef<number>(0);

  React.useLayoutEffect(() => {
    renderStartTime.current = performance.now();
  });

  React.useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    measureComputation(() => {}, `Virtual render: ${renderTime.toFixed(2)}ms`);
  });

  // Memoized visible rows
  const visibleRows = React.useMemo(() => {
    return measureComputation(() => {
      const rows: React.ReactNode[] = [];

      for (let rowIndex = startRowIndex; rowIndex < endRowIndex; rowIndex++) {
        if (rowIndex >= totalRows) break;

        const row = pivotData.matrix[rowIndex];
        const rowHeaders = pivotData.rowHeaders[rowIndex];

        rows.push(
          <VirtualRow
            key={rowIndex}
            rowIndex={rowIndex}
            row={row}
            rowHeaders={rowHeaders}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            onCellClick={onCellClick}
            showRowHeaders={showRowHeaders}
            cellRenderer={cellRenderer}
            headerRenderer={headerRenderer}
          />
        );
      }

      return rows;
    }, 'Visible rows computation');
  }, [
    startRowIndex,
    endRowIndex,
    pivotData.matrix,
    pivotData.rowHeaders,
    columnWidth,
    rowHeight,
    onCellClick,
    showRowHeaders,
    cellRenderer,
    headerRenderer,
    measureComputation,
  ]);

  const totalWidth = totalColumns * columnWidth;

  return (
    <div className={classNames('VirtualizedPivotTable', className)}>
      {/* Performance metrics display */}
      {process.env.NODE_ENV === 'development' && (
        <div className="VirtualizedPivotTable__metrics">
          <span>Rows: {startRowIndex}-{endRowIndex} of {totalRows}</span>
          <span>Render: {metrics.render.lastRenderTime.toFixed(2)}ms</span>
          <span>Cache: {metrics.cache.hitRate.toFixed(2)}%</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="VirtualizedPivotTable__container"
        style={{
          height,
          width,
          overflow: 'auto',
        }}
        onScroll={handleScroll}
      >
        {/* Column headers */}
        {showColumnHeaders && (
          <VirtualColumnHeaders
            columnHeaders={pivotData.columnHeaders}
            columnWidth={columnWidth}
            headerHeight={headerHeight}
            showRowHeaders={showRowHeaders}
            rowHeaderCount={rowHeaderCount}
            onHeaderClick={onHeaderClick}
            headerRenderer={headerRenderer}
          />
        )}

        {/* Scrollable content */}
        <div
          className="VirtualizedPivotTable__content"
          style={{
            height: totalRowHeight,
            width: totalWidth,
            position: 'relative',
            top: headersTotalHeight,
          }}
        >
          {/* Virtual rows container */}
          <div
            className="VirtualizedPivotTable__rows"
            style={{
              transform: `translateY(${rowOffsetY}px)`,
              position: 'relative',
              width: '100%',
            }}
          >
            {visibleRows}
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility functions

/** Get CSS class for a pivot cell based on its type */
function getCellClassName(cell: PivotCell): string {
  const baseClass = 'VirtualizedPivotTable__cell';
  const typeClass = `${baseClass}--${cell.type}`;

  const classes = [baseClass, typeClass];

  if (cell.isExpandable) {
    classes.push(`${baseClass}--expandable`);
  }

  if (cell.isExpanded) {
    classes.push(`${baseClass}--expanded`);
  }

  if (cell.level !== undefined) {
    classes.push(`${baseClass}--level-${cell.level}`);
  }

  return classes.join(' ');
}

export default VirtualizedPivotTable;