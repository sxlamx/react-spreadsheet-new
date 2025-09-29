import { Matrix } from "../matrix";
import { Point } from "../point";

/** Raw data structure for pivot tables */
export type PivotDataRow = Record<string, any>;
export type PivotDataSet = PivotDataRow[];

/** Field definition for pivot table dimensions and values */
export type PivotField = {
  id: string;
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  /** Optional custom formatter function */
  formatter?: (value: any) => string;
};

/** Value field with aggregation configuration */
export type PivotValueField = {
  field: PivotField;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'countDistinct';
  format?: string;
  /** Custom name for the aggregated field */
  displayName?: string;
};

/** Filter configuration for pivot data */
export type PivotFilter = {
  field: PivotField;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'in' | 'notIn' | 'between' | 'isEmpty' | 'isNotEmpty';
  value: any;
  /** Whether filter is currently active */
  enabled?: boolean;
};

/** Complete pivot table configuration */
export type PivotConfiguration = {
  /** Fields used as row dimensions (grouping) */
  rows: PivotField[];
  /** Fields used as column dimensions (grouping) */
  columns: PivotField[];
  /** Fields to aggregate as values */
  values: PivotValueField[];
  /** Filters applied to the data */
  filters: PivotFilter[];
  /** Whether to show subtotals */
  showSubtotals?: boolean;
  /** Whether to show grand totals */
  showGrandTotals?: boolean;
  /** Maximum number of rows to display (for performance) */
  maxRows?: number;
  /** Maximum number of columns to display (for performance) */
  maxColumns?: number;
};

/** Individual cell in the pivot table */
export type PivotCell = {
  /** Raw value from computation */
  value: any;
  /** Formatted display value */
  formattedValue: string;
  /** Type of cell for styling and behavior */
  type: 'data' | 'rowHeader' | 'columnHeader' | 'subtotal' | 'grandTotal' | 'empty';
  /** Hierarchical level for grouped data */
  level?: number;
  /** Whether this cell can be expanded to show more detail */
  isExpandable?: boolean;
  /** Whether this cell is currently expanded */
  isExpanded?: boolean;
  /** Hierarchical path for drill-down navigation */
  path?: string[];
  /** Field that this cell represents (for headers) */
  field?: PivotField;
  /** Reference to original data rows that contributed to this cell */
  originalRows?: number[];
  /** Additional metadata for the cell */
  metadata?: Record<string, any>;
};

/** Pivot table structure as a matrix */
export type PivotMatrix = Matrix<PivotCell>;

/** Header information for hierarchical display */
export type PivotHeader = {
  /** Display label for the header */
  label: string;
  /** Hierarchical level (0 = top level) */
  level: number;
  /** Number of columns/rows this header spans */
  span: number;
  /** Hierarchical path for navigation */
  path: string[];
  /** Field definition for this header */
  field?: PivotField;
  /** Whether this header can be expanded */
  isExpandable?: boolean;
  /** Whether this header is currently expanded */
  isExpanded?: boolean;
  /** Parent header in the hierarchy */
  parent?: PivotHeader;
  /** Child headers in the hierarchy */
  children?: PivotHeader[];
};

/** Complete pivot table structure */
export type PivotStructure = {
  /** The main data matrix */
  matrix: PivotMatrix;
  /** Multi-level row headers */
  rowHeaders: PivotHeader[][];
  /** Multi-level column headers */
  columnHeaders: PivotHeader[][];
  /** Current visible row count */
  rowCount: number;
  /** Current visible column count */
  columnCount: number;
  /** Total rows including all possible expansions */
  totalRows: number;
  /** Total columns including all possible expansions */
  totalColumns: number;
  /** Summary statistics */
  summary?: {
    totalDataRows: number;
    totalDataColumns: number;
    computationTime?: number;
  };
};

/** Server-side API request structure */
export type PivotRequest = {
  /** Dataset identifier for server-side computation */
  dataset: string;
  /** Pivot configuration */
  configuration: PivotConfiguration;
  /** Pagination for large result sets */
  page?: {
    offset: number;
    limit: number;
  };
  /** Currently expanded paths for drill-down */
  expandedPaths?: string[][];
  /** Cache key for incremental updates */
  cacheKey?: string;
};

/** Server-side API response structure */
export type PivotResponse = {
  /** The computed pivot structure */
  structure: PivotStructure;
  /** Response metadata */
  metadata: {
    /** Total number of source data rows */
    totalDataRows: number;
    /** Server computation time in milliseconds */
    computationTime: number;
    /** Cache key for subsequent requests */
    cacheKey?: string;
    /** Timestamp of computation */
    timestamp: number;
  };
  /** Whether more data is available (for pagination) */
  hasMore?: boolean;
  /** Error information if computation failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

/** Request for drill-down operations */
export type PivotDrillRequest = {
  /** Cache key from previous computation */
  cacheKey: string;
  /** Path to expand or collapse */
  path: string[];
  /** Action to perform */
  action: 'expand' | 'collapse';
};

/** Grouped data structure for internal computation */
export type GroupedData = Map<string, {
  /** Key representing the group */
  key: string;
  /** Path in the hierarchy */
  path: string[];
  /** Level in the hierarchy */
  level: number;
  /** Raw data rows in this group */
  rows: PivotDataRow[];
  /** Child groups */
  children?: Map<string, GroupedData>;
  /** Parent group */
  parent?: GroupedData;
}>;

/** Aggregated data structure */
export type AggregatedData = Map<string, {
  /** Aggregated values for each value field */
  values: Record<string, any>;
  /** Group information */
  group: {
    key: string;
    path: string[];
    level: number;
  };
  /** Original row count */
  rowCount: number;
}>;

/** Export format options */
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

/** Export configuration */
export type ExportConfig = {
  /** Format to export */
  format: ExportFormat;
  /** Whether to include headers */
  includeHeaders?: boolean;
  /** Whether to include subtotals */
  includeSubtotals?: boolean;
  /** Whether to include grand totals */
  includeGrandTotals?: boolean;
  /** Custom filename */
  filename?: string;
  /** Additional export options */
  options?: Record<string, any>;
};

/** Pivot table display options */
export type PivotDisplayOptions = {
  /** Whether to show row numbers */
  showRowNumbers?: boolean;
  /** Whether to show column letters */
  showColumnLetters?: boolean;
  /** Whether to enable cell selection */
  enableSelection?: boolean;
  /** Whether to enable drill-down */
  enableDrillDown?: boolean;
  /** Whether to show tooltips */
  showTooltips?: boolean;
  /** Custom CSS classes */
  customClasses?: {
    table?: string;
    header?: string;
    cell?: string;
    subtotal?: string;
    grandTotal?: string;
  };
};

/** Event handler types */
export type PivotEventHandlers = {
  /** Called when a cell is clicked */
  onCellClick?: (cell: PivotCell, coordinates: Point) => void;
  /** Called when a header is clicked */
  onHeaderClick?: (header: PivotHeader) => void;
  /** Called when drill-down action is performed */
  onDrillDown?: (path: string[], action: 'expand' | 'collapse') => void;
  /** Called when configuration changes */
  onConfigurationChange?: (config: PivotConfiguration) => void;
  /** Called when export is requested */
  onExport?: (config: ExportConfig) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
};