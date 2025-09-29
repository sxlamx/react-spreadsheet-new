import * as React from 'react';
import { PivotStructure, PivotCell, PivotHeader } from './types';

/** Drill-down state management */
export interface DrillDownState {
  /** Currently expanded paths */
  expandedPaths: string[][];
  /** History of drill-down operations for undo/redo */
  history: DrillDownHistoryEntry[];
  /** Current position in history */
  historyIndex: number;
  /** Breadcrumb path for navigation */
  breadcrumbs: DrillDownBreadcrumb[];
  /** Currently focused path */
  focusedPath: string[] | null;
}

/** Single drill-down operation history entry */
export interface DrillDownHistoryEntry {
  /** Type of operation */
  type: 'expand' | 'collapse' | 'expand-all' | 'collapse-all';
  /** Path that was operated on */
  path: string[];
  /** Previous expanded paths state */
  previousExpandedPaths: string[][];
  /** New expanded paths state */
  newExpandedPaths: string[][];
  /** Timestamp of operation */
  timestamp: number;
  /** Optional description */
  description?: string;
}

/** Breadcrumb for navigation */
export interface DrillDownBreadcrumb {
  /** Display label */
  label: string;
  /** Path to navigate to */
  path: string[];
  /** Whether this is the current level */
  isCurrent: boolean;
  /** Whether this level can be collapsed */
  canCollapse: boolean;
}

/** Configuration for drill-down behavior */
export interface DrillDownConfig {
  /** Maximum drill-down depth */
  maxDepth?: number;
  /** Whether to enable keyboard navigation */
  enableKeyboardNavigation?: boolean;
  /** Whether to show drill-down indicators */
  showIndicators?: boolean;
  /** Whether to animate expand/collapse */
  enableAnimation?: boolean;
  /** Auto-expand single child nodes */
  autoExpandSingleChild?: boolean;
  /** Maximum history size */
  maxHistorySize?: number;
}

