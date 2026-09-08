'use client';

import { FormEvent, useMemo, useState } from 'react';
import { calculateLineTotal, calculateReceiptTotal, formatVnd } from '../../lib/calculations';
import { numberToVietnameseWords } from '../../lib/number-to-words';
import { StockItem } from './StockPickerModal';

export type DocumentType = 'IN' | 'OUT';

export type FormItem = {
  itemDescription: string;
  productCode: string;
  unit: string;
  documentQuantity: string;
  actualQuantity: string;
  unitPrice: string;
};

export type InitialVoucherData = {
  documentNumber?: string;
  documentDate?: string;
  organization?: string;
  department?: string;
  debitAccount?: string;
  creditAccount?: string;
  items: FormItem[];
  warehouseName: string;
  counterpartyName?: string;
  referenceType?: string;
  referenceNumber?: string;
  referenceDate?: string;
  referenceIssuer?: string;
  referenceDocument?: string;
  warehouseLocation?: string;
  attachedDocumentCount?: number;
  notes?: string;
  preparedBy?: string;
  warehouseKeeper?: string;
  chiefAccountant?: string;
};

type Props = {
  type: DocumentType;
  stocks: StockItem[];
  initialData?: InitialVoucherData | null;
  documentId?: string;
  onBack: () => void;
  onCreated: (message: string) => void;
};

const emptyItem = (): FormItem => ({
  itemDescription: '',
  productCode: '',
  unit: 'Hộp',
  documentQuantity: '',
  actualQuantity: '1',
  unitPrice: '0',
});

const todayIso = () => new Date().toISOString().slice(0, 10);

function formatVoucherDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { day: '...', month: '...', year: '...' };
  }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function DocumentForm({
  type,
  stocks,
  initialData,
  documentId,
  onBack,
  onCreated,
}: Props) {
  // General info state
  const [organization, setOrganization] = useState(initialData?.organization || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || '');
  const [documentDate, setDocumentDate] = useState(initialData?.documentDate || todayIso());
  const [warehouseName, setWarehouseName] = useState(initialData?.warehouseName || '');
  const [warehouseLocation, setWarehouseLocation] = useState(initialData?.warehouseLocation || '');
  const [counterpartyName, setCounterpartyName] = useState(initialData?.counterpartyName || '');
  const [debitAccount, setDebitAccount] = useState(initialData?.debitAccount || '');
  const [creditAccount, setCreditAccount] = useState(initialData?.creditAccount || '');

  // Reference document state
  const [referenceType, setReferenceType] = useState(initialData?.referenceType || '');
  const [referenceNumber, setReferenceNumber] = useState(initialData?.referenceNumber || '');
  const [referenceDay, setReferenceDay] = useState(initialData?.referenceDate?.slice(8, 10) || '');
  const [referenceMonth, setReferenceMonth] = useState(initialData?.referenceDate?.slice(5, 7) || '');
  const [referenceYear, setReferenceYear] = useState(initialData?.referenceDate?.slice(0, 4) || '');
  const [referenceIssuer, setReferenceIssuer] = useState(initialData?.referenceIssuer || '');
  const [referenceDocument, setReferenceDocument] = useState(initialData?.referenceDocument || '');
  const [attachedDocumentCount, setAttachedDocumentCount] = useState(String(initialData?.attachedDocumentCount ?? ''));
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Signatures
  const [preparedBy, setPreparedBy] = useState(initialData?.preparedBy || '');
  const [warehouseKeeper, setWarehouseKeeper] = useState(initialData?.warehouseKeeper || '');
  const [chiefAccountant, setChiefAccountant] = useState(initialData?.chiefAccountant || '');

  // Items
  const [items, setItems] = useState<FormItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [emptyItem()]
  );
  const [loading, setLoading] = useState(false);

  const warehouses = useMemo(() => {
    const set = new Set(stocks.map((s) => s.warehouseName));
    if (!set.size) {
      set.add('Kho Vật tư Y tế Trung tâm');
      set.add('Kho Dược phẩm');
      set.add('Kho Thiết bị Y tế');
    }
    return [...set];
  }, [stocks]);

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => ({
      receivedQuantity: Number(item.actualQuantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
    }));
  }, [items]);

  const totalAmount = useMemo(() => {
    return calculateReceiptTotal(calculatedItems);
  }, [calculatedItems]);

  const amountInWords = useMemo(() => {
    return numberToVietnameseWords(totalAmount);
  }, [totalAmount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        type,
        documentNumber: documentNumber.trim(),
        documentDate,
        organization,
        department,
        debitAccount,
        creditAccount,
        counterpartyName: counterpartyName.trim(),
        warehouseName: warehouseName.trim(),
        warehouseLocation: warehouseLocation.trim() || undefined,
        referenceDocument: referenceDocument.trim() || undefined,
        referenceType,
        referenceNumber,
        referenceDate: referenceYear && referenceMonth && referenceDay
          ? `${referenceYear}-${referenceMonth.padStart(2, '0')}-${referenceDay.padStart(2, '0')}`
          : undefined,
        referenceIssuer,
        attachedDocumentCount: Number(attachedDocumentCount) || 0,
        notes,
        preparedBy,
        warehouseKeeper,
        chiefAccountant,
        items: items.map((it) => ({
          itemDescription: it.itemDescription.trim(),
          productCode: it.productCode.trim() || undefined,
          unit: it.unit.trim(),
          documentQuantity: it.documentQuantity ? Number(it.documentQuantity) : undefined,
          actualQuantity: Number(it.actualQuantity),
          unitPrice: Math.round(Number(it.unitPrice) || 0),
        })),
      };

      const response = await fetch(
        documentId ? `${API}/api/inventory/documents/${documentId}` : `${API}/api/inventory/documents`,
        {
        method: documentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentId ? {
          documentDate,
          organization,
          department,
          debitAccount,
          creditAccount,
          counterpartyName: counterpartyName.trim(),
          warehouseLocation: warehouseLocation.trim() || undefined,
          referenceType,
          referenceNumber,
          referenceDate: referenceYear && referenceMonth && referenceDay
            ? `${referenceYear}-${referenceMonth.padStart(2, '0')}-${referenceDay.padStart(2, '0')}`
            : undefined,
          referenceIssuer,
          referenceDocument: referenceDocument.trim() || undefined,
          attachedDocumentCount: Number(attachedDocumentCount) || 0,
          preparedBy,
          warehouseKeeper,
          chiefAccountant,
        } : payload),
      });

      const resData = await response.json().catch(() => null);
      if (!response.ok) {
        const msg =
          resData && typeof resData === 'object' && 'message' in resData
            ? resData.message
            : 'Không thể lưu phiếu';
        throw new Error(Array.isArray(msg) ? msg.join('. ') : String(msg));
      }

      onCreated(documentId
        ? `Đã cập nhật ${type === 'IN' ? 'phiếu nhập kho' : 'phiếu xuất kho'} ${documentNumber}.`
        : `Đã lưu thành công ${type === 'IN' ? 'phiếu nhập kho' : 'phiếu xuất kho'} ${payload.documentNumber}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu.');
    } finally {
      setLoading(false);
    }
  }

  const voucherDate = formatVoucherDate(documentDate);

  return (
    <div className="document-detail-container voucher-editor-page">
      <div className="detail-actions no-print">
        <button type="button" onClick={onBack}>← Quay lại</button>
        <div className="voucher-editor-actions">
          <button type="button" className="print-btn" onClick={() => window.print()}>
            🖨️ In phiếu
          </button>
          <button type="submit" form="document-entry-form" className="save-button" disabled={loading}>
            {loading ? 'Đang lưu...' : '💾 Lưu phiếu'}
          </button>
        </div>
      </div>

      <form id="document-entry-form" onSubmit={handleSubmit} className="official-voucher-paper voucher-editor-form">
        <header className="voucher-header">
          <div className="voucher-org-block">
            <label><strong>Đơn vị:</strong>
              <input value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </label>
            <label><strong>Bộ phận:</strong>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </label>
          </div>
          <div className="voucher-title-block">
            <h1 className="voucher-main-title">{type === 'IN' ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}</h1>
            <p className="voucher-date-row">
              <span>Ngày {voucherDate.day} tháng {voucherDate.month} năm {voucherDate.year}</span>
            </p>
            <p className="voucher-number-row">Số: <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required /></p>
          </div>
          <div className="voucher-accounts-block">
            <label className="acct-row"><span>Nợ:</span><input value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} /></label>
            <label className="acct-row"><span>Có:</span><input value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} /></label>
          </div>
        </header>

        <section className="voucher-meta-section">
          <p className="meta-print-line"><span>- Họ và tên người {type === 'IN' ? 'giao' : 'nhận'}:</span>{' '}
            <input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} required placeholder="Họ tên" />
          </p>
          <p className="meta-print-line reference-document-line">
            <span>- Theo</span>
            <input value={referenceType} onChange={(e) => setReferenceType(e.target.value)} placeholder="........................" />
            <span>số</span>
            <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="................" />
            <span>ngày</span>
            <input value={referenceDay} onChange={(e) => setReferenceDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="........" />
            <span>tháng</span>
            <input value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="........" />
            <span>năm</span>
            <input value={referenceYear} onChange={(e) => setReferenceYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="........" />
            <span>của</span>
            <input value={referenceIssuer} onChange={(e) => setReferenceIssuer(e.target.value)} placeholder="........................" />
          </p>
          <p className="meta-print-line warehouse-location-line"><span>- {type === 'IN' ? 'Nhập' : 'Xuất'} tại kho:</span>
            <input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} required list="form-warehouses" />
            <datalist id="form-warehouses">{warehouses.map((warehouse) => <option key={warehouse} value={warehouse} />)}</datalist>
            <span>Địa điểm:</span>
            <input value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="Địa điểm" />
          </p>
        </section>

        <div className="voucher-table-wrapper">
          <table className="official-table read-only-items-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '40px' }}>STT</th>
                <th rowSpan={2}>Tên, nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ sản phẩm, hàng hoá</th>
                <th rowSpan={2} style={{ width: '90px' }}>Mã số</th>
                <th rowSpan={2} style={{ width: '60px' }}>Đơn vị tính</th>
                <th colSpan={2}>Số lượng</th>
                <th rowSpan={2} style={{ width: '105px' }}>Đơn giá (đ)</th>
                <th rowSpan={2} style={{ width: '120px' }}>Thành tiền (đ)</th>
              </tr>
              <tr><th style={{ width: '75px' }}>Theo chứng từ</th><th style={{ width: '75px' }}>Thực {type === 'IN' ? 'nhập' : 'xuất'}</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotal = calculateLineTotal({ receivedQuantity: Number(item.actualQuantity) || 0, unitPrice: Number(item.unitPrice) || 0 });
                return <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td><strong>{item.itemDescription || '—'}</strong></td>
                  <td style={{ textAlign: 'center' }}>{item.productCode || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{item.documentQuantity ? Number(item.documentQuantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(item.actualQuantity).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                  <td style={{ textAlign: 'right' }}>{formatVnd(Number(item.unitPrice) || 0)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVnd(lineTotal)}</td>
                </tr>;
              })}
              <tr className="total-summary-row">
                <td colSpan={5} style={{ textAlign: 'center', fontWeight: 700 }}>Cộng</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{items.reduce((sum, item) => sum + (Number(item.actualQuantity) || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                <td style={{ textAlign: 'center' }}>x</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatVnd(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="voucher-footer-text">
          <p className="meta-print-line">- Tổng số tiền (viết bằng chữ): <strong className="words-text">{amountInWords}.</strong></p>
          <p className="meta-print-line">- Số chứng từ gốc kèm theo: <input className="attached-count-input" inputMode="numeric" value={attachedDocumentCount} placeholder="..." onChange={(e) => setAttachedDocumentCount(e.target.value.replace(/\D/g, ''))} /></p>
        </section>

        <footer className="voucher-signatures">
          <div className="signature-date-row">Ngày {voucherDate.day} tháng {voucherDate.month} năm {voucherDate.year}</div>
          <div className="signature-columns">
            <label className="signature-col"><strong>Người lập phiếu</strong><small>(Ký, họ tên)</small><div className="signature-space" /><input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></label>
            <div className="signature-col"><strong>Người {type === 'IN' ? 'giao' : 'nhận'} hàng</strong><small>(Ký, họ tên)</small><div className="signature-space" /></div>
            <label className="signature-col"><strong>Thủ kho</strong><small>(Ký, họ tên)</small><div className="signature-space" /><input value={warehouseKeeper} onChange={(e) => setWarehouseKeeper(e.target.value)} /></label>
            <label className="signature-col"><strong>Kế toán trưởng</strong><small>(Ký, họ tên)</small><div className="signature-space" /><input value={chiefAccountant} onChange={(e) => setChiefAccountant(e.target.value)} /></label>
          </div>
        </footer>
      </form>

    </div>
  );
}
