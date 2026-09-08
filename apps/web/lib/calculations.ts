export type ReceiptCalculationItem = {
  receivedQuantity: number;
  unitPrice: number;
};

function toThousandths(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const [whole, fraction = ''] = String(value).split('.');
  if (!/^\d+$/.test(whole) || !/^\d{0,3}$/.test(fraction)) {
    return null;
  }

  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0') || '0');
}

export function calculateLineTotal({ receivedQuantity, unitPrice }: ReceiptCalculationItem) {
  const quantityInThousandths = toThousandths(receivedQuantity);
  if (quantityInThousandths === null || !Number.isSafeInteger(unitPrice) || unitPrice < 0) {
    return 0n;
  }

  return (quantityInThousandths * BigInt(unitPrice) + 500n) / 1000n;
}

export function calculateReceiptTotal(items: ReceiptCalculationItem[]) {
  return items.reduce((total, item) => total + calculateLineTotal(item), 0n);
}

export function formatVnd(amount: number | bigint) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
