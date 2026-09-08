# Clean Architecture

`domain/inventory` là lõi thuần: chuẩn hóa văn bản, khóa định danh tồn và các bất biến của chứng từ. Nó không import NestJS, PostgreSQL hay DTO HTTP.

`application` chứa use case: tạo chứng từ, truy vấn lịch sử, xem chi tiết và cập nhật đầu phiếu. Controller chỉ chuyển request vào use case; PostgreSQL là adapter thực thi repository/transaction.

```text
Next.js → Nest controller → application use case → repository port → PostgreSQL adapter
                              ↑
                        domain rules
```

Quy tắc quan trọng: phiếu nhập/xuất và cập nhật tồn phải đi trong một transaction; tồn không âm; dữ liệu hàng của phiếu đã hoàn tất là bất biến.
