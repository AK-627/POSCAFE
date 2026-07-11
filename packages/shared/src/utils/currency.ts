export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function calculateTax(amount: number, taxRate: number = 0.08): number {
  return parseFloat((amount * taxRate).toFixed(2));
}

export function calculateServiceCharge(amount: number, serviceRate: number = 0.15): number {
  return parseFloat((amount * serviceRate).toFixed(2));
}

export function calculateDiscount(amount: number, discountRate: number = 0): number {
  return parseFloat((amount * discountRate).toFixed(2));
}

export function calculateFinalAmount(
  subtotal: number,
  taxRate: number = 0.08,
  serviceRate: number = 0.15,
  discountRate: number = 0
): {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
} {
  const tax = calculateTax(subtotal, taxRate);
  const serviceCharge = calculateServiceCharge(subtotal, serviceRate);
  const discount = calculateDiscount(subtotal, discountRate);
  const total = subtotal + tax + serviceCharge - discount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    serviceCharge: parseFloat(serviceCharge.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function roundToNearest(value: number, nearest: number = 0.01): number {
  return Math.round(value / nearest) * nearest;
}

export function isValidCurrencyAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

export function parseCurrencyString(currencyString: string): number {
  const cleaned = currencyString.replace(/[^0-9.-]+/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}