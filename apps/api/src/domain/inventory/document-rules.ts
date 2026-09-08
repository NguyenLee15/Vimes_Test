export class DocumentRuleViolation extends Error {}

export const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeKey = (value: string) => normalizeText(value).toLocaleLowerCase('vi-VN');

export function assertDocumentDates(fromDate?: string, toDate?: string) {
  if (fromDate && toDate && fromDate > toDate) {
    throw new DocumentRuleViolation('Ngày bắt đầu không được sau ngày kết thúc');
  }
}

export function assertDocumentInput(input: {
  documentNumber: string;
  warehouseName: string;
  counterpartyName: string;
  items: Array<{ itemDescription: string; unit: string; actualQuantity: number; unitPrice: number }>;
}) {
  if (!normalizeText(input.documentNumber) || !normalizeText(input.warehouseName) || !normalizeText(input.counterpartyName)) {
    throw new DocumentRuleViolation('Thông tin phiếu không hợp lệ');
  }
  for (const item of input.items) {
    if (!normalizeText(item.itemDescription) || !normalizeText(item.unit) || !Number.isFinite(item.actualQuantity) || item.actualQuantity <= 0 || !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new DocumentRuleViolation('Thông tin hàng hóa không hợp lệ');
    }
  }
}
