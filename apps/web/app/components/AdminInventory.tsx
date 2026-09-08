'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DocumentForm, { DocumentType, InitialVoucherData } from './DocumentForm';
import ItemSelectionView from './ItemSelectionView';
import { StockItem } from './StockPickerModal';

type DocumentData = {
  id: string;
  type: DocumentType;
  documentNumber: string;
  documentDate: string;
  createdAt?: string;
  organization?: string;
  department?: string;
  debitAccount?: string;
  creditAccount?: string;
  counterpartyName: string;
  referenceType?: string;
  referenceNumber?: string;
  referenceDate?: string;
  referenceIssuer?: string;
  referenceDocument?: string;
  warehouseName: string;
  warehouseLocation?: string;
  attachedDocumentCount?: number;
  notes?: string;
  preparedBy?: string;
  warehouseKeeper?: string;
  chiefAccountant?: string;
  totalAmount: string;
  items?: Array<{
    lineNumber: number;
    itemDescription: string;
    productCode?: string;
    unit: string;
    documentQuantity?: string;
    actualQuantity: string;
    unitPrice: number;
    lineTotal: string;
  }>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function Pagination({
  current,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  current: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Hiển thị {start}–{end} / {total} dòng
      </span>
      <div className="pagination-controls">
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="page-size-select"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} dòng / trang</option>
          ))}
        </select>
        <button type="button" disabled={current <= 1} onClick={() => onPage(current - 1)}>
          ‹ Trước
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pages || Math.abs(p - current) <= 1)
          .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === 'dots' ? (
              <span key={`d${i}`} className="page-dots">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={p === current ? 'page-btn active' : 'page-btn'}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            )
          )}
        <button type="button" disabled={current >= pages} onClick={() => onPage(current + 1)}>
          Sau ›
        </button>
      </div>
    </div>
  );
}

const money = (value: unknown) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    Number(value ?? 0)
  );

function formatCreatedAt(value: string | undefined, fallback: string) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

function formatStockQty(qty: number | string | undefined | null) {
  const num = Number(qty || 0);
  if (Number.isInteger(num)) {
    return num.toLocaleString('vi-VN');
  }
  return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, options);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? (data as { message: unknown }).message
        : 'Yêu cầu không thành công';
    throw new Error(Array.isArray(message) ? message.join('. ') : String(message));
  }
  return data as T;
}

