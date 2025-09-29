/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PivotFieldSelector } from './PivotFieldSelector';
import { PivotConfiguration, PivotField } from './types';

describe('PivotFieldSelector Integration Tests', () => {
  let availableFields: PivotField[];
  let defaultConfiguration: PivotConfiguration;
  let mockOnChange: jest.Mock;

  // Mock HTML5 drag and drop events
  const createDragEvent = (type: string, dataTransfer: any = {}) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        setData: jest.fn(),
        getData: jest.fn(),
        dropEffect: 'move',
        effectAllowed: 'move',
        ...dataTransfer
      },
      writable: true
    });
    return event;
  };

  beforeEach(() => {
    availableFields = [
      { id: '1', name: 'region', dataType: 'string' },
      { id: '2', name: 'product', dataType: 'string' },
      { id: '3', name: 'category', dataType: 'string' },
      { id: '4', name: 'quarter', dataType: 'string' },
      { id: '5', name: 'sales', dataType: 'number' },
      { id: '6', name: 'quantity', dataType: 'number' },
      { id: '7', name: 'cost', dataType: 'number' },
      { id: '8', name: 'date', dataType: 'date' },
      { id: '9', name: 'active', dataType: 'boolean' },
    ];

    defaultConfiguration = {
      rows: [
        { id: '1', name: 'region', dataType: 'string' },
        { id: '2', name: 'product', dataType: 'string' }
      ],
      columns: [
        { id: '4', name: 'quarter', dataType: 'string' }
      ],
      values: [
        { field: { id: '5', name: 'sales', dataType: 'number' }, aggregation: 'sum' },
        { field: { id: '6', name: 'quantity', dataType: 'number' }, aggregation: 'sum' }
      ],
      filters: [
        { field: { id: '5', name: 'sales', dataType: 'number' }, operator: 'greaterThan', value: 1000 }
      ]
    };

    mockOnChange = jest.fn();

    jest.clearAllMocks();
  });

  const renderFieldSelector = (props = {}) => {
    const defaultProps = {
      availableFields,
      configuration: defaultConfiguration,
      onChange: mockOnChange,
      readOnly: false,
      compact: false,
      ...props
    };

    return render(
      <DndProvider backend={HTML5Backend}>
        <PivotFieldSelector {...defaultProps} />
      </DndProvider>
    );
  };

  describe('Basic Rendering', () => {
    test('renders all field zones', () => {
      renderFieldSelector();

      expect(screen.getByText(/available fields/i)).toBeInTheDocument();
      expect(screen.getByText(/rows/i)).toBeInTheDocument();
      expect(screen.getByText(/columns/i)).toBeInTheDocument();
      expect(screen.getByText(/values/i)).toBeInTheDocument();
      expect(screen.getByText(/filters/i)).toBeInTheDocument();
    });

    test('displays configured fields in correct zones', () => {
      renderFieldSelector();

      // Check rows zone
      const rowsZone = screen.getByTestId('rows-drop-zone');
      expect(within(rowsZone).getByText('region')).toBeInTheDocument();
      expect(within(rowsZone).getByText('product')).toBeInTheDocument();

      // Check columns zone
      const columnsZone = screen.getByTestId('columns-drop-zone');
      expect(within(columnsZone).getByText('quarter')).toBeInTheDocument();

      // Check values zone
      const valuesZone = screen.getByTestId('values-drop-zone');
      expect(within(valuesZone).getByText('sales (sum)')).toBeInTheDocument();
      expect(within(valuesZone).getByText('quantity (sum)')).toBeInTheDocument();

      // Check filters zone
      const filtersZone = screen.getByTestId('filters-drop-zone');
      expect(within(filtersZone).getByText('sales > 1000')).toBeInTheDocument();
    });

    test('shows available fields that are not configured', () => {
      renderFieldSelector();

      const availableZone = screen.getByTestId('available-fields-zone');
      expect(within(availableZone).getByText('category')).toBeInTheDocument();
      expect(within(availableZone).getByText('cost')).toBeInTheDocument();
      expect(within(availableZone).getByText('date')).toBeInTheDocument();
      expect(within(availableZone).getByText('active')).toBeInTheDocument();
    });

    test('renders in compact mode', () => {
      renderFieldSelector({ compact: true });

      expect(screen.getByTestId('field-selector-compact')).toBeInTheDocument();
    });

    test('renders in read-only mode', () => {
      renderFieldSelector({ readOnly: true });

      // Fields should be displayed but not draggable
      expect(screen.getByText('region')).toBeInTheDocument();
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop Functionality', () => {

    test('allows dragging field from available to rows', async () => {
      renderFieldSelector();

      const categoryField = screen.getByText('category');
      const rowsDropZone = screen.getByTestId('rows-drop-zone');

      // Start drag
      fireEvent(categoryField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'category', dataType: 'string', source: 'available' }))
      }));

      // Drag over rows zone
      fireEvent(rowsDropZone, createDragEvent('dragover'));

      // Drop
      fireEvent(rowsDropZone, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'category', dataType: 'string', source: 'available' }))
      }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: expect.arrayContaining([
              expect.objectContaining({ name: 'category' })
            ])
          })
        );
      });
    });

    test('allows dragging field from rows to columns', async () => {
      renderFieldSelector();

      const regionField = within(screen.getByTestId('rows-drop-zone')).getByText('region');
      const columnsDropZone = screen.getByTestId('columns-drop-zone');

      fireEvent(regionField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'rows', index: 0 }))
      }));

      fireEvent(columnsDropZone, createDragEvent('dragover'));
      fireEvent(columnsDropZone, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'rows', index: 0 }))
      }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: expect.not.arrayContaining([
              expect.objectContaining({ name: 'region' })
            ]),
            columns: expect.arrayContaining([
              expect.objectContaining({ name: 'region' })
            ])
          })
        );
      });
    });

    test('allows dragging numeric field to values with aggregation selection', async () => {
      renderFieldSelector();

      const costField = screen.getByText('cost');
      const valuesDropZone = screen.getByTestId('values-drop-zone');

      fireEvent(costField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'cost', dataType: 'number', source: 'available' }))
      }));

      fireEvent(valuesDropZone, createDragEvent('dragover'));
      fireEvent(valuesDropZone, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'cost', dataType: 'number', source: 'available' }))
      }));

      // Should show aggregation selection dialog
      await waitFor(() => {
        expect(screen.getByText(/select aggregation/i)).toBeInTheDocument();
      });

      // Select average aggregation
      fireEvent.click(screen.getByText('Average'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining([
              expect.objectContaining({ name: 'cost', aggregation: 'avg' })
            ])
          })
        );
      });
    });

    test('allows reordering fields within same zone', async () => {
      renderFieldSelector();

      const regionField = within(screen.getByTestId('rows-drop-zone')).getByText('region');
      const productField = within(screen.getByTestId('rows-drop-zone')).getByText('product');

      // Drag region field to after product field
      fireEvent(regionField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'rows', index: 0 }))
      }));

      fireEvent(productField, createDragEvent('dragover'));
      fireEvent(productField, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'rows', index: 0 }))
      }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: [
              expect.objectContaining({ name: 'product' }),
              expect.objectContaining({ name: 'region' })
            ]
          })
        );
      });
    });

    test('prevents dropping non-numeric fields in values zone', async () => {
      renderFieldSelector();

      const regionField = screen.getByText('region');
      const valuesDropZone = screen.getByTestId('values-drop-zone');

      fireEvent(regionField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'available' }))
      }));

      fireEvent(valuesDropZone, createDragEvent('dragover'));
      fireEvent(valuesDropZone, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'region', dataType: 'string', source: 'available' }))
      }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/cannot add non-numeric field to values/i)).toBeInTheDocument();
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Field Management', () => {
    test('removes field when delete button is clicked', async () => {
      renderFieldSelector();

      const deleteButton = within(screen.getByTestId('rows-drop-zone'))
        .getByRole('button', { name: /remove region/i });

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: expect.not.arrayContaining([
              expect.objectContaining({ name: 'region' })
            ])
          })
        );
      });
    });

    test('changes aggregation function for value fields', async () => {
      renderFieldSelector();

      const salesField = within(screen.getByTestId('values-drop-zone')).getByText('sales (sum)');
      fireEvent.click(salesField);

      // Should show aggregation options
      await waitFor(() => {
        expect(screen.getByText(/change aggregation/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Average'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining([
              expect.objectContaining({ name: 'sales', aggregation: 'avg' })
            ])
          })
        );
      });
    });

    test('configures filter options', async () => {
      renderFieldSelector();

      const filterField = within(screen.getByTestId('filters-drop-zone')).getByText('sales > 1000');
      fireEvent.click(filterField);

      // Should show filter configuration dialog
      await waitFor(() => {
        expect(screen.getByText(/configure filter/i)).toBeInTheDocument();
      });

      // Change operator
      fireEvent.click(screen.getByText('Less than'));

      // Change value
      const valueInput = screen.getByLabelText(/filter value/i);
      fireEvent.change(valueInput, { target: { value: '2000' } });

      fireEvent.click(screen.getByRole('button', { name: /apply/i }));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.arrayContaining([
              expect.objectContaining({
                name: 'sales',
                operator: 'lessThan',
                value: 2000
              })
            ])
          })
        );
      });
    });
  });

  describe('Visual Feedback', () => {
    test('highlights valid drop zones during drag', () => {
      renderFieldSelector();

      const categoryField = screen.getByText('category');

      fireEvent(categoryField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'category', dataType: 'string', source: 'available' }))
      }));

      // Valid drop zones should be highlighted
      expect(screen.getByTestId('rows-drop-zone')).toHaveClass('drop-zone-valid');
      expect(screen.getByTestId('columns-drop-zone')).toHaveClass('drop-zone-valid');
      expect(screen.getByTestId('filters-drop-zone')).toHaveClass('drop-zone-valid');

      // Values zone should not be highlighted for string field
      expect(screen.getByTestId('values-drop-zone')).not.toHaveClass('drop-zone-valid');
    });

    test('shows visual feedback for invalid drops', () => {
      renderFieldSelector();

      const regionField = screen.getByText('region');
      const valuesDropZone = screen.getByTestId('values-drop-zone');

      fireEvent(regionField, createDragEvent('dragstart'));
      fireEvent(valuesDropZone, createDragEvent('dragover'));

      expect(valuesDropZone).toHaveClass('drop-zone-invalid');
    });

    test('shows field counts in zone headers', () => {
      renderFieldSelector();

      expect(screen.getByText(/rows \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/columns \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/values \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/filters \(1\)/i)).toBeInTheDocument();
    });

    test('shows empty state messages', () => {
      const emptyConfiguration = {
        rows: [],
        columns: [],
        values: [],
        filters: [],
        options: { showGrandTotals: true, showSubtotals: true, computeMode: 'client' }
      };

      renderFieldSelector({ configuration: emptyConfiguration });

      expect(screen.getByText(/drag fields here to create row groups/i)).toBeInTheDocument();
      expect(screen.getByText(/drag fields here to create column groups/i)).toBeInTheDocument();
      expect(screen.getByText(/drag numeric fields here to aggregate/i)).toBeInTheDocument();
      expect(screen.getByText(/drag fields here to filter data/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    test('supports keyboard navigation between fields', () => {
      renderFieldSelector();

      const firstField = screen.getByText('category');
      firstField.focus();

      fireEvent.keyDown(firstField, { key: 'Tab' });
      // Should move focus to next field

      fireEvent.keyDown(firstField, { key: 'ArrowDown' });
      // Should move focus to next field in same group
    });

    test('supports keyboard field manipulation', () => {
      renderFieldSelector();

      const regionField = within(screen.getByTestId('rows-drop-zone')).getByText('region');
      regionField.focus();

      // Delete field with keyboard
      fireEvent.keyDown(regionField, { key: 'Delete' });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: expect.not.arrayContaining([
            expect.objectContaining({ name: 'region' })
          ])
        })
      );
    });

    test('provides screen reader announcements', () => {
      renderFieldSelector();

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/field selector loaded/i);
    });
  });

  describe('Touch Support', () => {
    test('supports touch drag and drop on mobile', () => {
      renderFieldSelector();

      const categoryField = screen.getByText('category');
      const rowsDropZone = screen.getByTestId('rows-drop-zone');

      // Touch start
      fireEvent.touchStart(categoryField, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Touch move to rows zone
      fireEvent.touchMove(categoryField, {
        touches: [{ clientX: 200, clientY: 200 }]
      });

      // Touch end on rows zone
      fireEvent.touchEnd(rowsDropZone);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({ name: 'category' })
          ])
        })
      );
    });

    test('shows touch-friendly controls', () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      });

      renderFieldSelector();

      expect(screen.getByTestId('touch-controls')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('handles large number of available fields efficiently', () => {
      const manyFields: PivotField[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `field_${i}`,
        name: `field_${i}`,
        dataType: i % 2 === 0 ? 'string' : 'number'
      }));

      const start = performance.now();
      renderFieldSelector({ availableFields: manyFields });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should render quickly
      expect(screen.getByText('field_0')).toBeInTheDocument();
    });

    test('virtualizes field list when many fields present', () => {
      const manyFields: PivotField[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `field_${i}`,
        name: `field_${i}`,
        dataType: 'string'
      }));

      renderFieldSelector({ availableFields: manyFields });

      expect(screen.getByTestId('virtualized-field-list')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid field configurations gracefully', () => {
      const invalidConfiguration = {
        ...defaultConfiguration,
        values: [
          { name: 'nonexistent', dataType: 'number', aggregation: 'sum' }
        ]
      } as any;

      renderFieldSelector({ configuration: invalidConfiguration });

      expect(screen.getByText(/invalid field configuration/i)).toBeInTheDocument();
    });

    test('recovers from drag and drop errors', () => {
      renderFieldSelector();

      const categoryField = screen.getByText('category');

      // Simulate drag error
      fireEvent(categoryField, createDragEvent('dragstart'));
      fireEvent(window, new Event('error'));

      // Should not crash and show error message
      expect(screen.getByText(/drag operation failed/i)).toBeInTheDocument();
    });
  });

  describe('Data Type Handling', () => {
    test('shows appropriate icons for different data types', () => {
      renderFieldSelector();

      expect(screen.getByTestId('string-field-icon')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-icon')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-icon')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-icon')).toBeInTheDocument();
    });

    test('restricts aggregation options based on data type', async () => {
      renderFieldSelector();

      const salesField = within(screen.getByTestId('values-drop-zone')).getByText('sales (sum)');
      fireEvent.click(salesField);

      // Number fields should have all aggregation options
      await waitFor(() => {
        expect(screen.getByText('Sum')).toBeInTheDocument();
        expect(screen.getByText('Average')).toBeInTheDocument();
        expect(screen.getByText('Count')).toBeInTheDocument();
        expect(screen.getByText('Min')).toBeInTheDocument();
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.getByText('Count Distinct')).toBeInTheDocument();
      });
    });

    test('shows appropriate filter operators for different data types', async () => {
      renderFieldSelector();

      // Add a date field to filters
      const dateField = screen.getByText('date');
      const filtersDropZone = screen.getByTestId('filters-drop-zone');

      fireEvent(dateField, createDragEvent('dragstart', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'date', dataType: 'date', source: 'available' }))
      }));
      fireEvent(filtersDropZone, createDragEvent('drop', {
        getData: jest.fn().mockReturnValue(JSON.stringify({ name: 'date', dataType: 'date', source: 'available' }))
      }));

      // Should show date-specific operators
      await waitFor(() => {
        expect(screen.getByText(/after/i)).toBeInTheDocument();
        expect(screen.getByText(/before/i)).toBeInTheDocument();
        expect(screen.getByText(/between/i)).toBeInTheDocument();
      });
    });
  });
});