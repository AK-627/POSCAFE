import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  calculateTax,
  calculateServiceCharge,
  calculateDiscount,
  calculateFinalAmount,
  formatPercentage,
  roundToNearest,
  isValidCurrencyAmount,
  parseCurrencyString
} from './currency';

describe('Currency utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(10.50)).toBe('$10.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('handles negative amounts', () => {
      expect(formatCurrency(-10.50)).toBe('-$10.50');
    });
  });

  describe('calculateTax', () => {
    it('calculates tax correctly', () => {
      expect(calculateTax(100, 0.08)).toBe(8.00);
      expect(calculateTax(50, 0.1)).toBe(5.00);
      expect(calculateTax(0, 0.08)).toBe(0.00);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateTax(99.99, 0.0825)).toBe(8.25);
    });
  });

  describe('calculateServiceCharge', () => {
    it('calculates service charge correctly', () => {
      expect(calculateServiceCharge(100, 0.15)).toBe(15.00);
      expect(calculateServiceCharge(50, 0.1)).toBe(5.00);
    });
  });

  describe('calculateDiscount', () => {
    it('calculates discount correctly', () => {
      expect(calculateDiscount(100, 0.1)).toBe(10.00);
      expect(calculateDiscount(50, 0.2)).toBe(10.00);
      expect(calculateDiscount(0, 0.1)).toBe(0.00);
    });
  });

  describe('calculateFinalAmount', () => {
    it('calculates final amount with all components', () => {
      const result = calculateFinalAmount(100, 0.08, 0.15, 0.1);
      
      expect(result.subtotal).toBe(100.00);
      expect(result.tax).toBe(8.00);
      expect(result.serviceCharge).toBe(15.00);
      expect(result.discount).toBe(10.00);
      expect(result.total).toBe(113.00);
    });

    it('handles zero values', () => {
      const result = calculateFinalAmount(0, 0, 0, 0);
      
      expect(result.subtotal).toBe(0.00);
      expect(result.tax).toBe(0.00);
      expect(result.serviceCharge).toBe(0.00);
      expect(result.discount).toBe(0.00);
      expect(result.total).toBe(0.00);
    });
  });

  describe('formatPercentage', () => {
    it('formats percentages correctly', () => {
      expect(formatPercentage(0.1)).toBe('10.0%');
      expect(formatPercentage(0.0825)).toBe('8.3%');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(1)).toBe('100.0%');
    });
  });

  describe('roundToNearest', () => {
    it('rounds to nearest cent by default', () => {
      expect(roundToNearest(10.123)).toBe(10.12);
      expect(roundToNearest(10.126)).toBe(10.13);
      expect(roundToNearest(10.125)).toBe(10.13); // Banker's rounding
    });

    it('rounds to custom increments', () => {
      expect(roundToNearest(10.123, 0.05)).toBe(10.10);
      expect(roundToNearest(10.126, 0.05)).toBe(10.15);
      expect(roundToNearest(10, 5)).toBe(10);
    });
  });

  describe('isValidCurrencyAmount', () => {
    it('validates currency amounts', () => {
      expect(isValidCurrencyAmount(10)).toBe(true);
      expect(isValidCurrencyAmount(0)).toBe(true);
      expect(isValidCurrencyAmount(10.50)).toBe(true);
      expect(isValidCurrencyAmount(-10)).toBe(false);
      expect(isValidCurrencyAmount(NaN)).toBe(false);
      expect(isValidCurrencyAmount(Infinity)).toBe(false);
    });
  });

  describe('parseCurrencyString', () => {
    it('parses currency strings correctly', () => {
      expect(parseCurrencyString('$10.50')).toBe(10.50);
      expect(parseCurrencyString('1,000.00')).toBe(1000.00);
      expect(parseCurrencyString('€123.45')).toBe(123.45);
      expect(parseCurrencyString('invalid')).toBe(0);
      expect(parseCurrencyString('')).toBe(0);
    });
  });
});