export default function AdminInventory() {
  const [view, setView] = useState<'stocks' | 'select-items' | 'edit-voucher' | 'history'>('stocks');
  const [activeType, setActiveType] = useState<DocumentType>('IN');
  const [stagedVoucherData, setStagedVoucherData] = useState<InitialVoucherData | null>(null);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>();
  const [notice, setNotice] = useState('');

  const loadStocks = useCallback(async () => {
    try {
      const res = await api<{ items: StockItem[] }>('/api/inventory/stocks');
      setStocks(res.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không tải được tồn kho');
    }
  }, []);

  const loadDocuments = useCallback(async (query = '') => {
    try {
      const res = await api<{ items: DocumentData[] }>(`/api/inventory/documents${query}`);
      setDocuments(res.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không tải được lịch sử');
    }
  }, []);

  useEffect(() => {
    void loadStocks();
  }, [loadStocks]);

  function openDetail(document: DocumentData) {
    void api<DocumentData>(`/api/inventory/documents/${document.id}`)
      .then((item) => {
        setEditingDocumentId(item.id);
        setActiveType(item.type);
        setStagedVoucherData({
          documentNumber: item.documentNumber,
          documentDate: String(item.documentDate).slice(0, 10),
          organization: item.organization || '',
          department: item.department || '',
          debitAccount: item.debitAccount || '',
          creditAccount: item.creditAccount || '',
          warehouseName: item.warehouseName,
          warehouseLocation: item.warehouseLocation,
          counterpartyName: item.counterpartyName,
          referenceType: item.referenceType,
          referenceNumber: item.referenceNumber,
          referenceDate: item.referenceDate,
          referenceIssuer: item.referenceIssuer,
          referenceDocument: item.referenceDocument,
          attachedDocumentCount: item.attachedDocumentCount,
          notes: item.notes,
          preparedBy: item.preparedBy,
          warehouseKeeper: item.warehouseKeeper,
          chiefAccountant: item.chiefAccountant,
          items: (item.items ?? []).map((line) => ({
            itemDescription: line.itemDescription,
            productCode: line.productCode || '',
            unit: line.unit,
            documentQuantity: line.documentQuantity || '',
            actualQuantity: line.actualQuantity,
            unitPrice: String(line.unitPrice),
          })),
        });
        setView('edit-voucher');
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : 'Lỗi tải phiếu'));
  }

  const nav = (next: 'stocks' | 'history') => {
    setNotice('');
    setView(next);
    if (next === 'history') void loadDocuments();
    if (next === 'stocks') {
      setStagedVoucherData(null);
      setEditingDocumentId(undefined);
      void loadStocks();
    }
  };

  return (
    <main className="admin-shell">
      {/* Sidebar with ONLY 2 main items */}
      <aside className="admin-rail no-print">
        <div className="brand">
          <span>VIMES HEALTHCARE</span>
          <strong>Quản lý kho y tế</strong>
        </div>

        <nav aria-label="Menu chính">
          <button
            type="button"
            className={view === 'stocks' || view === 'select-items' || view === 'edit-voucher' ? 'active' : ''}
            onClick={() => nav('stocks')}
          >
            📦 Quản lý kho hàng
          </button>
          <button
            type="button"
            className={view === 'history' ? 'active' : ''}
            onClick={() => nav('history')}
          >
            📜 Lịch sử nhập – xuất
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <section className="admin-content">
        {notice ? (
          <div className="admin-notice" role="status">
            {notice}
          </div>
        ) : null}

        {/* View 1: Quản lý kho (Dashboard trung tâm với 2 nút Nhập kho / Xuất kho) */}
        {view === 'stocks' ? (
          <Stocks
            stocks={stocks}
            reload={loadStocks}
            onOpenCreate={(type) => {
              setNotice('');
              setActiveType(type);
              setStagedVoucherData(null);
              setView('select-items');
            }}
          />
        ) : null}

        {/* View 2: Bước 1 - Màn hình danh sách các vật liệu nhập/xuất theo bảng */}
        {view === 'select-items' ? (
          <ItemSelectionView
            type={activeType}
            stocks={stocks}
            initialWarehouse={stagedVoucherData?.warehouseName}
            initialItems={stagedVoucherData?.items}
            initialCounterpartyName={stagedVoucherData?.counterpartyName}
            onBack={() => setView('stocks')}
            onConfirmAndCreateVoucher={(data) => {
              setStagedVoucherData(data);
              setView('edit-voucher');
            }}
          />
        ) : null}

        {/* View 3: Bước 2 - Màn hình chỉnh sửa phiếu Mẫu 01-VT như cũ (đã có đầy đủ sản phẩm) */}
        {view === 'edit-voucher' ? (
          <DocumentForm
            type={activeType}
            stocks={stocks}
            initialData={stagedVoucherData}
            documentId={editingDocumentId}
            onBack={() => setView(editingDocumentId ? 'history' : 'select-items')}
            onCreated={(message) => {
              setNotice(message);
              setStagedVoucherData(null);
              nav('history');
            }}
          />
        ) : null}

        {/* View 4: Lịch sử nhập - xuất kho với bộ lọc đẹp */}
        {view === 'history' ? (
          <History documents={documents} reload={loadDocuments} open={openDetail} />
        ) : null}

      </section>
    </main>
  );
}

function Stocks({
  stocks,
  reload,
  onOpenCreate,
}: {
  stocks: StockItem[];
  reload: () => Promise<void>;
  onOpenCreate: (type: DocumentType) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const visible = useMemo(
    () =>
      stocks.filter((stock) =>
        `${stock.warehouseName} ${stock.productIdentifier} ${stock.itemDescription}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [stocks, search]
  );

  const paginatedVisible = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  const totalQuantity = useMemo(
    () => stocks.reduce((acc, s) => acc + Number(s.quantityOnHand || 0), 0),
    [stocks]
  );

  const totalWarehouses = useMemo(
    () => new Set(stocks.map((s) => s.warehouseName)).size,
    [stocks]
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="stocks-view">
      {/* Top Header with Quick Action Buttons */}
      <header className="page-header-banner">
        <div className="header-titles">
          <span className="eyebrow">Hệ thống kho dược & trang thiết bị</span>
          <h1>Quản lý tồn kho vật tư</h1>
        </div>

        {/* Nút Nhập kho & Xuất kho đặt trực tiếp tại đây */}
        <div className="header-actions">
          <button
            type="button"
            className="action-btn in-btn"
            onClick={() => onOpenCreate('IN')}
          >
            ➕ Nhập kho
          </button>
          <button
            type="button"
            className="action-btn out-btn"
            onClick={() => onOpenCreate('OUT')}
          >
            ➖ Xuất kho
          </button>
        </div>
      </header>

      {/* Summary KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">Tổng mặt hàng</span>
          <strong className="kpi-val">{stocks.length} <small>vật tư y tế</small></strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tổng lượng tồn thực tế</span>
          <strong className="kpi-val highlight">{formatStockQty(totalQuantity)} <small>đơn vị</small></strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Số kho lưu trữ</span>
          <strong className="kpi-val">{totalWarehouses} <small>kho hoạt động</small></strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo kho, mã số hoặc tên danh mục vật tư y tế..."
          />
          {search ? (
            <button type="button" className="clear-search-btn" onClick={() => handleSearchChange('')}>✕</button>
          ) : null}
        </div>

        <button type="button" className="refresh-btn" onClick={() => void reload()}>
          🔄 Làm mới dữ liệu
        </button>
      </div>

      {/* Stocks Data Table */}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Kho hàng lưu trữ</th>
              <th style={{ width: '15%' }}>Mã vật tư</th>
              <th style={{ width: '38%' }}>Tên vật tư, quy cách y tế</th>
              <th style={{ width: '8%', textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: '17%', textAlign: 'right' }}>Số lượng tồn</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVisible.map((s) => (
              <tr key={`${s.warehouseName}-${s.productIdentifier}-${s.unit}`}>
                <td>
                  <strong>{s.warehouseName}</strong>
                </td>
                <td>
                  <span className="stock-code-plain">{s.productIdentifier}</span>
                </td>
                <td>
                  <strong className="item-title">{s.itemDescription}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="stock-unit-plain">{s.unit}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="stock-qty-plain">
                    {formatStockQty(s.quantityOnHand)}
                  </span>
                </td>
              </tr>
            ))}
            {!visible.length ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#777' }}>
                  Không tìm thấy mặt hàng y tế nào khớp với từ khóa tìm kiếm.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <Pagination
          current={page}
          total={visible.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>
    </div>
  );
}

function History({
  documents,
  reload,
  open,
}: {
  documents: DocumentData[];
  reload: (q?: string) => Promise<void>;
  open: (d: DocumentData) => void;
}) {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const triggerFilter = useCallback(
    (nextType: string, nextSearch: string) => {
      setPage(1);
      const params = new URLSearchParams();
      if (nextType) params.set('type', nextType);
      if (nextSearch.trim()) params.set('documentNumber', nextSearch.trim());
      void reload(params.toString() ? `?${params.toString()}` : '');
    },
    [reload]
  );

  function handleTypeChange(nextType: string) {
    setType(nextType);
    triggerFilter(nextType, search);
  }

  function handleFilter() {
    triggerFilter(type, search);
  }

  function handleReset() {
    setPage(1);
    setType('');
    setSearch('');
    void reload('');
  }

  const paginatedDocuments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return documents.slice(start, start + pageSize);
  }, [documents, page, pageSize]);

  return (
    <div className="history-view">
      <header className="page-header-banner">
        <div className="header-titles">
          <span className="eyebrow">Sổ nhật ký chứng từ</span>
          <h1>Lịch sử nhập – xuất kho</h1>
        </div>
      </header>

      {/* Redesigned Modern Filter Toolbar */}
      <div className="filter-card">
        <div className="filter-item type-filter">
          <label className="filter-label">Loại chứng từ:</label>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="">Tất cả loại phiếu</option>
            <option value="IN">Phiếu nhập kho</option>
            <option value="OUT">Phiếu xuất kho</option>
          </select>
        </div>

        <div className="filter-item search-filter">
          <label className="filter-label">Tìm kiếm số chứng từ:</label>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập số phiếu (VD: PNK-2026-001)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFilter();
              }}
            />
            {search ? (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch('');
                  triggerFilter(type, '');
                }}
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        <div className="filter-item filter-btn-col">
          <label className="filter-label">&nbsp;</label>
          <div className="filter-btn-group">
            <button type="button" className="search-action-btn" onClick={handleFilter}>
              🔍 Tìm kiếm
            </button>
            <button
              type="button"
              className="reset-action-btn"
              onClick={handleReset}
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* History Data Table */}
      <div className="admin-table" style={{ marginTop: '1.25rem' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '120px', textAlign: 'center' }}>Loại phiếu</th>
              <th style={{ width: '150px' }}>Số chứng từ</th>
              <th style={{ width: '110px' }}>Ngày lập</th>
              <th style={{ width: '190px' }}>Kho lưu trữ</th>
              <th style={{ minWidth: '220px' }}>Đối tác giao / nhận</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Tổng thành tiền</th>
              <th style={{ width: '170px', textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocuments.map((d) => (
              <tr key={d.id}>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>
                  {d.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}
                </td>
                <td>
                  <strong className="doc-num">{d.documentNumber}</strong>
                </td>
                <td>{formatCreatedAt(d.createdAt, String(d.documentDate))}</td>
                <td>{d.warehouseName}</td>
                <td><strong>{d.counterpartyName}</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#183c3b' }}>
                  {money(d.totalAmount)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button type="button" onClick={() => open(d)} className="print-action-btn">
                    📄 Xem / in phiếu
                  </button>
                </td>
              </tr>
            ))}
            {!documents.length ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#777' }}>
                  Chưa có chứng từ nào được lưu trong hệ thống.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <Pagination
          current={page}
          total={documents.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>
    </div>
  );
}
