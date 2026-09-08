import { describe, expect, it } from 'vitest';
import { calculateLineTotal, calculateReceiptTotal } from './calculations';

describe('inventory receipt calculations', () => {
  it('calculates a whole-number line total', () => {
    expect(calculateLineTotal({ receivedQuantity: 2, unitPrice: 75000 })).toBe(150000n);
  });

  it('rounds each decimal-quantity line to the nearest VND', () => {
    expect(calculateLineTotal({ receivedQuantity: 1.5, unitPrice: 10001 })).toBe(15002n);
  });

  it('does not lose a VND to binary floating-point precision', () => {
    expect(calculateLineTotal({ receivedQuantity: 1.005, unitPrice: 100 })).toBe(101n);
  });

  it('returns zero while a line has incomplete or invalid numeric input', () => {
    expect(calculateLineTotal({ receivedQuantity: 0, unitPrice: 5000 })).toBe(0n);
    expect(calculateLineTotal({ receivedQuantity: Number.NaN, unitPrice: 5000 })).toBe(0n);
    expect(calculateLineTotal({ receivedQuantity: 1, unitPrice: -1 })).toBe(0n);
  });

  it('sums already-rounded line totals, matching the API transaction', () => {
    expect(
      calculateReceiptTotal([
        { receivedQuantity: 0.5, unitPrice: 1 },
        { receivedQuantity: 0.5, unitPrice: 1 },
      ]),
    ).toBe(2n);
  });

  it('keeps VND totals precise above Number.MAX_SAFE_INTEGER', () => {
    expect(calculateLineTotal({ receivedQuantity: 2, unitPrice: 5_000_000_000_000_000 })).toBe(
      10_000_000_000_000_000n,
    );
  });
});
