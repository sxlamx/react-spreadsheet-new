import * as React from 'react';
import classNames from 'classnames';
import { PivotHeader, PivotEventHandlers } from './types';
import './PivotHeaders.css';

/** Props for PivotHeaderCell component */
interface PivotHeaderCellProps {
  header: PivotHeader;
  onClick?: (header: PivotHeader) => void;
  onDoubleClick?: (header: PivotHeader) => void;
  enableDrillDown?: boolean;
  showTooltips?: boolean;
  isSelected?: boolean;
  className?: string;
}

/** Individual header cell component */
const PivotHeaderCell: React.FC<PivotHeaderCellProps> = ({
  header,
  onClick,
  onDoubleClick,
  enableDrillDown = true,
  showTooltips = true,
  isSelected = false,
  className,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);

  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick?.(header);
    },
    [onClick, header]
  );

  const handleDoubleClick = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDoubleClick?.(header);
    },
    [onDoubleClick, header]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          onClick?.(header);
          break;
        case '+':
          if (header.isExpandable && !header.isExpanded && enableDrillDown) {
            event.preventDefault();
            onClick?.(header);
          }
          break;
        case '-':
          if (header.isExpandable && header.isExpanded && enableDrillDown) {
            event.preventDefault();
            onClick?.(header);
          }
          break;
      }
    },
    [onClick, header, enableDrillDown]
  );

  const renderExpandIndicator = () => {
    if (!header.isExpandable || !enableDrillDown) {
      return null;
    }

    return (
      <button
        className="PivotHeaderCell__expander"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(header);
        }}
        title={header.isExpanded ? 'Collapse' : 'Expand'}
        tabIndex={-1}
      >
        <span className="PivotHeaderCell__expander-icon">
          {header.isExpanded ? '−' : '+'}
        </span>
      </button>
    );
  };

  const renderTooltip = () => {
    if (!showTooltips || !showTooltip) {
      return null;
    }

    return (
      <div className="PivotHeaderCell__tooltip">
        <div className="PivotHeaderCell__tooltip-content">
          <div className="PivotHeaderCell__tooltip-title">{header.label}</div>
          {header.field && (
            <div className="PivotHeaderCell__tooltip-field">Field: {header.field.name}</div>
          )}
          {header.path.length > 0 && (
            <div className="PivotHeaderCell__tooltip-path">
              Path: {header.path.join(' → ')}
            </div>
          )}
          <div className="PivotHeaderCell__tooltip-level">Level: {header.level + 1}</div>
          {header.span > 1 && (
            <div className="PivotHeaderCell__tooltip-span">Spans: {header.span} columns</div>
          )}
          {header.isExpandable && (
            <div className="PivotHeaderCell__tooltip-action">
              {header.isExpanded ? 'Click to collapse' : 'Click to expand'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const headerClassName = classNames(
    'PivotHeaderCell',
    className,
    {
      'PivotHeaderCell--expandable': header.isExpandable,
      'PivotHeaderCell--expanded': header.isExpanded,
      'PivotHeaderCell--selected': isSelected,
      'PivotHeaderCell--hovered': isHovered,
      [`PivotHeaderCell--level-${header.level}`]: true,
    }
  );

  return (
    <div
      className={headerClassName}
      style={{
        gridColumn: `span ${header.span}`,
        minWidth: header.span > 1 ? `${header.span * 120}px` : '120px',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        setIsHovered(true);
        if (showTooltips) setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTooltip(false);
      }}
      tabIndex={header.isExpandable ? 0 : -1}
      role={header.isExpandable ? 'button' : 'columnheader'}
      aria-label={getHeaderAriaLabel(header)}
      aria-expanded={header.isExpandable ? header.isExpanded : undefined}
      data-testid={`pivot-header-${header.level}-${header.label}`}
    >
      <div className="PivotHeaderCell__content">
        {renderExpandIndicator()}
        <span className="PivotHeaderCell__label">{header.label}</span>
      </div>
      {renderTooltip()}
    </div>
  );
};

/** Props for PivotRowHeaders component */
interface PivotRowHeadersProps {
  headers: PivotHeader[][];
  onHeaderClick?: (header: PivotHeader) => void;
  enableDrillDown?: boolean;
  showTooltips?: boolean;
  selectedHeaders?: Set<string>;
  className?: string;
}

/** Row headers component for pivot table */
export const PivotRowHeaders: React.FC<PivotRowHeadersProps> = ({
  headers,
  onHeaderClick,
  enableDrillDown = true,
  showTooltips = true,
  selectedHeaders = new Set(),
  className,
}) => {
  if (headers.length === 0) {
    return null;
  }

  return (
    <div className={classNames('PivotRowHeaders', className)}>
      {headers.map((headerLevel, levelIndex) => (
        <div
          key={levelIndex}
          className="PivotRowHeaders__level"
          data-level={levelIndex}
        >
          {headerLevel.map((header, headerIndex) => (
            <PivotHeaderCell
              key={`${levelIndex}-${headerIndex}-${header.label}`}
              header={header}
              onClick={onHeaderClick}
              enableDrillDown={enableDrillDown}
              showTooltips={showTooltips}
              isSelected={selectedHeaders.has(getHeaderKey(header))}
              className="PivotRowHeaders__cell"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Props for PivotColumnHeaders component */
interface PivotColumnHeadersProps {
  headers: PivotHeader[][];
  onHeaderClick?: (header: PivotHeader) => void;
  enableDrillDown?: boolean;
  showTooltips?: boolean;
  selectedHeaders?: Set<string>;
  className?: string;
}

/** Column headers component for pivot table */
export const PivotColumnHeaders: React.FC<PivotColumnHeadersProps> = ({
  headers,
  onHeaderClick,
  enableDrillDown = true,
  showTooltips = true,
  selectedHeaders = new Set(),
  className,
}) => {
  if (headers.length === 0) {
    return null;
  }

  return (
    <div className={classNames('PivotColumnHeaders', className)}>
      {headers.map((headerLevel, levelIndex) => (
        <div
          key={levelIndex}
          className="PivotColumnHeaders__level"
          data-level={levelIndex}
        >
          {headerLevel.map((header, headerIndex) => (
            <PivotHeaderCell
              key={`${levelIndex}-${headerIndex}-${header.label}`}
              header={header}
              onClick={onHeaderClick}
              enableDrillDown={enableDrillDown}
              showTooltips={showTooltips}
              isSelected={selectedHeaders.has(getHeaderKey(header))}
              className="PivotColumnHeaders__cell"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Props for PivotHeadersContainer component */
interface PivotHeadersContainerProps {
  rowHeaders: PivotHeader[][];
  columnHeaders: PivotHeader[][];
  onHeaderClick?: (header: PivotHeader) => void;
  enableDrillDown?: boolean;
  showTooltips?: boolean;
  selectedHeaders?: Set<string>;
  className?: string;
  cornerContent?: React.ReactNode;
}

/** Container component that manages both row and column headers */
export const PivotHeadersContainer: React.FC<PivotHeadersContainerProps> = ({
  rowHeaders,
  columnHeaders,
  onHeaderClick,
  enableDrillDown = true,
  showTooltips = true,
  selectedHeaders = new Set(),
  className,
  cornerContent,
}) => {
  const rowHeaderWidth = rowHeaders.length * 120; // Base width per level
  const columnHeaderHeight = columnHeaders.length * 32; // Base height per level

  return (
    <div className={classNames('PivotHeadersContainer', className)}>
      {/* Corner area */}
      {cornerContent && (
        <div
          className="PivotHeadersContainer__corner"
          style={{
            width: rowHeaderWidth,
            height: columnHeaderHeight,
          }}
        >
          {cornerContent}
        </div>
      )}

      {/* Column headers */}
      <div
        className="PivotHeadersContainer__column-headers"
        style={{
          height: columnHeaderHeight,
          marginLeft: rowHeaderWidth,
        }}
      >
        <PivotColumnHeaders
          headers={columnHeaders}
          onHeaderClick={onHeaderClick}
          enableDrillDown={enableDrillDown}
          showTooltips={showTooltips}
          selectedHeaders={selectedHeaders}
        />
      </div>

      {/* Row headers */}
      <div
        className="PivotHeadersContainer__row-headers"
        style={{
          width: rowHeaderWidth,
          marginTop: columnHeaderHeight,
        }}
      >
        <PivotRowHeaders
          headers={rowHeaders}
          onHeaderClick={onHeaderClick}
          enableDrillDown={enableDrillDown}
          showTooltips={showTooltips}
          selectedHeaders={selectedHeaders}
        />
      </div>
    </div>
  );
};

/** Hook for managing header selection state */
export function useHeaderSelection() {
  const [selectedHeaders, setSelectedHeaders] = React.useState<Set<string>>(new Set());

  const selectHeader = React.useCallback((header: PivotHeader) => {
    const key = getHeaderKey(header);
    setSelectedHeaders(prev => new Set([...prev, key]));
  }, []);

  const deselectHeader = React.useCallback((header: PivotHeader) => {
    const key = getHeaderKey(header);
    setSelectedHeaders(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggleHeader = React.useCallback((header: PivotHeader) => {
    const key = getHeaderKey(header);
    setSelectedHeaders(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedHeaders(new Set());
  }, []);

  const isSelected = React.useCallback((header: PivotHeader) => {
    return selectedHeaders.has(getHeaderKey(header));
  }, [selectedHeaders]);

  return {
    selectedHeaders,
    selectHeader,
    deselectHeader,
    toggleHeader,
    clearSelection,
    isSelected,
  };
}

/** Generate a unique key for a header */
function getHeaderKey(header: PivotHeader): string {
  return `${header.level}-${header.path.join('/')}-${header.label}`;
}

/** Generate accessible aria-label for a header */
function getHeaderAriaLabel(header: PivotHeader): string {
  const parts: string[] = [];

  parts.push(`${header.label} header`);
  parts.push(`level ${header.level + 1}`);

  if (header.span > 1) {
    parts.push(`spans ${header.span} columns`);
  }

  if (header.isExpandable) {
    parts.push(header.isExpanded ? 'expanded' : 'collapsed');
    parts.push('expandable');
  }

  if (header.field) {
    parts.push(`field ${header.field.name}`);
  }

  return parts.join(', ');
}

/** Utility function to calculate header dimensions */
export function calculateHeaderDimensions(
  rowHeaders: PivotHeader[][],
  columnHeaders: PivotHeader[][],
  options: {
    cellWidth?: number;
    cellHeight?: number;
    minCellWidth?: number;
    maxCellWidth?: number;
  } = {}
) {
  const {
    cellWidth = 120,
    cellHeight = 32,
    minCellWidth = 80,
    maxCellWidth = 200,
  } = options;

  const rowHeaderWidth = Math.max(
    rowHeaders.length * cellWidth,
    minCellWidth
  );

  const columnHeaderHeight = Math.max(
    columnHeaders.length * cellHeight,
    cellHeight
  );

  // Calculate maximum span for dynamic width adjustment
  const maxColumnSpan = Math.max(
    ...columnHeaders.flat().map(h => h.span),
    1
  );

  const adjustedCellWidth = Math.min(
    Math.max(cellWidth, minCellWidth),
    maxCellWidth
  );

  return {
    rowHeaderWidth,
    columnHeaderHeight,
    cellWidth: adjustedCellWidth,
    cellHeight,
    maxColumnSpan,
  };
}