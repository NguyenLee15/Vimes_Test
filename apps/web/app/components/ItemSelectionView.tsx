'use client';

import { useMemo, useState } from 'react';
import { calculateLineTotal, calculateReceiptTotal, formatVnd } from '../../lib/calculations';
import ExcelImportModal, { ParsedItem } from './ExcelImportModal';
import StockPickerModal, { StockItem } from './StockPickerModal';

export type DocumentType = 'IN' | 'OUT';

export type SelectedItem = {
  itemDescription: string;
  productCode: string;
  unit: string;
  documentQuantity: string;
  actualQuantity: string;
  unitPrice: string;
};

type Props = {
  type: DocumentType;
  stocks: StockItem[];
  initialWarehouse?: string;
  initialItems?: SelectedItem[];
  initialCounterpartyName?: string;
  onBack: () => void;
  onConfirmAndCreateVoucher: (data: {
    items: SelectedItem[];
    warehouseName: string;
    counterpartyName?: string;
    referenceType?: string;
    referenceNumber?: string;
    referenceDate?: string;
    referenceIssuer?: string;
  }) => void;
};

const emptyItem = (): SelectedItem => ({
  itemDescription: '',
  productCode: '',
  unit: 'Hộp',
  documentQuantity: '',
  actualQuantity: '1',
  unitPrice: '0',
});

function normalizeQuantity(value: string) {
  if (value.trim() === '') return '';
  const quantity = Number(value);
  return Number.isFinite(quantity) ? String(Math.max(0, Math.round(quantity))) : '';
}

