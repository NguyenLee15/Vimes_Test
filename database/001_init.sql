BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(3) NOT NULL CHECK (document_type IN ('IN', 'OUT')),
  document_number VARCHAR(50) NOT NULL CHECK (btrim(document_number) <> ''),
  document_date DATE NOT NULL,
  organization TEXT,
  department TEXT,
  debit_account VARCHAR(50),
  credit_account VARCHAR(50),
  counterparty_name TEXT NOT NULL CHECK (btrim(counterparty_name) <> ''),
  reference_type VARCHAR(100),
  reference_number VARCHAR(100),
  reference_date DATE,
  reference_issuer TEXT,
  reference_document TEXT,
  warehouse_name TEXT NOT NULL CHECK (btrim(warehouse_name) <> ''),
  warehouse_location TEXT,
  warehouse_key TEXT NOT NULL CHECK (btrim(warehouse_key) <> ''),
  attached_document_count INTEGER NOT NULL DEFAULT 0 CHECK (attached_document_count >= 0),
  notes TEXT,
  prepared_by TEXT,
  warehouse_keeper TEXT,
  chief_accountant TEXT,
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_documents_type_number_unique UNIQUE (document_type, document_number)
);

CREATE TABLE IF NOT EXISTS inventory_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES inventory_documents(id) ON DELETE RESTRICT,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  item_description TEXT NOT NULL CHECK (btrim(item_description) <> ''),
  product_code VARCHAR(100),
  identifier_type VARCHAR(11) NOT NULL CHECK (identifier_type IN ('CODE', 'DESCRIPTION')),
  product_identifier TEXT NOT NULL CHECK (btrim(product_identifier) <> ''),
  product_key TEXT NOT NULL CHECK (btrim(product_key) <> ''),
  unit TEXT NOT NULL CHECK (btrim(unit) <> ''),
  unit_key TEXT NOT NULL CHECK (btrim(unit_key) <> ''),
  document_quantity NUMERIC(18, 3) CHECK (document_quantity IS NULL OR document_quantity >= 0),
  actual_quantity NUMERIC(18, 3) NOT NULL CHECK (actual_quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  line_total BIGINT NOT NULL CHECK (line_total >= 0),
  CONSTRAINT inventory_document_items_line_unique UNIQUE (document_id, line_number)
);

CREATE TABLE IF NOT EXISTS inventory_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name TEXT NOT NULL CHECK (btrim(warehouse_name) <> ''),
  warehouse_key TEXT NOT NULL CHECK (btrim(warehouse_key) <> ''),
  identifier_type VARCHAR(11) NOT NULL CHECK (identifier_type IN ('CODE', 'DESCRIPTION')),
  product_identifier TEXT NOT NULL CHECK (btrim(product_identifier) <> ''),
  product_key TEXT NOT NULL CHECK (btrim(product_key) <> ''),
  item_description TEXT NOT NULL CHECK (btrim(item_description) <> ''),
  unit TEXT NOT NULL CHECK (btrim(unit) <> ''),
  unit_key TEXT NOT NULL CHECK (btrim(unit_key) <> ''),
  quantity_on_hand NUMERIC(18, 3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_stocks_identity_unique UNIQUE (warehouse_key, identifier_type, product_key, unit_key)
);

CREATE INDEX IF NOT EXISTS inventory_documents_history_idx ON inventory_documents (document_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_documents_warehouse_idx ON inventory_documents (warehouse_key);
CREATE INDEX IF NOT EXISTS inventory_document_items_document_idx ON inventory_document_items (document_id);
CREATE INDEX IF NOT EXISTS inventory_stocks_warehouse_key_idx ON inventory_stocks (warehouse_key);

-- Bảng tương thích endpoint POST /api/receipts của bài test gốc.
CREATE TABLE IF NOT EXISTS inventory_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(receipt_number) <> ''),
  receipt_date DATE NOT NULL,
  organization TEXT,
  department TEXT,
  debit_account VARCHAR(50),
  credit_account VARCHAR(50),
  delivered_by TEXT NOT NULL CHECK (btrim(delivered_by) <> ''),
  reference_document TEXT,
  warehouse_name TEXT NOT NULL CHECK (btrim(warehouse_name) <> ''),
  attached_document_count INTEGER NOT NULL DEFAULT 0 CHECK (attached_document_count >= 0),
  notes TEXT,
  prepared_by TEXT,
  warehouse_keeper TEXT,
  chief_accountant TEXT,
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES inventory_receipts(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  item_description TEXT NOT NULL CHECK (btrim(item_description) <> ''),
  product_code VARCHAR(100),
  unit TEXT NOT NULL CHECK (btrim(unit) <> ''),
  document_quantity NUMERIC(18, 3) CHECK (document_quantity IS NULL OR document_quantity >= 0),
  received_quantity NUMERIC(18, 3) NOT NULL CHECK (received_quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  line_total BIGINT NOT NULL CHECK (line_total >= 0),
  CONSTRAINT inventory_receipt_items_receipt_line_unique UNIQUE (receipt_id, line_number)
);

CREATE INDEX IF NOT EXISTS inventory_receipt_items_receipt_id_idx ON inventory_receipt_items (receipt_id);

INSERT INTO schema_migrations (version) VALUES ('001_init.sql') ON CONFLICT DO NOTHING;
COMMIT;
