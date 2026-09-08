import { ConflictException } from '@nestjs/common';
import { DatabaseService } from '../src/database/database.service';
import { DocumentsService } from '../src/documents/documents.service';
import { PostgresDocumentsRepository } from '../src/infrastructure/postgres/postgres-documents.repository';

describe('inventory documents (PostgreSQL)', () => {
  const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const warehouse = `Kho documents ${suffix}`;
  const code = `MED-${suffix}`;
  let database: DatabaseService; let service: DocumentsService;
  beforeAll(() => { process.env.DATABASE_URL ??= 'postgresql://vimes:vimes_password@localhost:5434/vimes_inventory'; database = new DatabaseService(); service = new DocumentsService(new PostgresDocumentsRepository(database)); });
  afterAll(async () => { await database.query('DELETE FROM inventory_document_items WHERE document_id IN (SELECT id FROM inventory_documents WHERE document_number LIKE $1)', [`IT-DOC-${suffix}%`]); await database.query('DELETE FROM inventory_documents WHERE document_number LIKE $1', [`IT-DOC-${suffix}%`]); await database.query('DELETE FROM inventory_stocks WHERE warehouse_key=$1 AND product_key=$2', [warehouse.toLowerCase(), code.toLowerCase()]); await database.onModuleDestroy(); });
  const payload = (type: 'IN' | 'OUT', suffixNumber: string, quantity: number) => ({ type, documentNumber: `IT-DOC-${suffix}-${suffixNumber}`, documentDate: '2026-09-07', counterpartyName: 'Integration', warehouseName: warehouse, items: [{ itemDescription: 'Vật tư y tế test', productCode: code, unit: 'Hộp', actualQuantity: quantity, unitPrice: 10000 }] });
  it('adds stock on IN and subtracts stock on OUT', async () => {
    await service.create(payload('IN', 'IN', 100));
    await service.create(payload('OUT', 'OUT', 40));
    const stock = await database.query<{ quantity_on_hand: string }>('SELECT quantity_on_hand::text FROM inventory_stocks WHERE warehouse_key=$1 AND product_key=$2', [warehouse.toLowerCase(), code.toLowerCase()]);
    expect(stock.rows[0].quantity_on_hand).toBe('60.000');
  });
  it('rejects an OUT that would make stock negative without saving its document', async () => {
    const number = `IT-DOC-${suffix}-FAIL`;
    await expect(service.create(payload('OUT', 'FAIL', 61))).rejects.toBeInstanceOf(ConflictException);
    await expect(database.query('SELECT id FROM inventory_documents WHERE document_number=$1', [number])).resolves.toMatchObject({ rows: [] });
  });
});