/** Hook for managing drill-down state */
export function useDrillDownManager(
  initialExpandedPaths: string[][] = [],
  config: DrillDownConfig = {}
): {
  state: DrillDownState;
  expand: (path: string[]) => void;
  collapse: (path: string[]) => void;
  toggle: (path: string[]) => void;
  expandAll: (paths: string[][]) => void;
  collapseAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  navigateTo: (path: string[]) => void;
  reset: () => void;
  generateBreadcrumbs: (currentPath: string[]) => DrillDownBreadcrumb[];
} {
  const {
    maxDepth = 10,
    maxHistorySize = 50,
    autoExpandSingleChild = false,
  } = config;

  const [state, setState] = React.useState<DrillDownState>(() => ({
    expandedPaths: initialExpandedPaths,
    history: [],
    historyIndex: -1,
    breadcrumbs: [],
    focusedPath: null,
  }));

  // Add operation to history
  const addToHistory = React.useCallback(
    (
      type: DrillDownHistoryEntry['type'],
      path: string[],
      previousPaths: string[][],
      newPaths: string[][],
      description?: string
    ) => {
      setState(prev => {
        const newHistory = [
          ...prev.history.slice(0, prev.historyIndex + 1),
          {
            type,
            path,
            previousExpandedPaths: previousPaths,
            newExpandedPaths: newPaths,
            timestamp: Date.now(),
            description,
          },
        ].slice(-maxHistorySize);

        return {
          ...prev,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      });
    },
    [maxHistorySize]
  );

  // Check if path is expanded
  const isPathExpanded = React.useCallback(
    (path: string[]): boolean => {
      return state.expandedPaths.some(expandedPath =>
        path.length === expandedPath.length &&
        path.every((segment, index) => segment === expandedPath[index])
      );
    },
    [state.expandedPaths]
  );

  // Expand a path
  const expand = React.useCallback(
    (path: string[]) => {
      if (path.length > maxDepth) {
        console.warn(`Maximum drill-down depth (${maxDepth}) exceeded`);
        return;
      }

      if (isPathExpanded(path)) {
        return; // Already expanded
      }

      const previousPaths = [...state.expandedPaths];
      const newPaths = [...state.expandedPaths, path];

      setState(prev => ({
        ...prev,
        expandedPaths: newPaths,
      }));

      addToHistory('expand', path, previousPaths, newPaths, `Expanded ${path.join(' → ')}`);
    },
    [maxDepth, isPathExpanded, state.expandedPaths, addToHistory]
  );

  // Collapse a path
  const collapse = React.useCallback(
    (path: string[]) => {
      if (!isPathExpanded(path)) {
        return; // Not expanded
      }

      const previousPaths = [...state.expandedPaths];
      const newPaths = state.expandedPaths.filter(expandedPath =>
        !(path.length === expandedPath.length &&
          path.every((segment, index) => segment === expandedPath[index]))
      );

      // Also collapse all child paths
      const filteredPaths = newPaths.filter(expandedPath =>
        !isChildPath(expandedPath, path)
      );

      setState(prev => ({
        ...prev,
        expandedPaths: filteredPaths,
      }));

      addToHistory('collapse', path, previousPaths, filteredPaths, `Collapsed ${path.join(' → ')}`);
    },
    [isPathExpanded, state.expandedPaths, addToHistory]
  );

  // Toggle a path
  const toggle = React.useCallback(
    (path: string[]) => {
      if (isPathExpanded(path)) {
        collapse(path);
      } else {
        expand(path);
      }
    },
    [isPathExpanded, expand, collapse]
  );

  // Expand all provided paths
  const expandAll = React.useCallback(
    (paths: string[][]) => {
      const previousPaths = [...state.expandedPaths];
      const validPaths = paths.filter(path => path.length <= maxDepth);
      const newPaths = [...state.expandedPaths];

      for (const path of validPaths) {
        if (!newPaths.some(expandedPath =>
          path.length === expandedPath.length &&
          path.every((segment, index) => segment === expandedPath[index])
        )) {
          newPaths.push(path);
        }
      }

      setState(prev => ({
        ...prev,
        expandedPaths: newPaths,
      }));

      addToHistory('expand-all', [], previousPaths, newPaths, `Expanded ${validPaths.length} paths`);
    },
    [state.expandedPaths, maxDepth, addToHistory]
  );

  // Collapse all paths
  const collapseAll = React.useCallback(() => {
    const previousPaths = [...state.expandedPaths];

    setState(prev => ({
      ...prev,
      expandedPaths: [],
      focusedPath: null,
    }));

    addToHistory('collapse-all', [], previousPaths, [], 'Collapsed all paths');
  }, [state.expandedPaths, addToHistory]);

  // Undo last operation
  const undo = React.useCallback(() => {
    if (state.historyIndex < 0) return;

    const entry = state.history[state.historyIndex];
    setState(prev => ({
      ...prev,
      expandedPaths: entry.previousExpandedPaths,
      historyIndex: prev.historyIndex - 1,
    }));
  }, [state.historyIndex, state.history]);

  // Redo last undone operation
  const redo = React.useCallback(() => {
    if (state.historyIndex >= state.history.length - 1) return;

    const entry = state.history[state.historyIndex + 1];
    setState(prev => ({
      ...prev,
      expandedPaths: entry.newExpandedPaths,
      historyIndex: prev.historyIndex + 1,
    }));
  }, [state.historyIndex, state.history]);

  // Navigate to specific path
  const navigateTo = React.useCallback(
    (path: string[]) => {
      setState(prev => ({
        ...prev,
        focusedPath: path,
      }));
    },
    []
  );

  // Reset to initial state
  const reset = React.useCallback(() => {
    setState({
      expandedPaths: initialExpandedPaths,
      history: [],
      historyIndex: -1,
      breadcrumbs: [],
      focusedPath: null,
    });
  }, [initialExpandedPaths]);

  // Generate breadcrumbs for current path
  const generateBreadcrumbs = React.useCallback(
    (currentPath: string[]): DrillDownBreadcrumb[] => {
      const breadcrumbs: DrillDownBreadcrumb[] = [];

      // Add root level
      breadcrumbs.push({
        label: 'All Data',
        path: [],
        isCurrent: currentPath.length === 0,
        canCollapse: false,
      });

      // Add each level of the current path
      for (let i = 0; i < currentPath.length; i++) {
        const pathSegment = currentPath.slice(0, i + 1);
        const isExpanded = isPathExpanded(pathSegment);

        breadcrumbs.push({
          label: currentPath[i],
          path: pathSegment,
          isCurrent: i === currentPath.length - 1,
          canCollapse: isExpanded,
        });
      }

      return breadcrumbs;
    },
    [isPathExpanded]
  );

  // Can undo/redo flags
  const canUndo = state.historyIndex >= 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    expand,
    collapse,
    toggle,
    expandAll,
    collapseAll,
    undo,
    redo,
    canUndo,
    canRedo,
    navigateTo,
    reset,
    generateBreadcrumbs,
  };
}

