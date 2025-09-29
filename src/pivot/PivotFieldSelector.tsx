import * as React from 'react';
import classNames from 'classnames';
import {
  PivotField,
  PivotConfiguration,
  PivotValueField,
  PivotFilter,
} from './types';
import { getAvailableAggregations, getDefaultAggregation } from './aggregations';
import './PivotFieldSelector.css';

/** Drag and drop area types */
type DropZoneType = 'available' | 'rows' | 'columns' | 'values' | 'filters';

/** Props for field selector component */
export interface PivotFieldSelectorProps {
  /** Available fields to choose from */
  availableFields: PivotField[];
  /** Current pivot configuration */
  configuration: PivotConfiguration;
  /** Callback when configuration changes */
  onChange: (config: PivotConfiguration) => void;
  /** Whether the selector is read-only */
  readOnly?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Show/hide specific sections */
  showSections?: {
    rows?: boolean;
    columns?: boolean;
    values?: boolean;
    filters?: boolean;
  };
}

/** Individual field chip component */
interface FieldChipProps {
  field: PivotField;
  valueField?: PivotValueField;
  filter?: PivotFilter;
  onRemove?: () => void;
  onEditAggregation?: (aggregation: PivotValueField['aggregation']) => void;
  onEditFilter?: (operator: string, value: any) => void;
  isDragging?: boolean;
  showAggregation?: boolean;
  showFilter?: boolean;
  readOnly?: boolean;
}

