# Ngôn ngữ nghiệp vụ

- **Chứng từ kho**: một phiếu hoàn tất, loại `IN` hoặc `OUT`, cùng các dòng hàng là ảnh chụp bất biến.
- **Số dư tồn kho**: lượng tồn lũy kế theo `kho + loại định danh + mã/mô tả + đơn vị tính`.
- **Định danh tồn**: dùng mã hàng nếu có; nếu không có thì dùng mô tả chuẩn hóa. Cùng mã khác đơn vị là hai số dư riêng.
- **Hoàn tất phiếu**: một transaction duy nhất lưu đầu phiếu, dòng hàng, tổng tiền và biến động tồn. Xuất không được làm tồn âm.

Từ vựng này được dùng xuyên suốt domain, application và adapter PostgreSQL để tránh các khái niệm trùng lặp.
