import * as React from 'react';
import classNames from 'classnames';
import { CellComponentProps, CellBase } from '../types';
import { Point } from '../point';
import { PivotCell as PivotCellData, PivotEventHandlers } from './types';
import './PivotCell.css';

/** Extended cell data that includes pivot-specific information */
export interface PivotCellBase extends CellBase {
  pivotCell?: PivotCellData;
}

/** Props for the PivotCell component */
export interface PivotCellProps extends CellComponentProps<PivotCellBase> {
  /** Event handlers for pivot-specific actions */
  pivotHandlers?: PivotEventHandlers;
  /** Whether drill-down is enabled */
  enableDrillDown?: boolean;
  /** Whether tooltips should be shown */
  showTooltips?: boolean;
  /** Custom class names for different cell types */
  customClasses?: {
    header?: string;
    data?: string;
    subtotal?: string;
    grandTotal?: string;
    empty?: string;
  };
}

/** Pivot-aware cell component that extends the base spreadsheet cell */
export const PivotCell: React.FC<PivotCellProps> = ({
  data,
  row,
  column,
  selected,
  active,
  copied,
  dragging,
  mode,
  select,
  activate,
  setCellData,
  setCellDimensions,
  DataViewer,
  pivotHandlers,
  enableDrillDown = true,
  showTooltips = true,
  customClasses = {},
  ...props
}) => {
  const cellRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);

  const pivotCell = data?.pivotCell;
  const point: Point = { row, column };

  // Handle cell click with pivot-specific logic
  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      // Call original select handler
      select(point);

      // Handle pivot-specific click behavior
      if (pivotCell && pivotHandlers?.onCellClick) {
        pivotHandlers.onCellClick(pivotCell, point);
      }

      // Handle drill-down for expandable cells
      if (
        pivotCell?.isExpandable &&
        enableDrillDown &&
        pivotHandlers?.onDrillDown &&
        event.detail === 2 // Double-click
      ) {
        const action = pivotCell.isExpanded ? 'collapse' : 'expand';
        pivotHandlers.onDrillDown(pivotCell.path || [], action);
      }
    },
    [select, point, pivotCell, pivotHandlers, enableDrillDown]
  );

  // Handle cell activation
  const handleActivate = React.useCallback(
    (event: React.MouseEvent) => {
      activate(point);
    },
    [activate, point]
  );

  // Handle keyboard events for drill-down
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!pivotCell?.isExpandable || !enableDrillDown || !pivotHandlers?.onDrillDown) {
        return;
      }

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          const action = pivotCell.isExpanded ? 'collapse' : 'expand';
          pivotHandlers.onDrillDown(pivotCell.path || [], action);
          break;
        case '+':
          if (!pivotCell.isExpanded) {
            event.preventDefault();
            pivotHandlers.onDrillDown(pivotCell.path || [], 'expand');
          }
          break;
        case '-':
          if (pivotCell.isExpanded) {
            event.preventDefault();
            pivotHandlers.onDrillDown(pivotCell.path || [], 'collapse');
          }
          break;
      }
    },
    [pivotCell, enableDrillDown, pivotHandlers]
  );

  // Update cell dimensions when ref changes
  React.useEffect(() => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setCellDimensions(point, {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      });
    }
  }, [setCellDimensions, point, data?.value]);

  // Get CSS classes based on cell type and state
  const getCellClassName = () => {
    if (!pivotCell) {
      return classNames('Spreadsheet__cell', 'PivotCell', {
        'PivotCell--selected': selected,
        'PivotCell--active': active,
        'PivotCell--copied': copied,
        'PivotCell--dragging': dragging,
      });
    }

    const baseClass = 'PivotCell';
    const typeClass = `${baseClass}--${pivotCell.type}`;

    return classNames(
      'Spreadsheet__cell',
      baseClass,
      typeClass,
      customClasses[pivotCell.type],
      {
        [`${baseClass}--selected`]: selected,
        [`${baseClass}--active`]: active,
        [`${baseClass}--copied`]: copied,
        [`${baseClass}--dragging`]: dragging,
        [`${baseClass}--expandable`]: pivotCell.isExpandable,
        [`${baseClass}--expanded`]: pivotCell.isExpanded,
        [`${baseClass}--hovered`]: isHovered,
        [`${baseClass}--level-${pivotCell.level}`]: pivotCell.level !== undefined,
        [`${baseClass}--drill-enabled`]: enableDrillDown && pivotCell.isExpandable,
      }
    );
  };

  // Render expand/collapse indicator
  const renderExpandIndicator = () => {
    if (!pivotCell?.isExpandable || !enableDrillDown) {
      return null;
    }

    return (
      <button
        className="PivotCell__expander"
        onClick={(e) => {
          e.stopPropagation();
          if (pivotHandlers?.onDrillDown) {
            const action = pivotCell.isExpanded ? 'collapse' : 'expand';
            pivotHandlers.onDrillDown(pivotCell.path || [], action);
          }
        }}
        title={pivotCell.isExpanded ? 'Collapse' : 'Expand'}
        tabIndex={-1}
      >
        <span className="PivotCell__expander-icon">
          {pivotCell.isExpanded ? '−' : '+'}
        </span>
      </button>
    );
  };

  // Render cell content based on type
  const renderCellContent = () => {
    if (!pivotCell) {
      return (
        <DataViewer
          cell={data}
          row={row}
          column={column}
          setCellData={setCellData}
          evaluatedCell={data}
        />
      );
    }

    const content = (
      <div className="PivotCell__content">
        {pivotCell.type === 'rowHeader' && renderExpandIndicator()}

        <span
          className="PivotCell__value"
          style={{
            paddingLeft: pivotCell.level ? `${pivotCell.level * 16}px` : undefined,
          }}
        >
          {pivotCell.formattedValue}
        </span>

        {pivotCell.type !== 'rowHeader' && renderExpandIndicator()}
      </div>
    );

    return content;
  };

  // Render tooltip if enabled
  const renderTooltip = () => {
    if (!showTooltips || !showTooltip || !pivotCell) {
      return null;
    }

    const tooltipContent = getTooltipContent(pivotCell);
    if (!tooltipContent) return null;

    return (
      <div className="PivotCell__tooltip">
        {tooltipContent}
      </div>
    );
  };

  // Handle mouse events for hover state and tooltips
  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
    if (showTooltips && pivotCell) {
      setShowTooltip(true);
    }
  }, [showTooltips, pivotCell]);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
  }, []);

  return (
    <div
      ref={cellRef}
      className={getCellClassName()}
      onClick={handleClick}
      onDoubleClick={handleActivate}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={active ? 0 : -1}
      role={pivotCell?.isExpandable ? 'button' : 'gridcell'}
      aria-label={getAriaLabel(pivotCell, row, column)}
      aria-expanded={pivotCell?.isExpandable ? pivotCell.isExpanded : undefined}
      data-testid={`pivot-cell-${row}-${column}`}
    >
      {renderCellContent()}
      {renderTooltip()}
    </div>
  );
};

