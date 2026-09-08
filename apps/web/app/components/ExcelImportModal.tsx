'use client';

import { ChangeEvent, useState } from 'react';
import * as XLSX from 'xlsx';

export type ParsedItem = {
  itemDescription: string;
  productCode: string;
  unit: string;
  documentQuantity?: number;
  actualQuantity: number;
  unitPrice: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: ParsedItem[]) => void;
};

export default function ExcelImportModal({ isOpen, onClose, onImport }: Props) {
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!data || data.length < 2) {
          throw new Error('File Excel không có dữ liệu hợp lệ.');
        }

        // Detect header row (first row or row containing 'Tên' or 'Mã')
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(data.length, 5); i++) {
          const rowStr = (data[i] || []).join(' ').toLowerCase();
          if (rowStr.includes('tên') || rowStr.includes('vật tư') || rowStr.includes('mã')) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (data[headerRowIndex] || []).map((h) => String(h || '').trim().toLowerCase());
        const descCol = headers.findIndex((h) => h.includes('tên') || h.includes('quy cách') || h.includes('mô tả'));
        const codeCol = headers.findIndex((h) => h.includes('mã'));
        const unitCol = headers.findIndex((h) => h.includes('đvt') || h.includes('đơn vị'));
        const docQtyCol = headers.findIndex((h) => h.includes('chứng từ') || h.includes('theo c.từ'));
        const actQtyCol = headers.findIndex((h) => h.includes('thực nhập') || h.includes('thực xuất') || h.includes('số lượng'));
        const priceCol = headers.findIndex((h) => h.includes('đơn giá') || h.includes('giá'));

        const parsed: ParsedItem[] = [];
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          const row = data[r] as unknown[];
          if (!row || !row.length) continue;

          const desc = String(row[descCol >= 0 ? descCol : 1] ?? '').trim();
          if (!desc) continue;

          const code = codeCol >= 0 ? String(row[codeCol] ?? '').trim() : '';
          const unit = unitCol >= 0 ? String(row[unitCol] ?? 'Hộp').trim() : 'Hộp';
          const docQty = docQtyCol >= 0 && row[docQtyCol] !== undefined ? Number(row[docQtyCol]) : undefined;
          const actQty = actQtyCol >= 0 && row[actQtyCol] !== undefined ? Number(row[actQtyCol]) : 1;
          const price = priceCol >= 0 && row[priceCol] !== undefined ? Math.round(Number(row[priceCol])) : 0;

          if (Number.isFinite(actQty) && actQty > 0) {
            parsed.push({
              itemDescription: desc,
              productCode: code,
              unit: unit || 'Hộp',
              documentQuantity: docQty && docQty > 0 ? docQty : undefined,
              actualQuantity: actQty,
              unitPrice: Math.max(0, price),
            });
          }
        }

        if (!parsed.length) {
          throw new Error('Không trích xuất được dòng hàng nào từ file. Vui lòng kiểm tra định dạng cột.');
        }

        setItems(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi khi đọc file Excel.');
        setItems([]);
      }
    };
    reader.readAsBinaryString(file);
  }

  function downloadSampleTemplate() {
    const sampleData = [
      ['STT', 'Tên vật tư, quy cách phẩm chất', 'Mã số', 'Đơn vị tính', 'Số lượng theo chứng từ', 'Số lượng thực nhập', 'Đơn giá (VND)'],
      [1, 'Khẩu trang y tế 4 lớp kháng khuẩn (Hộp 50 cái)', 'KT-4L-50', 'Hộp', 100, 100, 45000],
      [2, 'Găng tay y tế Latex size M (Hộp 100 chiếc)', 'GT-LAT-M', 'Hộp', 50, 50, 120000],
      [3, 'Cồn y tế 70 độ sát khuẩn chai 500ml', 'CT-70-500', 'Chai', 200, 200, 22000],
      [4, 'Bông y tế thấm nước cuộn 500g', 'BY-CU-500', 'Cuộn', 80, 80, 35000],
      [5, 'Nước muối sinh lý Natri Clorid 0.9% 500ml', 'NM-09-500', 'Chai', 300, 300, 15000],
      [6, 'Bơm kim tiêm y tế vô trùng 5ml (Hộp 100 chiếc)', 'KT-5ML', 'Hộp', 40, 40, 190000],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 15 },
      { wch: 12 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Kho_Y_Te');
    XLSX.writeFile(wb, 'VIMES_Mau_Nhap_Kho_Y_Te.xlsx');
  }

  function handleConfirm() {
    if (!items.length) return;
    onImport(items);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="excel-modal-title">
      <div className="modal-card" style={{ maxWidth: '850px' }}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">Nhập liệu hàng loạt</span>
            <h3 id="excel-modal-title">Lấy dữ liệu từ file Excel (.xlsx / .xls)</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>

        <div className="excel-drop-zone">
          <div className="drop-zone-content">
            <p>Chọn file Excel chứa danh sách vật tư y tế:</p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              style={{ marginTop: '0.5rem' }}
            />
            {fileName ? <p className="file-name-tag">📄 Đã tải: <strong>{fileName}</strong></p> : null}
          </div>
          <div className="sample-download">
            <p>Chưa có file mẫu chuẩn?</p>
            <button type="button" onClick={downloadSampleTemplate} className="text-link-button">
              📥 Tải file Excel mẫu vật tư y tế
            </button>
          </div>
        </div>

        {error ? <div className="admin-notice" style={{ margin: '1rem 0' }}>{error}</div> : null}

        {items.length > 0 ? (
          <div className="modal-table-scroll" style={{ maxHeight: '280px', marginTop: '1rem' }}>
            <table className="modal-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã số</th>
                  <th>Tên vật tư y tế</th>
                  <th>ĐVT</th>
                  <th style={{ textAlign: 'right' }}>SL chứng từ</th>
                  <th style={{ textAlign: 'right' }}>SL thực nhập</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td><code>{it.productCode || '—'}</code></td>
                    <td><strong>{it.itemDescription}</strong></td>
                    <td>{it.unit}</td>
                    <td style={{ textAlign: 'right' }}>{it.documentQuantity ?? '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.actualQuantity}</td>
                    <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="modal-footer">
          <span>Tìm thấy: <strong>{items.length}</strong> dòng hàng hóa</span>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Hủy</button>
            <button
              type="button"
              className="primary-button"
              disabled={items.length === 0}
              onClick={handleConfirm}
            >
              Áp dụng vào phiếu ({items.length})
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

