# VIMES Inventory

Ứng dụng quản trị kho dược & trang thiết bị y tế: lập phiếu **Nhập/Xuất kho**, theo dõi số dư tồn kho, tra cứu sổ nhật ký chứng từ, phân trang dữ liệu và in phiếu khổ A4.

Dự án ưu tiên tính toàn vẹn dữ liệu, giao dịch nguyên tử (Atomic Database Transaction), ngăn chặn race condition khi xuất kho đồng thời, và mã nguồn phân tầng rõ ràng theo Clean Architecture.

---

## Tính năng nổi bật

Giao diện tải lại tồn kho khi thao tác hoặc làm mới dữ liệu; chưa tự đồng bộ liên tục giữa các phiên. Luồng lấy hàng từ phiếu giao hàng của đối tác chưa được triển khai trên giao diện hiện tại.

### 1. Quản lý Tồn kho Vật tư Y tế
- Theo dõi số dư thực tế theo kho, mã vật tư, quy cách và đơn vị tính (ĐVT).
- KPI tổng quan: Tổng mặt hàng, tổng lượng tồn thực tế, số kho lưu trữ hoạt động.
- Tìm kiếm nhanh đa năng theo kho, mã số hoặc tên danh mục vật tư.
- Phân trang dữ liệu linh hoạt (10, 20, 50 dòng/trang).

### 2. Luồng Lập phiếu 2 Bước Tối ưu (UX)
- **Bước 1 — Soạn thảo danh mục vật tư**:
  - Giao diện bảng tinh gọn, tập trung vào danh sách vật tư cần nhập/xuất.
  - Hỗ trợ 3 nguồn nạp dữ liệu: nhập tay từng dòng, chọn từ kho (`StockPickerModal`) và nạp file Excel (`.xlsx`).
- **Bước 2 — Hoàn thiện thông tin phiếu**:
  - Tự động nạp danh mục vật tư đã xác nhận sang form phiếu nghiệp vụ hoàn chỉnh.
  - Đầy đủ thông tin chứng từ gốc đi kèm (loại chứng từ, số hóa đơn/biên bản, ngày phát hành, đơn vị phát hành), tài khoản kế toán (Nợ/Có), địa điểm kho.
  - Tự động chuyển đổi tổng tiền thành chữ tiếng Việt chuẩn xác bằng Pure Function độc lập có Unit Test kiểm thử.

### 3. Sổ Nhật ký Chứng từ & In ấn A4
- Lọc lịch sử theo loại phiếu (Nhập/Xuất), số chứng từ, khoảng thời gian.
- Xem chi tiết chứng từ, cập nhật thông tin đầu phiếu được phép.
- **In phiếu A4**: Chế độ xem in tự động ẩn thanh điều hướng, có 4 vị trí ký tên (Người lập, Người giao/nhận, Thủ kho, Kế toán trưởng).

---

## Công nghệ sử dụng

| Thành phần | Lựa chọn công nghệ |
| --- | --- |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, CSS Variables |
| **Backend** | NestJS, TypeScript, Clean Architecture (Domain - Application - Infrastructure) |
| **Cơ sở dữ liệu** | PostgreSQL 16 Alpine |
| **Data Access** | Thư viện `pg`, SQL trực tiếp và transaction PostgreSQL |
| **Kiểm thử** | Jest, Vitest, PostgreSQL Integration Test (40 automated tests) |
| **Container** | Docker & Docker Compose |

---

## Khởi chạy nhanh bằng Docker

Yêu cầu **Docker Desktop** đang chạy với Linux containers, hoặc Docker Engine có Compose. Các cổng `3000`, `3001` và `5434` cần còn trống.

```bash
# 1. Di chuyển vào thư mục dự án
cd vimes-inventory

# 2. Khởi chạy toàn bộ hệ thống
docker compose up -d --build
```

Sau khi các container hoàn tất khởi động:
- **Web UI**: http://localhost:3000
- **API Health Check**: http://localhost:3001/api/health
- **PostgreSQL**: `localhost:5434` (User: `vimes` | Password: `vimes_password` | Database: `vimes_inventory`)

Docker Compose đã khai báo biến môi trường cho API và Web; cách chạy này không yêu cầu sao chép file `.env`. Có thể kiểm tra khởi động bằng `docker compose ps` và `docker compose logs --tail=100 api web postgres`.

Các file trong `database/` chỉ tự chạy khi volume PostgreSQL được khởi tạo lần đầu. Khởi động lại với volume cũ không tự cập nhật schema hay nạp lại seed. Dự án hiện chưa có migration runner tự động nâng cấp database cũ.