/** Generate tooltip content for a pivot cell */
function getTooltipContent(pivotCell: PivotCellData): React.ReactNode {
  const parts: string[] = [];

  if (pivotCell.type === 'data' && pivotCell.originalRows?.length) {
    parts.push(`Based on ${pivotCell.originalRows.length} records`);
  }

  if (pivotCell.path && pivotCell.path.length > 0) {
    parts.push(`Path: ${pivotCell.path.join(' → ')}`);
  }

  if (pivotCell.field) {
    parts.push(`Field: ${pivotCell.field.name}`);
  }

  if (pivotCell.isExpandable) {
    parts.push(`${pivotCell.isExpanded ? 'Click to collapse' : 'Click to expand'}`);
  }

  if (parts.length === 0) return null;

  return (
    <div className="PivotCell__tooltip-content">
      {parts.map((part, index) => (
        <div key={index} className="PivotCell__tooltip-line">
          {part}
        </div>
      ))}
    </div>
  );
}

/** Generate accessible aria-label for a pivot cell */
function getAriaLabel(pivotCell: PivotCellData | undefined, row: number, column: number): string {
  if (!pivotCell) {
    return `Cell ${row + 1}, ${column + 1}`;
  }

  const parts: string[] = [];

  parts.push(`${pivotCell.type} cell`);
  parts.push(pivotCell.formattedValue);

  if (pivotCell.level !== undefined) {
    parts.push(`level ${pivotCell.level + 1}`);
  }

  if (pivotCell.isExpandable) {
    parts.push(pivotCell.isExpanded ? 'expanded' : 'collapsed');
    parts.push('expandable');
  }

  if (pivotCell.field) {
    parts.push(`field ${pivotCell.field.name}`);
  }

  return parts.join(', ');
}

/** Higher-order component to enhance a cell component with pivot functionality */
export function withPivotCell<T extends CellComponentProps<any>>(
  WrappedComponent: React.ComponentType<T>
) {
  const PivotEnhancedCell = React.forwardRef<any, T & PivotCellProps>((props, ref) => {
    const { data, pivotHandlers, enableDrillDown, showTooltips, customClasses, ...rest } = props;

    // If this is a pivot cell, use PivotCell, otherwise use the wrapped component
    if (data?.pivotCell) {
      return (
        <PivotCell
          {...rest}
          data={data}
          pivotHandlers={pivotHandlers}
          enableDrillDown={enableDrillDown}
          showTooltips={showTooltips}
          customClasses={customClasses}
          ref={ref}
        />
      );
    }

    return <WrappedComponent {...rest} data={data} ref={ref} />;
  });

  PivotEnhancedCell.displayName = `withPivotCell(${WrappedComponent.displayName || WrappedComponent.name})`;

  return PivotEnhancedCell;
}

/** Default export */
export default PivotCell;