/** Drill-down breadcrumb navigation component */
export const DrillDownBreadcrumbs: React.FC<{
  breadcrumbs: DrillDownBreadcrumb[];
  onNavigate: (path: string[]) => void;
  onCollapse?: (path: string[]) => void;
  className?: string;
}> = ({ breadcrumbs, onNavigate, onCollapse, className }) => {
  return (
    <nav className={`DrillDownBreadcrumbs ${className || ''}`}>
      <ol className="DrillDownBreadcrumbs__list">
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={index}
            className={`DrillDownBreadcrumbs__item ${
              breadcrumb.isCurrent ? 'DrillDownBreadcrumbs__item--current' : ''
            }`}
          >
            {!breadcrumb.isCurrent ? (
              <button
                className="DrillDownBreadcrumbs__link"
                onClick={() => onNavigate(breadcrumb.path)}
                type="button"
              >
                {breadcrumb.label}
              </button>
            ) : (
              <span className="DrillDownBreadcrumbs__current">{breadcrumb.label}</span>
            )}

            {breadcrumb.canCollapse && onCollapse && (
              <button
                className="DrillDownBreadcrumbs__collapse"
                onClick={() => onCollapse(breadcrumb.path)}
                title="Collapse this level"
                type="button"
              >
                ×
              </button>
            )}

            {index < breadcrumbs.length - 1 && (
              <span className="DrillDownBreadcrumbs__separator">→</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

/** Drill-down controls component */
export const DrillDownControls: React.FC<{
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onReset: () => void;
  className?: string;
}> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExpandAll,
  onCollapseAll,
  onReset,
  className,
}) => {
  return (
    <div className={`DrillDownControls ${className || ''}`}>
      <div className="DrillDownControls__group">
        <button
          className="DrillDownControls__button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last drill-down operation"
          type="button"
        >
          ↶ Undo
        </button>
        <button
          className="DrillDownControls__button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo last drill-down operation"
          type="button"
        >
          ↷ Redo
        </button>
      </div>

      <div className="DrillDownControls__group">
        <button
          className="DrillDownControls__button"
          onClick={onExpandAll}
          title="Expand all levels"
          type="button"
        >
          ⊞ Expand All
        </button>
        <button
          className="DrillDownControls__button"
          onClick={onCollapseAll}
          title="Collapse all levels"
          type="button"
        >
          ⊟ Collapse All
        </button>
      </div>

      <div className="DrillDownControls__group">
        <button
          className="DrillDownControls__button DrillDownControls__button--reset"
          onClick={onReset}
          title="Reset to initial state"
          type="button"
        >
          ⟲ Reset
        </button>
      </div>
    </div>
  );
};

/** Enhanced drill-down indicator for cells */
export const DrillDownIndicator: React.FC<{
  isExpandable: boolean;
  isExpanded: boolean;
  level: number;
  hasChildren?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ isExpandable, isExpanded, level, hasChildren, onClick, className }) => {
  if (!isExpandable) return null;

  return (
    <button
      className={`DrillDownIndicator ${className || ''} ${
        isExpanded ? 'DrillDownIndicator--expanded' : 'DrillDownIndicator--collapsed'
      }`}
      onClick={onClick}
      title={isExpanded ? 'Click to collapse' : 'Click to expand'}
      type="button"
      style={{ '--level': level } as React.CSSProperties}
    >
      <span className="DrillDownIndicator__icon">
        {isExpanded ? '−' : '+'}
      </span>
      {hasChildren && (
        <span className="DrillDownIndicator__children-count">
          {/* Could show number of children here */}
        </span>
      )}
    </button>
  );
};

// Utility functions

/** Check if a path is a child of another path */
function isChildPath(childPath: string[], parentPath: string[]): boolean {
  if (childPath.length <= parentPath.length) return false;

  return parentPath.every((segment, index) => segment === childPath[index]);
}

/** Get all expandable paths from pivot structure */
export function getExpandablePaths(structure: PivotStructure): string[][] {
  const paths: string[][] = [];

  // Extract from row headers
  for (const headerLevel of structure.rowHeaders) {
    for (const header of headerLevel) {
      if (header.isExpandable) {
        paths.push(header.path);
      }
    }
  }

  // Extract from column headers
  for (const headerLevel of structure.columnHeaders) {
    for (const header of headerLevel) {
      if (header.isExpandable) {
        paths.push(header.path);
      }
    }
  }

  // Extract from cells
  for (const row of structure.matrix) {
    for (const cell of row) {
      if (cell?.isExpandable && cell.path) {
        paths.push(cell.path);
      }
    }
  }

  // Remove duplicates
  return paths.filter((path, index, self) =>
    index === self.findIndex(p =>
      p.length === path.length &&
      p.every((segment, i) => segment === path[i])
    )
  );
}

/** Get all possible drill-down paths up to a certain depth */
export function getAllPossiblePaths(
  structure: PivotStructure,
  maxDepth: number = 5
): string[][] {
  const allPaths: string[][] = [];
  const expandablePaths = getExpandablePaths(structure);

  // Generate all possible combinations up to maxDepth
  function generateCombinations(currentPath: string[], depth: number) {
    if (depth >= maxDepth) return;

    for (const expandablePath of expandablePaths) {
      // Check if this path could be a valid next step
      if (expandablePath.length === currentPath.length + 1 &&
          currentPath.every((segment, index) => segment === expandablePath[index])) {
        const newPath = [...expandablePath];
        allPaths.push(newPath);
        generateCombinations(newPath, depth + 1);
      }
    }
  }

  generateCombinations([], 0);
  return allPaths;
}

export default useDrillDownManager;