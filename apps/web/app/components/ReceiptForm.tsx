'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  calculateLineTotal,
  calculateReceiptTotal,
  formatVnd,
} from '../../lib/calculations';

type ReceiptFormState = {
  organization: string;
  department: string;
  receiptNumber: string;
  receiptDate: string;
  debitAccount: string;
  creditAccount: string;
  deliveredBy: string;
  referenceDocument: string;
  warehouseName: string;
  attachedDocumentCount: string;
  notes: string;
  preparedBy: string;
  warehouseKeeper: string;
  chiefAccountant: string;
};

type ReceiptItemState = {
  id: number;
  itemDescription: string;
  productCode: string;
  unit: string;
  documentQuantity: string;
  receivedQuantity: string;
  unitPrice: string;
};

type Notice = { tone: 'success' | 'error'; text: string } | null;

const initialReceipt: ReceiptFormState = {
  organization: 'CÔNG TY VIMES',
  department: 'Kho vận',
  receiptNumber: '',
  receiptDate: '',
  debitAccount: '',
  creditAccount: '',
  deliveredBy: '',
  referenceDocument: '',
  warehouseName: '',
  attachedDocumentCount: '0',
  notes: '',
  preparedBy: '',
  warehouseKeeper: '',
  chiefAccountant: '',
};

function blankItem(id: number): ReceiptItemState {
  return {
    id,
    itemDescription: '',
    productCode: '',
    unit: '',
    documentQuantity: '',
    receivedQuantity: '',
    unitPrice: '',
  };
}

