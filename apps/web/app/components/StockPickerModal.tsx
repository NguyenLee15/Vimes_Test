'use client';

import { useMemo, useState } from 'react';

export type StockItem = {
  warehouseName: string;
  identifierType: string;
  productIdentifier: string;
  itemDescription: string;
  unit: string;
  quantityOnHand: string;
  lastUnitPrice: string;
};

type Props = {
  stocks: StockItem[];
  currentWarehouse?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedItems: StockItem[]) => void;
};

export default function StockPickerModal({
  stocks,
  currentWarehouse,
  isOpen,
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchWarehouse = !currentWarehouse || s.warehouseName === currentWarehouse;
      const matchSearch =
        !search ||
        `${s.productIdentifier} ${s.itemDescription} ${s.unit}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchWarehouse && matchSearch;
    });
  }, [stocks, currentWarehouse, search]);

  if (!isOpen) return null;

  function toggleItem(stock: StockItem) {
    const key = `${stock.warehouseName}-${stock.productIdentifier}-${stock.unit}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleConfirm() {
    const chosen = stocks.filter((s) =>
      selectedKeys.has(`${s.warehouseName}-${s.productIdentifier}-${s.unit}`)
    );
    onSelect(chosen);
    setSelectedKeys(new Set());
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stock-picker-title">
      <div className="modal-card" style={{ maxWidth: '960px', width: '95%' }}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">Danh mục kho hàng</span>
            <h3 id="stock-picker-title">Chọn sản phẩm y tế từ kho</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <div className="modal-filter">
          <input
            type="search"
            placeholder="Tìm theo mã hoặc tên vật tư y tế..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {currentWarehouse ? (
            <span className="warehouse-pill">Kho: {currentWarehouse}</span>
          ) : null}
        </div>

        <div className="modal-table-scroll">
          <table className="modal-table">
            <colgroup>
              <col style={{ width: '48px' }} />
              <col style={{ width: '110px' }} />
              <col />
              <col style={{ width: '70px' }} />
              <col style={{ width: '95px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>Chọn</th>
                <th style={{ width: '110px' }}>Mã số</th>
                <th>Tên vật tư, quy cách</th>
                <th style={{ width: '70px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ width: '95px', textAlign: 'right' }}>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((s) => {
                const key = `${s.warehouseName}-${s.productIdentifier}-${s.unit}`;
                const checked = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={checked ? 'selected-row' : ''}
                    onClick={() => toggleItem(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(s)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td><span className="stock-code-plain">{s.productIdentifier}</span></td>
                    <td><span className="item-title">{s.itemDescription}</span></td>
                    <td style={{ textAlign: 'center' }}><span className="stock-unit-plain">{s.unit}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="stock-qty-plain">
                        {Number(s.quantityOnHand).toLocaleString('vi-VN')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filteredStocks.length ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    Không tìm thấy sản phẩm y tế phù hợp trong kho.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="modal-footer">
          <span>Đã chọn: <strong>{selectedKeys.size}</strong> mặt hàng</span>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Hủy</button>
            <button
              type="button"
              className="primary-button"
              disabled={selectedKeys.size === 0}
              onClick={handleConfirm}
            >
              Thêm vào phiếu ({selectedKeys.size})
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