> Hệ thống tự động nạp dữ liệu mẫu ban đầu gồm **10 mặt hàng dược phẩm & trang thiết bị y tế tiêu chuẩn**, **2 phiếu nhập kho mẫu** (`PNK-2026-001`, `PNK-2026-002`) và **1 phiếu xuất kho mẫu** (`PXK-2026-001`) thuộc **Kho Vật tư Y tế Trung tâm** để người chấm có thể trải nghiệm đầy đủ tính năng ngay lập tức.

```bash
# Dừng ứng dụng và giữ nguyên dữ liệu
docker compose down

# XÓA toàn bộ dữ liệu trong volume PostgreSQL, gồm các phiếu đã tạo, để đặt lại demo
docker compose down -v
docker compose up -d --build
```

---

## Chạy Local cho môi trường Phát triển (Development)

Yêu cầu: Node.js 20+, npm và Docker để chạy PostgreSQL. Tất cả lệnh dưới đây thực hiện tại thư mục `vimes-inventory`. Nếu API/Web đang chạy bằng Docker, dùng `docker compose stop api web` trước để tránh trùng cổng.

```bash
# Cài đặt dependencies toàn bộ monorepo
npm ci

# Khởi chạy database PostgreSQL qua Docker
docker compose up -d postgres
```

Sao chép cấu hình môi trường:

```bash
# Windows PowerShell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Trên Bash, dùng `cp apps/api/.env.example apps/api/.env` và `cp apps/web/.env.example apps/web/.env.local`. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

Mở **hai terminal riêng**, cùng đứng tại thư mục `vimes-inventory`:

```bash
# Terminal 1: API NestJS (Port 3001)
npm run dev:api

```

```bash

# Terminal 2: Web Next.js (Port 3000)
npm run dev:web
```

---

## Kiến trúc Hệ thống (Clean Architecture)

Phần nghiệp vụ chứng từ và quản lý kho được phân tách theo Clean Architecture:

```text
Next.js UI → Nest Controller / DTO → DocumentsService (Facade)
                                           ↓
                                Application Use Cases
                                           ↓
                               DocumentsRepository (Port)
                                           ↓
                         PostgresDocumentsRepository (Adapter)
                                           ↑
                           Domain Rules / Stock Normalization