const stockKey = (warehouse: string, identifierType: string, identifier: string, unit: string) =>
  [warehouse, identifierType, identifier, unit]
    .map((value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN'))
    .join('|');

export default function ItemSelectionView({
  type,
  stocks,
  initialWarehouse,
  initialItems,
  initialCounterpartyName,
  onBack,
  onConfirmAndCreateVoucher,
}: Props) {
  const [warehouseName, setWarehouseName] = useState(
    initialWarehouse || 'Kho Vật tư Y tế Trung tâm'
  );
  const [items, setItems] = useState<SelectedItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((item) => ({
          ...item,
          documentQuantity: normalizeQuantity(item.documentQuantity),
          actualQuantity: normalizeQuantity(item.actualQuantity),
        }))
      : [emptyItem()]
  );
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);

  // Optional pre-filled metadata from delivery note
  const [counterpartyName, setCounterpartyName] = useState(initialCounterpartyName || '');
  const [referenceType, setReferenceType] = useState('Hóa đơn GTGT');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceIssuer, setReferenceIssuer] = useState('');

  // Modals state
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

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

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.actualQuantity) || 0), 0);
  }, [items]);

  // Data import handlers
  function handleSelectFromStock(selected: StockItem[]) {
    const newItems: SelectedItem[] = selected.map((s) => ({
      itemDescription: s.itemDescription,
      productCode: s.productIdentifier,
      unit: s.unit,
      documentQuantity: '',
      actualQuantity: '1',
      unitPrice: s.lastUnitPrice || '0',
    }));

    setItems((prev) => {
      const isFirstRowEmpty =
        prev.length === 1 && !prev[0].itemDescription && !prev[0].productCode;
      return isFirstRowEmpty ? newItems : [...prev, ...newItems];
    });
  }

  function handleImportExcel(parsed: ParsedItem[]) {
    const newItems: SelectedItem[] = parsed.map((p) => ({
      itemDescription: p.itemDescription,
      productCode: p.productCode,
      unit: p.unit,
      documentQuantity: p.documentQuantity ? normalizeQuantity(String(p.documentQuantity)) : '',
      actualQuantity: normalizeQuantity(String(p.actualQuantity)),
      unitPrice: String(p.unitPrice),
    }));

    setItems((prev) => {
      const isFirstRowEmpty =
        prev.length === 1 && !prev[0].itemDescription && !prev[0].productCode;
      return isFirstRowEmpty ? newItems : [...prev, ...newItems];
    });
  }

  const validItemCount = useMemo(() => {
    return items.filter(
      (it) => it.itemDescription.trim() && Number(it.actualQuantity) > 0
    ).length;
  }, [items]);

  const stockShortages = useMemo(() => {
    if (type !== 'OUT') return new Map<string, { available: number; requested: number }>();

    const availableByKey = new Map(
      stocks.map((stock) => [
        stockKey(stock.warehouseName, stock.identifierType, stock.productIdentifier, stock.unit),
        Number(stock.quantityOnHand),
      ])
    );
    const requestedByKey = new Map<string, number>();

    for (const item of items) {
      if (!item.itemDescription.trim() || Number(item.actualQuantity) <= 0) continue;
      const identifierType = item.productCode.trim() ? 'CODE' : 'DESCRIPTION';
      const identifier = item.productCode.trim() || item.itemDescription;
      const itemKey = stockKey(warehouseName, identifierType, identifier, item.unit);
      requestedByKey.set(itemKey, (requestedByKey.get(itemKey) || 0) + Number(item.actualQuantity));
    }

    return new Map(
      [...requestedByKey.entries()]
        .filter(([itemKey, requested]) => requested > (availableByKey.get(itemKey) ?? 0))
        .map(([itemKey, requested]) => [itemKey, { available: availableByKey.get(itemKey) ?? 0, requested }])
    );
  }, [items, stocks, type, warehouseName]);

  function handleProceed() {
    const validItems = items.filter(
      (it) => it.itemDescription.trim() && Number(it.actualQuantity) > 0
    );
    if (!validItems.length) {
      alert('Vui lòng thêm ít nhất 1 mặt hàng có tên và số lượng lớn hơn 0.');
      return;
    }

    if (stockShortages.size) {
      alert('Số lượng xuất vượt tồn kho. Vui lòng điều chỉnh các dòng được đánh dấu.');
      return;
    }

    onConfirmAndCreateVoucher({
      items: validItems,
      warehouseName,
      counterpartyName,
      referenceType,
      referenceNumber,
      referenceDate,
      referenceIssuer,
    });
  }

  return (
    <div className="erp-form-wrapper">
      {/* Top Action Bar */}
      <div className="erp-page-header">
        <div className="erp-header-left">
          <button type="button" className="back-btn" onClick={onBack}>
            ← Quay lại Quản lý kho
          </button>
          <div>
            <h1>
              {type === 'IN'
                ? 'Danh sách vật liệu nhập kho y tế'
                : 'Danh sách vật liệu xuất kho y tế'}
            </h1>
          </div>
        </div>
      </div>

      {/* Warehouse Selector & Source Buttons */}
      <section className="erp-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 700, color: '#183c3b', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              Kho {type === 'IN' ? 'nhập' : 'xuất'}:
            </span>
            <input
              list="selection-warehouses"
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder="Chọn kho hàng..."
              style={{
                padding: '0.55rem 0.85rem',
                border: '1px solid #c5bead',
                borderRadius: '4px',
                fontSize: '0.9rem',
                minWidth: '260px',
                background: '#fff',
              }}
            />
            <datalist id="selection-warehouses">
              {warehouses.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>

          <div className="erp-import-tools">
            <button
              type="button"
              className="tool-btn stock-btn"
              onClick={() => setIsStockPickerOpen(true)}
              title="Chọn mặt hàng có sẵn trong kho"
            >
              📦 Chọn từ kho ({stocks.length})
            </button>
            <button
              type="button"
              className="tool-btn excel-btn"
              onClick={() => setIsExcelModalOpen(true)}
              title="Tải lên file Excel danh sách vật tư"
            >
              📥 Nhập từ Excel
            </button>
          </div>
        </div>
      </section>

      {/* Main Items Table */}
      <section className="erp-card">
        <div className="erp-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Danh sách vật liệu ({items.length} dòng)</h3>
            <span className="erp-card-desc">
              Nhập tên, số lượng, đơn giá trực tiếp trên bảng bên dưới
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
            Tổng lượng: <strong>{totalQuantity.toLocaleString('vi-VN')}</strong> đơn vị
          </span>
        </div>

        <div className="erp-table-scroll">
          <table className="erp-data-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '280px' }}>Tên, nhãn hiệu, quy cách vật tư y tế</th>
                <th style={{ width: '120px' }}>Mã số</th>
                <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ width: '110px', textAlign: 'right' }}>SL chứng từ</th>
                <th style={{ width: '120px', textAlign: 'right' }}>
                  SL thực {type === 'IN' ? 'nhập' : 'xuất'}
                </th>
                <th style={{ width: '130px', textAlign: 'right' }}>Đơn giá (đ)</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Thành tiền (đ)</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const identifierType = item.productCode.trim() ? 'CODE' : 'DESCRIPTION';
                const identifier = item.productCode.trim() || item.itemDescription;
                const itemStockKey = stockKey(warehouseName, identifierType, identifier, item.unit);
                const shortage = stockShortages.get(itemStockKey);
                const lineTotal = calculateLineTotal({
                  receivedQuantity: Number(item.actualQuantity) || 0,
                  unitPrice: Number(item.unitPrice) || 0,
                });

                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#777' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <input
                        required
                        className="table-input item-desc"
                        placeholder="Nhập tên vật tư y tế..."
                        value={item.itemDescription}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) => (i === idx ? { ...it, itemDescription: e.target.value } : it))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        placeholder="Mã số..."
                        value={item.productCode}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) => (i === idx ? { ...it, productCode: e.target.value } : it))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        required
                        className="table-input text-center"
                        placeholder="ĐVT"
                        value={item.unit}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) => (i === idx ? { ...it, unit: e.target.value } : it))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="—"
                        className="table-input text-right"
                        value={item.documentQuantity}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) => (i === idx ? { ...it, documentQuantity: normalizeQuantity(e.target.value) } : it))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        className={shortage ? 'table-input text-right qty-input stock-shortage-input' : 'table-input text-right qty-input'}
                        value={item.actualQuantity}
                        aria-invalid={Boolean(shortage)}
                        title={shortage ? `Tồn khả dụng: ${shortage.available.toLocaleString('vi-VN')}; đang yêu cầu: ${shortage.requested.toLocaleString('vi-VN')}` : undefined}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) => (i === idx ? { ...it, actualQuantity: normalizeQuantity(e.target.value) } : it))
                          )
                        }
                      />
                      {shortage ? <small className="stock-shortage-message">Vượt tồn: còn {shortage.available.toLocaleString('vi-VN')}</small> : null}
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        min="0"
                        required
                        className="table-input text-right"
                        value={editingPriceIndex === idx ? item.unitPrice : formatVnd(Number(item.unitPrice) || 0)}
                        onFocus={() => setEditingPriceIndex(idx)}
                        onBlur={() => setEditingPriceIndex(null)}
                        onChange={(e) =>
                          setItems((all) =>
                            all.map((it, i) =>
                              i === idx
                                ? { ...it, unitPrice: e.target.value.replace(/[^0-9]/g, '') }
                                : it
                            )
                          )
                        }
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#183c3b' }}>
                      {formatVnd(lineTotal)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="erp-delete-btn"
                        disabled={items.length === 1}
                        onClick={() => setItems((all) => all.filter((_, i) => i !== idx))}
                        title="Xóa dòng"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Dòng Tổng cộng */}
              <tr className="erp-total-row">
                <td colSpan={5} style={{ textAlign: 'center', fontWeight: 700 }}>
                  TỔNG CỘNG
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#be5c35' }}>
                  {totalQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                </td>
                <td style={{ textAlign: 'center', color: '#999' }}>—</td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#183c3b' }}>
                  {formatVnd(totalAmount)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="erp-add-row-btn"
            onClick={() => setItems((all) => [...all, emptyItem()])}
          >
            ➕ Thêm mới
          </button>
        </div>
      </section>

      {/* Bottom Confirm Action */}
      <div className="erp-form-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="primary-btn proceed-btn"
          disabled={validItemCount === 0 || stockShortages.size > 0}
          onClick={handleProceed}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
        >
          Xác nhận và tạo phiếu ({validItemCount} mặt hàng)
        </button>
      </div>

      {/* Modals */}
      <StockPickerModal
        isOpen={isStockPickerOpen}
        onClose={() => setIsStockPickerOpen(false)}
        stocks={stocks}
        currentWarehouse={warehouseName}
        onSelect={handleSelectFromStock}
      />

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={handleImportExcel}
      />

    </div>
  );
}
