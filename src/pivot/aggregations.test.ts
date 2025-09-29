import {
  sum,
  count,
  avg,
  min,
  max,
  countDistinct,
  AggregationFunction,
  getAggregationFunction,
  formatAggregatedValue,
  AggregationType
} from './aggregations';

describe('Aggregation Functions', () => {
  describe('sum', () => {
    test('sums numeric values', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    test('handles empty array', () => {
      expect(sum([])).toBe(0);
    });

    test('handles null and undefined values', () => {
      expect(sum([1, null, 3, undefined, 5])).toBe(9);
    });

    test('handles string numbers', () => {
      expect(sum(['1', '2', '3'] as any)).toBe(6);
    });

    test('ignores non-numeric values', () => {
      expect(sum([1, 'abc', 3, 'def', 5] as any)).toBe(9);
    });

    test('handles decimal values', () => {
      expect(sum([1.1, 2.2, 3.3])).toBeCloseTo(6.6);
    });
  });

  describe('count', () => {
    test('counts all values', () => {
      expect(count([1, 2, 3, 4, 5])).toBe(5);
    });

    test('handles empty array', () => {
      expect(count([])).toBe(0);
    });

    test('counts null and undefined', () => {
      expect(count([1, null, 3, undefined, 5])).toBe(5);
    });

    test('counts mixed types', () => {
      expect(count([1, 'abc', true, null, {}])).toBe(5);
    });
  });

  describe('avg', () => {
    test('calculates average of numeric values', () => {
      expect(avg([1, 2, 3, 4, 5])).toBe(3);
    });

    test('handles empty array', () => {
      expect(avg([])).toBe(0);
    });

    test('handles null and undefined values', () => {
      expect(avg([1, null, 3, undefined, 5])).toBe(3);
    });

    test('ignores non-numeric values', () => {
      expect(avg([1, 'abc', 3, 'def', 5] as any)).toBe(3);
    });

    test('handles decimal values', () => {
      expect(avg([1.0, 2.0, 3.0])).toBeCloseTo(2.0);
    });

    test('returns 0 when no numeric values', () => {
      expect(avg(['abc', 'def'] as any)).toBe(0);
    });
  });

  describe('min', () => {
    test('finds minimum numeric value', () => {
      expect(min([5, 2, 8, 1, 9])).toBe(1);
    });

    test('handles empty array', () => {
      expect(min([])).toBe(0);
    });

    test('handles null and undefined values', () => {
      expect(min([5, null, 2, undefined, 1])).toBe(1);
    });

    test('ignores non-numeric values', () => {
      expect(min([5, 'abc', 2, 'def', 1] as any)).toBe(1);
    });

    test('handles negative values', () => {
      expect(min([-5, -2, -8, -1])).toBe(-8);
    });

    test('handles decimal values', () => {
      expect(min([1.5, 2.3, 0.7, 3.1])).toBe(0.7);
    });

    test('returns 0 when no numeric values', () => {
      expect(min(['abc', 'def'] as any)).toBe(0);
    });
  });

  describe('max', () => {
    test('finds maximum numeric value', () => {
      expect(max([5, 2, 8, 1, 9])).toBe(9);
    });

    test('handles empty array', () => {
      expect(max([])).toBe(0);
    });

    test('handles null and undefined values', () => {
      expect(max([5, null, 2, undefined, 9])).toBe(9);
    });

    test('ignores non-numeric values', () => {
      expect(max([5, 'abc', 2, 'def', 9] as any)).toBe(9);
    });

    test('handles negative values', () => {
      expect(max([-5, -2, -8, -1])).toBe(-1);
    });

    test('handles decimal values', () => {
      expect(max([1.5, 2.3, 0.7, 3.1])).toBe(3.1);
    });

    test('returns 0 when no numeric values', () => {
      expect(max(['abc', 'def'] as any)).toBe(0);
    });
  });

  describe('countDistinct', () => {
    test('counts distinct values', () => {
      expect(countDistinct([1, 2, 2, 3, 3, 3])).toBe(3);
    });

    test('handles empty array', () => {
      expect(countDistinct([])).toBe(0);
    });

    test('handles null and undefined distinctly', () => {
      expect(countDistinct([1, null, null, undefined, undefined])).toBe(3);
    });

    test('handles mixed types', () => {
      expect(countDistinct([1, '1', true, 'true', 1, '1'])).toBe(4);
    });

    test('handles object references', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };
      expect(countDistinct([obj1, obj2, obj1])).toBe(2);
    });
  });

  describe('getAggregationFunction', () => {
    test('returns correct function for sum', () => {
      const fn = getAggregationFunction('sum');
      expect(fn).toBe(sum);
    });

    test('returns correct function for count', () => {
      const fn = getAggregationFunction('count');
      expect(fn).toBe(count);
    });

    test('returns correct function for avg', () => {
      const fn = getAggregationFunction('avg');
      expect(fn).toBe(avg);
    });

    test('returns correct function for min', () => {
      const fn = getAggregationFunction('min');
      expect(fn).toBe(min);
    });

    test('returns correct function for max', () => {
      const fn = getAggregationFunction('max');
      expect(fn).toBe(max);
    });

    test('returns correct function for countDistinct', () => {
      const fn = getAggregationFunction('countDistinct');
      expect(fn).toBe(countDistinct);
    });

    test('throws error for invalid aggregation type', () => {
      expect(() => getAggregationFunction('invalid' as AggregationType)).toThrow(
        'Unknown aggregation type: invalid'
      );
    });
  });

  describe('formatAggregatedValue', () => {
    test('formats sum values as numbers', () => {
      expect(formatAggregatedValue(1234.56, 'sum')).toBe('1,234.56');
    });

    test('formats count values as integers', () => {
      expect(formatAggregatedValue(1234.9, 'count')).toBe('1,235');
    });

    test('formats avg values as numbers', () => {
      expect(formatAggregatedValue(123.456, 'avg')).toBe('123.46');
    });

    test('formats min values as numbers', () => {
      expect(formatAggregatedValue(0.123, 'min')).toBe('0.12');
    });

    test('formats max values as numbers', () => {
      expect(formatAggregatedValue(99999.999, 'max')).toBe('100,000.00');
    });

    test('formats countDistinct values as integers', () => {
      expect(formatAggregatedValue(42.7, 'countDistinct')).toBe('43');
    });

    test('handles zero values', () => {
      expect(formatAggregatedValue(0, 'sum')).toBe('0.00');
      expect(formatAggregatedValue(0, 'count')).toBe('0');
    });

    test('handles negative values', () => {
      expect(formatAggregatedValue(-123.45, 'sum')).toBe('-123.45');
      expect(formatAggregatedValue(-5, 'count')).toBe('-5');
    });

    test('handles very large numbers', () => {
      expect(formatAggregatedValue(1234567890.12, 'sum')).toBe('1,234,567,890.12');
    });

    test('handles very small numbers', () => {
      expect(formatAggregatedValue(0.0001, 'avg')).toBe('0.00');
    });
  });

  describe('Edge cases and performance', () => {
    test('handles very large arrays efficiently', () => {
      const largeArray = Array.from({ length: 100000 }, (_, i) => i);
      const start = performance.now();
      const result = sum(largeArray);
      const end = performance.now();

      expect(result).toBe(4999950000); // Sum of 0 to 99999
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    test('handles arrays with all non-numeric values', () => {
      const nonNumericArray = ['a', 'b', 'c', true, false, {}, []];
      expect(sum(nonNumericArray as any)).toBe(0);
      expect(avg(nonNumericArray as any)).toBe(0);
      expect(min(nonNumericArray as any)).toBe(0);
      expect(max(nonNumericArray as any)).toBe(0);
      expect(count(nonNumericArray)).toBe(7);
      expect(countDistinct(nonNumericArray)).toBe(7);
    });

    test('handles special numeric values', () => {
      expect(sum([Infinity, -Infinity, NaN])).toBe(0); // NaN propagates
      expect(isNaN(avg([1, 2, NaN]))).toBe(true);
      expect(min([Infinity, 1, 2])).toBe(1);
      expect(max([-Infinity, 1, 2])).toBe(2);
    });

    test('maintains precision with floating point arithmetic', () => {
      const values = [0.1, 0.2, 0.3];
      const result = sum(values);
      expect(result).toBeCloseTo(0.6, 10);
    });
  });
});