function parseNumber(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function localDateInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatReceiptDate(value: string) {
  if (!value) {
    return '…';
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '…' : new Intl.DateTimeFormat('vi-VN').format(date);
}

async function getErrorMessage(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    return Array.isArray(message) ? message.join('. ') : String(message);
  }

  return 'Không thể lưu phiếu. Vui lòng thử lại.';
}

type ReceiptFormProps = { onViewStocks: () => void };

export default function ReceiptForm({ onViewStocks }: ReceiptFormProps) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [items, setItems] = useState<ReceiptItemState[]>([blankItem(1)]);
  const [nextItemId, setNextItemId] = useState(2);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReceipt((current) =>
      current.receiptDate ? current : { ...current, receiptDate: localDateInputValue() },
    );
  }, []);

  const itemTotals = useMemo(
    () =>
      items.map((item) =>
        calculateLineTotal({
          receivedQuantity: parseNumber(item.receivedQuantity),
          unitPrice: parseNumber(item.unitPrice),
        }),
      ),
    [items],
  );

  const totalAmount = useMemo(
    () =>
      calculateReceiptTotal(
        items.map((item) => ({
          receivedQuantity: parseNumber(item.receivedQuantity),
          unitPrice: parseNumber(item.unitPrice),
        })),
      ),
    [items],
  );

  function updateReceipt(field: keyof ReceiptFormState, value: string) {
    setReceipt((current) => ({ ...current, [field]: value }));
  }

  function updateItem(
    id: number,
    field: Exclude<keyof ReceiptItemState, 'id'>,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((current) => [...current, blankItem(nextItemId)]);
    setNextItemId((current) => current + 1);
  }

  function removeItem(id: number) {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const payload = {
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate,
      organization: receipt.organization,
      department: receipt.department,
      debitAccount: receipt.debitAccount,
      creditAccount: receipt.creditAccount,
      deliveredBy: receipt.deliveredBy,
      referenceDocument: receipt.referenceDocument,
      warehouseName: receipt.warehouseName,
      attachedDocumentCount: Number(receipt.attachedDocumentCount || 0),
      notes: receipt.notes,
      preparedBy: receipt.preparedBy,
      warehouseKeeper: receipt.warehouseKeeper,
      chiefAccountant: receipt.chiefAccountant,
      items: items.map((item) => ({
        itemDescription: item.itemDescription,
        productCode: item.productCode,
        unit: item.unit,
        ...(item.documentQuantity === ''
          ? {}
          : { documentQuantity: parseNumber(item.documentQuantity) }),
        receivedQuantity: parseNumber(item.receivedQuantity),
        unitPrice: parseNumber(item.unitPrice),
      })),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/receipts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const created = (await response.json()) as { receiptNumber: string; totalAmount: string };
      setNotice({
        tone: 'success',
        text: `Đã lưu phiếu ${created.receiptNumber} với tổng tiền ${formatVnd(BigInt(created.totalAmount))}.`,
      });
      setReceipt({
        ...initialReceipt,
        receiptDate: localDateInputValue(),
      });
      setItems([blankItem(1)]);
      setNextItemId(2);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể lưu phiếu. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="receipt-workspace">
      <section className="page-intro" aria-labelledby="page-title">
        <p className="eyebrow">VIMES · Inventory control</p>
        <h1 id="page-title">Phiếu nhập kho</h1>
        <p>
          Ghi nhận hàng hóa vào kho theo biểu mẫu chứng từ nội bộ. Các trường có dấu <b>*</b>{' '}
          là bắt buộc.
        </p>
      </section>

      <form className="receipt" onSubmit={handleSubmit}>
        <header className="receipt-header">
          <div className="issuer-block">
            <span className="issuer-label">Đơn vị</span>
            <strong>{receipt.organization || '................................'}</strong>
            <span className="issuer-label">Bộ phận</span>
            <strong>{receipt.department || '................................'}</strong>
          </div>
          <div className="document-title">
            <h2>PHIẾU NHẬP KHO</h2>
            <span>Ngày {formatReceiptDate(receipt.receiptDate)}</span>
          </div>
          <div className="account-block">
            <span>Số: <b>{receipt.receiptNumber || '................'}</b></span>
            <span>Nợ: <b>{receipt.debitAccount || '................'}</b></span>
            <span>Có: <b>{receipt.creditAccount || '................'}</b></span>
          </div>
        </header>

        <fieldset className="form-section general-section" disabled={isSubmitting}>
          <legend>Thông tin chứng từ</legend>
          <div className="field-grid four-columns">
            <label>
              Đơn vị
              <input
                value={receipt.organization}
                onChange={(event) => updateReceipt('organization', event.target.value)}
                placeholder="CÔNG TY VIMES"
              />
            </label>
            <label>
              Bộ phận
              <input
                value={receipt.department}
                onChange={(event) => updateReceipt('department', event.target.value)}
                placeholder="Kho vận"
              />
            </label>
            <label>
              Số phiếu <b>*</b>
              <input
                required
                value={receipt.receiptNumber}
                onChange={(event) => updateReceipt('receiptNumber', event.target.value)}
                placeholder="PNK-2026-001"
              />
            </label>
            <label>
              Ngày lập <b>*</b>
              <input
                required
                type="date"
                value={receipt.receiptDate}
                onChange={(event) => updateReceipt('receiptDate', event.target.value)}
              />
            </label>
          </div>
          <div className="field-grid four-columns">
            <label>
              Tài khoản Nợ
              <input
                value={receipt.debitAccount}
                onChange={(event) => updateReceipt('debitAccount', event.target.value)}
                placeholder="156"
              />
            </label>
            <label>
              Tài khoản Có
              <input
                value={receipt.creditAccount}
                onChange={(event) => updateReceipt('creditAccount', event.target.value)}
                placeholder="331"
              />
            </label>
            <label>
              Người giao hàng <b>*</b>
              <input
                required
                value={receipt.deliveredBy}
                onChange={(event) => updateReceipt('deliveredBy', event.target.value)}
                placeholder="Họ và tên người giao"
              />
            </label>
            <label>
              Nhập tại kho <b>*</b>
              <input
                required
                value={receipt.warehouseName}
                onChange={(event) => updateReceipt('warehouseName', event.target.value)}
                placeholder="Kho trung tâm"
              />
            </label>
          </div>
          <div className="field-grid document-details">
            <label>
              Theo chứng từ
              <input
                value={receipt.referenceDocument}
                onChange={(event) => updateReceipt('referenceDocument', event.target.value)}
                placeholder="Số hóa đơn, biên bản…"
              />
            </label>
            <label>
              Số chứng từ gốc kèm theo
              <input
                type="number"
                min="0"
                max="2147483647"
                step="1"
                value={receipt.attachedDocumentCount}
                onChange={(event) => updateReceipt('attachedDocumentCount', event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section items-section" disabled={isSubmitting}>
          <legend>Chi tiết vật tư, dụng cụ, hàng hóa</legend>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="line-column">STT</th>
                  <th>Mô tả / quy cách <b>*</b></th>
                  <th>Mã số</th>
                  <th>Đơn vị tính <b>*</b></th>
                  <th>SL chứng từ</th>
                  <th>SL thực nhập <b>*</b></th>
                  <th>Đơn giá (VND) <b>*</b></th>
                  <th>Thành tiền</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="line-number">{index + 1}</td>
                    <td>
                      <label className="sr-only" htmlFor={`description-${item.id}`}>
                        Mô tả / quy cách dòng {index + 1}
                      </label>
                      <input
                        id={`description-${item.id}`}
                        required
                        value={item.itemDescription}
                        onChange={(event) => updateItem(item.id, 'itemDescription', event.target.value)}
                        placeholder="Tên, nhãn hiệu, quy cách"
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`code-${item.id}`}>
                        Mã số dòng {index + 1}
                      </label>
                      <input
                        id={`code-${item.id}`}
                        value={item.productCode}
                        onChange={(event) => updateItem(item.id, 'productCode', event.target.value)}
                        placeholder="Mã hàng"
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`unit-${item.id}`}>
                        Đơn vị tính dòng {index + 1}
                      </label>
                      <input
                        id={`unit-${item.id}`}
                        required
                        value={item.unit}
                        onChange={(event) => updateItem(item.id, 'unit', event.target.value)}
                        placeholder="Cái, kg…"
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`document-quantity-${item.id}`}>
                        Số lượng theo chứng từ dòng {index + 1}
                      </label>
                      <input
                        id={`document-quantity-${item.id}`}
                        type="number"
                        min="0"
                        max="999999999999999"
                        step="0.001"
                        value={item.documentQuantity}
                        onChange={(event) => updateItem(item.id, 'documentQuantity', event.target.value)}
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`received-quantity-${item.id}`}>
                        Số lượng thực nhập dòng {index + 1}
                      </label>
                      <input
                        id={`received-quantity-${item.id}`}
                        required
                        type="number"
                        min="0.001"
                        max="999999999999999"
                        step="0.001"
                        value={item.receivedQuantity}
                        onChange={(event) => updateItem(item.id, 'receivedQuantity', event.target.value)}
                      />
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`unit-price-${item.id}`}>
                        Đơn giá dòng {index + 1}
                      </label>
                      <input
                        id={`unit-price-${item.id}`}
                        required
                        type="number"
                        min="0"
                        max={Number.MAX_SAFE_INTEGER}
                        step="1"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)}
                      />
                    </td>
                    <td className="money-cell">{formatVnd(itemTotals[index])}</td>
                    <td>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        aria-label={`Xóa dòng hàng ${index + 1}`}
                        title={items.length === 1 ? 'Phiếu cần ít nhất một dòng hàng' : 'Xóa dòng hàng'}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="items-footer">
            <button className="secondary-button" type="button" onClick={addItem}>
              + Thêm dòng hàng
            </button>
            <div className="total-box" aria-live="polite">
              <span>Tổng tiền</span>
              <strong>{formatVnd(totalAmount)}</strong>
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section notes-section" disabled={isSubmitting}>
          <legend>Ghi chú và xác nhận</legend>
          <label>
            Ghi chú
            <textarea
              rows={3}
              value={receipt.notes}
              onChange={(event) => updateReceipt('notes', event.target.value)}
              placeholder="Điều kiện hàng hóa, lưu ý khi nhập kho…"
            />
          </label>
          <div className="signature-grid">
            <label>
              Người lập phiếu
              <input
                value={receipt.preparedBy}
                onChange={(event) => updateReceipt('preparedBy', event.target.value)}
                placeholder="Họ và tên"
              />
            </label>
            <label>
              Người giao hàng
              <input
                value={receipt.deliveredBy}
                onChange={(event) => updateReceipt('deliveredBy', event.target.value)}
                placeholder="Họ và tên"
              />
            </label>
            <label>
              Thủ kho
              <input
                value={receipt.warehouseKeeper}
                onChange={(event) => updateReceipt('warehouseKeeper', event.target.value)}
                placeholder="Họ và tên"
              />
            </label>
            <label>
              Kế toán trưởng
              <input
                value={receipt.chiefAccountant}
                onChange={(event) => updateReceipt('chiefAccountant', event.target.value)}
                placeholder="Họ và tên"
              />
            </label>
          </div>
        </fieldset>

        <footer className="receipt-actions">
          {notice && (
            <div className={`notice ${notice.tone}`} role="status">
              <span>{notice.text}</span>
              {notice.tone === 'success' ? (
                <button className="notice-link" type="button" onClick={onViewStocks}>
                  Xem tồn kho vừa cập nhật
                </button>
              ) : null}
            </div>
          )}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu phiếu…' : 'Lưu phiếu nhập kho'}
          </button>
        </footer>
      </form>
    </div>
  );
}
