BEGIN;

-- Seed demo: số dư cuối cùng đúng với 2 phiếu nhập và 1 phiếu xuất bên dưới.
INSERT INTO inventory_documents (
  id, document_type, document_number, document_date, organization, department,
  debit_account, credit_account, counterparty_name, reference_type, reference_number,
  reference_date, reference_issuer, warehouse_name, warehouse_location, warehouse_key,
  attached_document_count, notes, prepared_by, warehouse_keeper, chief_accountant, total_amount
) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'IN', 'PNK-2026-001', '2026-09-01', 'Bệnh viện Đa khoa Quốc tế VIMES', 'Khoa Dược & Vật tư Y tế', '1561', '331', 'Nguyễn Thị Mai', 'Hóa đơn GTGT', 'HD-2026-001', '2026-09-01', 'Công ty CP Dược phẩm & Thiết bị Y tế MediTech', 'Kho Vật tư Y tế Trung tâm', 'Tầng 1, nhà A', 'kho vật tư y tế trung tâm', 2, 'Nhập vật tư y tế đầu kỳ.', 'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 111085000),
  ('a2000000-0000-4000-8000-000000000002', 'IN', 'PNK-2026-002', '2026-09-03', 'Bệnh viện Đa khoa Quốc tế VIMES', 'Khoa Dược & Vật tư Y tế', '1561', '331', 'Trần Quốc Bảo', 'Phiếu giao hàng', 'PGH-2026-002', '2026-09-03', 'Công ty CP Dược phẩm & Thiết bị Y tế MediTech', 'Kho Vật tư Y tế Trung tâm', 'Tầng 1, nhà A', 'kho vật tư y tế trung tâm', 1, 'Bổ sung một cuộn bông y tế.', 'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 35000),
  ('a3000000-0000-4000-8000-000000000003', 'OUT', 'PXK-2026-001', '2026-09-05', 'Bệnh viện Đa khoa Quốc tế VIMES', 'Khoa Cấp cứu', '632', '1561', 'Phạm Minh Đức', 'Phiếu yêu cầu xuất kho', 'PYC-2026-001', '2026-09-05', 'Khoa Cấp cứu', 'Kho Vật tư Y tế Trung tâm', 'Tầng 1, nhà A', 'kho vật tư y tế trung tâm', 1, 'Xuất một cuộn bông phục vụ cấp cứu.', 'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 35000)
ON CONFLICT (document_type, document_number) DO NOTHING;

INSERT INTO inventory_document_items (
  document_id, line_number, item_description, product_code, identifier_type, product_identifier,
  product_key, unit, unit_key, document_quantity, actual_quantity, unit_price, line_total
) VALUES
  ('a1000000-0000-4000-8000-000000000001', 1, 'Bông y tế thấm nước cuộn 500g', 'BY-CU-500', 'CODE', 'BY-CU-500', 'by-cu-500', 'Cuộn', 'cuộn', 151, 151, 35000, 5285000),
  ('a1000000-0000-4000-8000-000000000001', 2, 'Băng dán vô trùng chống thấm Urgo (Hộp 100 miếng)', 'BK-URGO', 'CODE', 'BK-URGO', 'bk-urgo', 'Hộp', 'hộp', 100, 100, 65000, 6500000),
  ('a1000000-0000-4000-8000-000000000001', 3, 'Bơm kim tiêm y tế vô trùng 5ml Terumo (Hộp 100 chiếc)', 'KT-5ML', 'CODE', 'KT-5ML', 'kt-5ml', 'Hộp', 'hộp', 70, 70, 190000, 13300000),
  ('a1000000-0000-4000-8000-000000000001', 4, 'Cồn y tế 70 độ sát trùng chai 500ml', 'CT-70-500', 'CODE', 'CT-70-500', 'ct-70-500', 'Chai', 'chai', 300, 300, 22000, 6600000),
  ('a1000000-0000-4000-8000-000000000001', 5, 'Dung dịch sát khuẩn Chlorhexidine 2% (Chai 500ml)', 'DD-CHX-500', 'CODE', 'DD-CHX-500', 'dd-chx-500', 'Chai', 'chai', 100, 100, 50000, 5000000),
  ('a1000000-0000-4000-8000-000000000001', 6, 'Dung dịch truyền Glucose 5% 500ml', 'GLU-5-500', 'CODE', 'GLU-5-500', 'glu-5-500', 'Chai', 'chai', 200, 200, 22000, 4400000),
  ('a1000000-0000-4000-8000-000000000001', 7, 'Găng tay y tế Latex có bột size M (Hộp 100 chiếc)', 'GT-LAT-M', 'CODE', 'GT-LAT-M', 'gt-lat-m', 'Hộp', 'hộp', 200, 200, 120000, 24000000),
  ('a1000000-0000-4000-8000-000000000001', 8, 'Khẩu trang lọc bụi y tế N95 3M 9501+ (Hộp 25 cái)', 'KT-N95', 'CODE', 'KT-N95', 'kt-n95', 'Hộp', 'hộp', 50, 50, 320000, 16000000),
  ('a1000000-0000-4000-8000-000000000001', 9, 'Khẩu trang y tế 4 lớp kháng khuẩn (Hộp 50 cái)', 'KT-4L-50', 'CODE', 'KT-4L-50', 'kt-4l-50', 'Hộp', 'hộp', 500, 500, 45000, 22500000),
  ('a1000000-0000-4000-8000-000000000001', 10, 'Nước muối sinh lý Natri Clorid 0.9% (Chai 500ml)', 'NM-09-500', 'CODE', 'NM-09-500', 'nm-09-500', 'Chai', 'chai', 500, 500, 15000, 7500000),
  ('a2000000-0000-4000-8000-000000000002', 1, 'Bông y tế thấm nước cuộn 500g', 'BY-CU-500', 'CODE', 'BY-CU-500', 'by-cu-500', 'Cuộn', 'cuộn', 1, 1, 35000, 35000),
  ('a3000000-0000-4000-8000-000000000003', 1, 'Bông y tế thấm nước cuộn 500g', 'BY-CU-500', 'CODE', 'BY-CU-500', 'by-cu-500', 'Cuộn', 'cuộn', 1, 1, 35000, 35000)
ON CONFLICT (document_id, line_number) DO NOTHING;

INSERT INTO inventory_stocks (
  warehouse_name, warehouse_key, identifier_type, product_identifier, product_key,
  item_description, unit, unit_key, quantity_on_hand
) VALUES
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'BY-CU-500', 'by-cu-500', 'Bông y tế thấm nước cuộn 500g', 'Cuộn', 'cuộn', 151),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'BK-URGO', 'bk-urgo', 'Băng dán vô trùng chống thấm Urgo (Hộp 100 miếng)', 'Hộp', 'hộp', 100),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'KT-5ML', 'kt-5ml', 'Bơm kim tiêm y tế vô trùng 5ml Terumo (Hộp 100 chiếc)', 'Hộp', 'hộp', 70),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'CT-70-500', 'ct-70-500', 'Cồn y tế 70 độ sát trùng chai 500ml', 'Chai', 'chai', 300),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'DD-CHX-500', 'dd-chx-500', 'Dung dịch sát khuẩn Chlorhexidine 2% (Chai 500ml)', 'Chai', 'chai', 100),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'GLU-5-500', 'glu-5-500', 'Dung dịch truyền Glucose 5% 500ml', 'Chai', 'chai', 200),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'GT-LAT-M', 'gt-lat-m', 'Găng tay y tế Latex có bột size M (Hộp 100 chiếc)', 'Hộp', 'hộp', 200),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'KT-N95', 'kt-n95', 'Khẩu trang lọc bụi y tế N95 3M 9501+ (Hộp 25 cái)', 'Hộp', 'hộp', 50),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'KT-4L-50', 'kt-4l-50', 'Khẩu trang y tế 4 lớp kháng khuẩn (Hộp 50 cái)', 'Hộp', 'hộp', 500),
  ('Kho Vật tư Y tế Trung tâm', 'kho vật tư y tế trung tâm', 'CODE', 'NM-09-500', 'nm-09-500', 'Nước muối sinh lý Natri Clorid 0.9% (Chai 500ml)', 'Chai', 'chai', 500)
ON CONFLICT (warehouse_key, identifier_type, product_key, unit_key) DO UPDATE SET
  warehouse_name = EXCLUDED.warehouse_name,
  product_identifier = EXCLUDED.product_identifier,
  item_description = EXCLUDED.item_description,
  unit = EXCLUDED.unit,
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  last_updated_at = NOW();

INSERT INTO schema_migrations (version) VALUES ('002_seed_data.sql') ON CONFLICT DO NOTHING;
COMMIT;