const FieldChip: React.FC<FieldChipProps> = ({
  field,
  valueField,
  filter,
  onRemove,
  onEditAggregation,
  onEditFilter,
  isDragging = false,
  showAggregation = false,
  showFilter = false,
  readOnly = false,
}) => {
  const [showAggregationDropdown, setShowAggregationDropdown] = React.useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = React.useState(false);

  const availableAggregations = React.useMemo(() => {
    return getAvailableAggregations(field.dataType);
  }, [field.dataType]);

  const handleDragStart = React.useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;

      event.dataTransfer.setData('application/json', JSON.stringify({
        field,
        sourceType: 'field'
      }));
      event.dataTransfer.effectAllowed = 'move';
    },
    [field, readOnly]
  );

  const renderAggregationSelector = () => {
    if (!showAggregation || !valueField || readOnly) return null;

    return (
      <div className="FieldChip__aggregation">
        <button
          className="FieldChip__aggregation-button"
          onClick={() => setShowAggregationDropdown(!showAggregationDropdown)}
          type="button"
        >
          {valueField.aggregation}
          <span className="FieldChip__dropdown-arrow">▼</span>
        </button>
        {showAggregationDropdown && (
          <div className="FieldChip__dropdown">
            {availableAggregations.map(agg => (
              <button
                key={agg}
                className={classNames('FieldChip__dropdown-item', {
                  'FieldChip__dropdown-item--selected': agg === valueField.aggregation
                })}
                onClick={() => {
                  onEditAggregation?.(agg);
                  setShowAggregationDropdown(false);
                }}
                type="button"
              >
                {agg}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFilterControls = () => {
    if (!showFilter || !filter || readOnly) return null;

    return (
      <div className="FieldChip__filter">
        <select
          className="FieldChip__filter-operator"
          value={filter.operator}
          onChange={(e) => onEditFilter?.(e.target.value, filter.value)}
        >
          <option value="equals">Equals</option>
          <option value="notEquals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="notContains">Not Contains</option>
          <option value="greaterThan">Greater Than</option>
          <option value="lessThan">Less Than</option>
          <option value="in">In</option>
          <option value="between">Between</option>
        </select>
        <input
          className="FieldChip__filter-value"
          type="text"
          value={typeof filter.value === 'string' ? filter.value : JSON.stringify(filter.value)}
          onChange={(e) => onEditFilter?.(filter.operator, e.target.value)}
          placeholder="Filter value"
        />
      </div>
    );
  };

  return (
    <div
      className={classNames('FieldChip', {
        'FieldChip--dragging': isDragging,
        'FieldChip--read-only': readOnly,
        [`FieldChip--${field.dataType}`]: true,
      })}
      draggable={!readOnly}
      onDragStart={handleDragStart}
    >
      <div className="FieldChip__content">
        <span className="FieldChip__icon">
          {field.dataType === 'number' ? '123' :
           field.dataType === 'date' ? '📅' :
           field.dataType === 'boolean' ? '☐' : 'Aa'}
        </span>
        <span className="FieldChip__label">{field.name}</span>
        {renderAggregationSelector()}
        {renderFilterControls()}
        {!readOnly && (
          <button
            className="FieldChip__remove"
            onClick={onRemove}
            type="button"
            title="Remove field"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

/** Drop zone component */
interface DropZoneProps {
  type: DropZoneType;
  title: string;
  fields: PivotField[];
  valueFields?: PivotValueField[];
  filters?: PivotFilter[];
  onDrop: (field: PivotField, targetType: DropZoneType) => void;
  onRemoveField: (index: number) => void;
  onEditAggregation?: (index: number, aggregation: PivotValueField['aggregation']) => void;
  onEditFilter?: (index: number, operator: string, value: any) => void;
  readOnly?: boolean;
  showAggregation?: boolean;
  showFilter?: boolean;
  maxFields?: number;
}

const DropZone: React.FC<DropZoneProps> = ({
  type,
  title,
  fields,
  valueFields = [],
  filters = [],
  onDrop,
  onRemoveField,
  onEditAggregation,
  onEditFilter,
  readOnly = false,
  showAggregation = false,
  showFilter = false,
  maxFields,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = React.useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    },
    [readOnly]
  );

  const handleDragLeave = React.useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;

      event.preventDefault();
      setIsDragOver(false);

      try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'));
        if (data.field) {
          // Check max fields limit
          if (maxFields && fields.length >= maxFields) {
            console.warn(`Maximum ${maxFields} fields allowed in ${title}`);
            return;
          }

          onDrop(data.field, type);
        }
      } catch (error) {
        console.error('Error parsing dropped data:', error);
      }
    },
    [readOnly, onDrop, type, maxFields, fields.length, title]
  );

  const isEmpty = fields.length === 0;

  return (
    <div
      className={classNames('DropZone', {
        'DropZone--drag-over': isDragOver,
        'DropZone--empty': isEmpty,
        'DropZone--read-only': readOnly,
        [`DropZone--${type}`]: true,
      })}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="DropZone__header">
        <h4 className="DropZone__title">{title}</h4>
        <span className="DropZone__count">
          {fields.length}{maxFields ? `/${maxFields}` : ''}
        </span>
      </div>

      <div className="DropZone__content">
        {isEmpty ? (
          <div className="DropZone__placeholder">
            {readOnly ? 'No fields' : `Drop ${title.toLowerCase()} here`}
          </div>
        ) : (
          <div className="DropZone__fields">
            {fields.map((field, index) => (
              <FieldChip
                key={`${field.id}-${index}`}
                field={field}
                valueField={showAggregation ? valueFields[index] : undefined}
                filter={showFilter ? filters[index] : undefined}
                onRemove={() => onRemoveField(index)}
                onEditAggregation={
                  onEditAggregation
                    ? (agg) => onEditAggregation(index, agg)
                    : undefined
                }
                onEditFilter={
                  onEditFilter
                    ? (op, val) => onEditFilter(index, op, val)
                    : undefined
                }
                showAggregation={showAggregation}
                showFilter={showFilter}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Main field selector component */
export const PivotFieldSelector: React.FC<PivotFieldSelectorProps> = ({
  availableFields,
  configuration,
  onChange,
  readOnly = false,
  className,
  showSections = {
    rows: true,
    columns: true,
    values: true,
    filters: true,
  },
}) => {
  // Get fields that are not yet used
  const usedFieldIds = React.useMemo(() => {
    const ids = new Set<string>();
    configuration.rows.forEach(f => ids.add(f.id));
    configuration.columns.forEach(f => ids.add(f.id));
    configuration.values.forEach(v => ids.add(v.field.id));
    configuration.filters.forEach(f => ids.add(f.field.id));
    return ids;
  }, [configuration]);

  const availableUnusedFields = React.useMemo(() => {
    return availableFields.filter(field => !usedFieldIds.has(field.id));
  }, [availableFields, usedFieldIds]);

  const handleDrop = React.useCallback(
    (field: PivotField, targetType: DropZoneType) => {
      if (readOnly) return;

      const newConfig = { ...configuration };

      // Remove field from all current locations first
      newConfig.rows = newConfig.rows.filter(f => f.id !== field.id);
      newConfig.columns = newConfig.columns.filter(f => f.id !== field.id);
      newConfig.values = newConfig.values.filter(v => v.field.id !== field.id);
      newConfig.filters = newConfig.filters.filter(f => f.field.id !== field.id);

      // Add to new location
      switch (targetType) {
        case 'rows':
          newConfig.rows.push(field);
          break;
        case 'columns':
          newConfig.columns.push(field);
          break;
        case 'values':
          newConfig.values.push({
            field,
            aggregation: getDefaultAggregation(field.dataType),
            displayName: field.name,
          });
          break;
        case 'filters':
          newConfig.filters.push({
            field,
            operator: 'equals',
            value: '',
            enabled: true,
          });
          break;
        case 'available':
          // Just removing from other areas, nothing to add
          break;
      }

      onChange(newConfig);
    },
    [configuration, onChange, readOnly]
  );

  const handleRemoveRowField = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      const newRows = [...configuration.rows];
      newRows.splice(index, 1);
      onChange({ ...configuration, rows: newRows });
    },
    [configuration, onChange, readOnly]
  );

  const handleRemoveColumnField = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      const newColumns = [...configuration.columns];
      newColumns.splice(index, 1);
      onChange({ ...configuration, columns: newColumns });
    },
    [configuration, onChange, readOnly]
  );

  const handleRemoveValueField = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      const newValues = [...configuration.values];
      newValues.splice(index, 1);
      onChange({ ...configuration, values: newValues });
    },
    [configuration, onChange, readOnly]
  );

  const handleRemoveFilter = React.useCallback(
    (index: number) => {
      if (readOnly) return;
      const newFilters = [...configuration.filters];
      newFilters.splice(index, 1);
      onChange({ ...configuration, filters: newFilters });
    },
    [configuration, onChange, readOnly]
  );

  const handleEditAggregation = React.useCallback(
    (index: number, aggregation: PivotValueField['aggregation']) => {
      if (readOnly) return;
      const newValues = [...configuration.values];
      newValues[index] = { ...newValues[index], aggregation };
      onChange({ ...configuration, values: newValues });
    },
    [configuration, onChange, readOnly]
  );

  const handleEditFilter = React.useCallback(
    (index: number, operator: string, value: any) => {
      if (readOnly) return;
      const newFilters = [...configuration.filters];
      newFilters[index] = { ...newFilters[index], operator, value };
      onChange({ ...configuration, filters: newFilters });
    },
    [configuration, onChange, readOnly]
  );

  return (
    <div className={classNames('PivotFieldSelector', className, {
      'PivotFieldSelector--read-only': readOnly
    })}>
      <div className="PivotFieldSelector__available">
        <DropZone
          type="available"
          title="Available Fields"
          fields={availableUnusedFields}
          onDrop={handleDrop}
          onRemoveField={() => {}} // Not applicable for available fields
          readOnly={readOnly}
        />
      </div>

      <div className="PivotFieldSelector__configuration">
        {showSections.rows && (
          <DropZone
            type="rows"
            title="Row Fields"
            fields={configuration.rows}
            onDrop={handleDrop}
            onRemoveField={handleRemoveRowField}
            readOnly={readOnly}
          />
        )}

        {showSections.columns && (
          <DropZone
            type="columns"
            title="Column Fields"
            fields={configuration.columns}
            onDrop={handleDrop}
            onRemoveField={handleRemoveColumnField}
            readOnly={readOnly}
          />
        )}

        {showSections.values && (
          <DropZone
            type="values"
            title="Value Fields"
            fields={configuration.values.map(v => v.field)}
            valueFields={configuration.values}
            onDrop={handleDrop}
            onRemoveField={handleRemoveValueField}
            onEditAggregation={handleEditAggregation}
            readOnly={readOnly}
            showAggregation
          />
        )}

        {showSections.filters && (
          <DropZone
            type="filters"
            title="Filter Fields"
            fields={configuration.filters.map(f => f.field)}
            filters={configuration.filters}
            onDrop={handleDrop}
            onRemoveField={handleRemoveFilter}
            onEditFilter={handleEditFilter}
            readOnly={readOnly}
            showFilter
          />
        )}
      </div>
    </div>
  );
};

/** Hook for managing field selector state */
export function useFieldSelector(
  initialConfig: PivotConfiguration,
  availableFields: PivotField[]
) {
  const [configuration, setConfiguration] = React.useState(initialConfig);

  const validateConfiguration = React.useCallback(() => {
    const errors: string[] = [];

    if (configuration.values.length === 0) {
      errors.push('At least one value field is required');
    }

    if (configuration.rows.length === 0 && configuration.columns.length === 0) {
      errors.push('At least one row or column field is required');
    }

    // Check for duplicate fields
    const allFieldIds = [
      ...configuration.rows.map(f => f.id),
      ...configuration.columns.map(f => f.id),
      ...configuration.values.map(v => v.field.id),
      ...configuration.filters.map(f => f.field.id),
    ];

    const duplicates = allFieldIds.filter(
      (id, index) => allFieldIds.indexOf(id) !== index
    );

    if (duplicates.length > 0) {
      errors.push(`Duplicate fields found: ${duplicates.join(', ')}`);
    }

    return errors;
  }, [configuration]);

  const resetConfiguration = React.useCallback(() => {
    setConfiguration({
      rows: [],
      columns: [],
      values: [],
      filters: [],
      showSubtotals: false,
      showGrandTotals: false,
    });
  }, []);

  const loadPreset = React.useCallback((preset: Partial<PivotConfiguration>) => {
    setConfiguration(prev => ({ ...prev, ...preset }));
  }, []);

  return {
    configuration,
    setConfiguration,
    validateConfiguration,
    resetConfiguration,
    loadPreset,
  };
}

export default PivotFieldSelector;