'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type StockItem = {
  warehouseName: string;
  identifierType: 'CODE' | 'DESCRIPTION';
  productIdentifier: string;
  itemDescription: string;
  unit: string;
  quantityOnHand: string;
  lastUpdatedAt: string;
};

type StockResponse = { items: StockItem[] };

function formatQuantity(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(parsed)
    : value;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function StockTable() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouseName, setWarehouseName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStocks = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/inventory/stocks`,
        { signal },
      );
      if (!response.ok) throw new Error(`Không thể tải tồn kho (HTTP ${response.status}).`);
      const data = (await response.json()) as StockResponse;
      setItems(data.items);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error && cause.message.startsWith('Không thể') ? cause.message : 'Không thể kết nối API tồn kho. Vui lòng kiểm tra backend.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadStocks(controller.signal);
    return () => controller.abort();
  }, [loadStocks]);

  const warehouses = useMemo(
    () => [...new Set(items.map((item) => item.warehouseName))].sort((a, b) => a.localeCompare(b, 'vi')),
    [items],
  );
  const visibleItems = useMemo(() => {
    const key = warehouseName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
    return key ? items.filter((item) => item.warehouseName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') === key) : items;
  }, [items, warehouseName]);

  return (
    <section className="stock-book" aria-labelledby="stock-title">
      <header className="stock-book-header">
        <div>
          <p className="eyebrow">Sổ tổng hợp · phát sinh nhập</p>
          <h2 id="stock-title">Sổ theo dõi tồn kho</h2>
          <p>Tồn lũy kế từ các phiếu nhập đã được ghi nhận trong hệ thống.</p>
        </div>
        <div className="stock-tools">
          <label>
            Lọc theo kho
            <input
              list="warehouse-options"
              value={warehouseName}
              onChange={(event) => setWarehouseName(event.target.value)}
              placeholder="Tất cả kho"
            />
            <datalist id="warehouse-options">
              {warehouses.map((warehouse) => <option key={warehouse} value={warehouse} />)}
            </datalist>
          </label>
          <button className="secondary-button" type="button" onClick={() => void loadStocks()} disabled={isLoading}>
            {isLoading ? 'Đang tải…' : 'Làm mới dữ liệu'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="stock-state error" role="alert">
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={() => void loadStocks()}>Thử lại</button>
        </div>
      ) : isLoading ? (
        <p className="stock-state" role="status">Đang đọc số dư tồn kho…</p>
      ) : visibleItems.length === 0 ? (
        <div className="stock-state"><strong>Chưa có số dư phù hợp</strong><p>Hãy lưu một phiếu nhập hoặc thay đổi bộ lọc kho.</p></div>
      ) : (
        <div className="table-scroll stock-table-scroll">
          <table className="stock-table">
            <thead><tr><th>Kho hàng</th><th>Mã / định danh</th><th>Tên vật tư, quy cách</th><th>ĐVT</th><th>Số lượng tồn</th><th>Cập nhật lúc</th></tr></thead>
            <tbody>{visibleItems.map((item) => (
              <tr key={`${item.warehouseName}-${item.identifierType}-${item.productIdentifier}-${item.unit}`}>
                <td>{item.warehouseName}</td>
                <td><span className="identifier-type">{item.identifierType === 'CODE' ? 'Mã' : 'Theo tên'}</span><strong>{item.productIdentifier}</strong></td>
                <td>{item.itemDescription}</td><td>{item.unit}</td>
                <td className="quantity-cell">{formatQuantity(item.quantityOnHand)}</td>
                <td>{formatUpdatedAt(item.lastUpdatedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