```

- `apps/api/src/domain`: Luật nghiệp vụ thuần TypeScript (chuẩn hóa định danh, kiểm tra dữ liệu đầu vào); độc lập hoàn toàn với framework và database.
- `apps/api/src/application`: Use case tạo chứng từ, tra cứu danh sách, chi tiết và cập nhật; giao tiếp qua Repository Interface. Tầng này hiện vẫn sử dụng kiểu DTO từ module `documents`.
- `apps/api/src/infrastructure`: Adapter thao tác PostgreSQL, quản lý transaction nguyên tử và khóa bi quan (`SELECT ... FOR UPDATE`).
- `apps/api/src/documents`: Controller / DTO / Service facade tầng NestJS.

Chi tiết ngôn ngữ miền nghiệp vụ dùng chung: [CONTEXT.md](CONTEXT.md).

---

## Mô hình Dữ liệu (Database Schema)

| Bảng dữ liệu | Vai trò & Trách nhiệm |
| --- | --- |
| `inventory_documents` | Bảng chứng từ hợp nhất cho cả `IN` (Nhập) và `OUT` (Xuất): số phiếu, ngày lập, kho, đối tác, chứng từ tham chiếu, tài khoản kế toán, chữ ký, tổng tiền. |
| `inventory_document_items` | Chi tiết các dòng hàng bất biến gắn liền với chứng từ. |
| `inventory_stocks` | Bảng số dư tồn kho theo từng kho + loại định danh + mã/mô tả + đơn vị tính. |
| `schema_migrations` | Ghi nhận tên script SQL đã chạy và thời điểm ghi nhận. |
| `inventory_receipts` / `inventory_receipt_items` | Compatibility layer hỗ trợ endpoint legacy `POST /api/receipts`. |

- **Độ chính xác số lượng**: Database dùng `NUMERIC(18,3)`, lưu tối đa ba chữ số thập phân. Một số phép tính ở ứng dụng vẫn dùng JavaScript `number`.
- **Độ chính xác tài chính**: Đơn giá, thành tiền và tổng tiền lưu bằng `BIGINT` theo đồng VND. Với API chứng từ, SQL tính thành tiền bằng `ROUND(số lượng × đơn giá)` rồi cộng tổng trong transaction. Giá trị frontend tính chỉ phục vụ xem trước.

---

## Cơ chế Đảm bảo Toàn vẹn Dữ liệu (Concurrency & Integrity)

1. **Transaction nguyên tử**: Mỗi thao tác lập phiếu diễn ra trong một chu trình cô lập:
   `BEGIN → Insert Header → Lock/Check Stocks (OUT) → Insert Items → Update Stocks → Calculate Total → COMMIT`. Nếu có lỗi xảy ra ở bất kỳ bước nào, toàn bộ sẽ `ROLLBACK`.
2. **Khóa chống xuất vượt tồn (Pessimistic Locking)**: Khi xuất kho (`OUT`), hệ thống thực thi `SELECT quantity_on_hand FROM inventory_stocks WHERE ... FOR UPDATE` để khóa dòng tồn kho tương ứng, giữ khóa trong giao dịch để kiểm tra và trừ tồn khi có nhiều yêu cầu xuất đồng thời.
3. **Bảo vệ số dư không âm**: Ràng buộc database `CHECK (quantity_on_hand >= 0)` bảo vệ số dư không âm.
4. **Tính bất biến của dữ liệu quá khứ**: Hàng hóa, số lượng, đơn giá và loại phiếu của chứng từ đã hoàn tất là bất biến (immutable). API cho phép cập nhật các trường đầu phiếu như ngày lập, người giao/nhận, tài khoản kế toán, người ký, ghi chú và chứng từ kèm theo; không cho sửa dòng hàng, loại phiếu, số phiếu hoặc kho đã lưu.

---

## Danh sách REST API chính

| Method | Endpoint | Mô tả chức năng |
| --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra trạng thái hoạt động của hệ thống |
| `GET` | `/api/inventory/stocks` | Lấy danh sách tồn kho (hỗ trợ lọc theo `warehouseName`, `productSearch`) |
| `POST` | `/api/inventory/documents` | Lập phiếu Nhập (`IN`) hoặc phiếu Xuất (`OUT`) kho mới |
| `GET` | `/api/inventory/documents` | Sổ nhật ký chứng từ (lọc `type`, `warehouseName`, `documentNumber`, `fromDate`, `toDate`) |
| `GET` | `/api/inventory/documents/:id` | Chi tiết chứng từ và nạp dữ liệu in phiếu |
| `PATCH` | `/api/inventory/documents/:id` | Cập nhật thông tin đầu phiếu / người ký / ghi chú |
| `POST` | `/api/receipts` | API tương thích phiên bản cũ cho phiếu nhập |

---

## Kiểm thử & Chất lượng Mã nguồn (Testing & Verification)

Dự án có **40 test trong mã nguồn hiện tại**: 24 unit test backend, 12 unit test frontend và 4 integration test:

Chạy các lệnh tại thư mục `vimes-inventory`. `npm test` chạy toàn bộ unit test của hai workspace, không bao gồm integration test.

Integration test yêu cầu PostgreSQL đã chạy và có schema từ `database/001_init.sql`. Dùng `docker compose up -d postgres` rồi đợi trạng thái `healthy` trong `docker compose ps`. Test mặc định kết nối cổng `5434`; đặt `DATABASE_URL` trong terminal nếu dùng database kiểm thử riêng. Chỉ chạy trên database phát triển/kiểm thử vì test tạo, dọn dữ liệu và có test tạo trigger tạm trên bảng tồn kho.

```bash
# Chạy Unit Tests Backend (NestJS / Jest) — 24 tests
npm --workspace=@vimes/api run test

# Chạy Integration Tests Backend với PostgreSQL thật — 4 tests
npm --workspace=@vimes/api run test:integration

# Chạy Unit Tests Frontend (Next.js / Vitest) — 12 tests
npm --workspace=@vimes/web run test

# Kiểm tra kiểu dữ liệu TypeScript toàn dự án
npm run typecheck

# Kiểm tra Production Build
npm run build
```

---

## Cấu trúc Thư mục

```text
vimes-inventory/
├── apps/
│   ├── api/                                # Backend NestJS (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/                     # Pure business rules & entities
│   │   │   ├── application/                # Use cases & repository interfaces
│   │   │   ├── infrastructure/             # PostgreSQL repository & transactions
│   │   │   ├── documents/                  # NestJS Controller & DTOs
│   │   │   └── stocks/                     # Stock querying module
│   │   └── test/                           # Integration tests với DB thật
│   └── web/                                # Frontend Next.js 15
│       ├── app/
│       │   ├── components/                 # AdminInventory, ItemSelectionView, DocumentForm, ...
│       │   └── globals.css                 # Giao diện responsive, A4 print styles
│       ├── lib/                            # Tính tiền, đọc số tiếng Việt và unit test
│       └── Dockerfile
├── database/                               # Các tệp Migration & Seed data tự động
│   ├── 001_init.sql                        # Schema, ràng buộc và index
│   └── 002_seed_data.sql                   # 10 mặt hàng, 2 phiếu nhập, 1 phiếu xuất
├── docker-compose.yml                      # Cấu hình khởi chạy 3 containers (Web, API, DB)
├── CONTEXT.md                              # Ubiquitous Language & quy ước nghiệp vụ
└── README.md
```

