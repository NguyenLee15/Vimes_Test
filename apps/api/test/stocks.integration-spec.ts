import { DatabaseService } from '../src/database/database.service';
import { CreateReceiptDto } from '../src/receipts/dto/create-receipt.dto';
import { ReceiptsService } from '../src/receipts/receipts.service';
import { StocksService } from '../src/stocks/stocks.service';

describe('receipt-derived stock balances (PostgreSQL)', () => {
  let database: DatabaseService;
  let receipts: ReceiptsService;
  let stocks: StocksService;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const warehouse = `Kho integration ${suffix}`;
  const otherWarehouse = `Kho khác ${suffix}`;
  const receiptNumbers: string[] = [];

  beforeAll(() => {
    process.env.DATABASE_URL ??= 'postgresql://vimes:vimes_password@localhost:5434/vimes_inventory';
    database = new DatabaseService();
    receipts = new ReceiptsService(database);
    stocks = new StocksService(database);
  });

  afterAll(async () => {
    await database.query('DELETE FROM inventory_receipts WHERE receipt_number = ANY($1::text[])', [receiptNumbers]);
    await database.query('DELETE FROM inventory_stocks WHERE warehouse_key IN ($1, $2)', [warehouse.toLowerCase(), otherWarehouse.toLowerCase()]);
    await database.onModuleDestroy();
  });

  function dto(number: string, warehouseName: string, quantity: number, unit = 'Bao'): CreateReceiptDto {
    receiptNumbers.push(number);
    return {
      receiptNumber: number,
      receiptDate: '2026-09-07',
      deliveredBy: 'Integration Test',
      warehouseName,
      items: [{ itemDescription: 'Xi măng Hà Tiên', productCode: `XM-${suffix}`, unit, receivedQuantity: quantity, unitPrice: 1000 }],
    };
  }

  it('accumulates receipts while separating warehouses and units', async () => {
    await receipts.create(dto(`IT-1-${suffix}`, warehouse, 100));
    await receipts.create(dto(`IT-2-${suffix}`, warehouse, 50));
    await receipts.create(dto(`IT-3-${suffix}`, warehouse, 10, 'Kg'));
    await receipts.create(dto(`IT-4-${suffix}`, otherWarehouse, 7));

    const result = await stocks.findAll(warehouse);
    expect(result.items.map(({ unit, quantityOnHand }) => ({ unit, quantityOnHand }))).toEqual([
      { unit: 'Bao', quantityOnHand: '150.000' },
      { unit: 'Kg', quantityOnHand: '10.000' },
    ]);
    await expect(stocks.findAll(otherWarehouse)).resolves.toMatchObject({
      items: [{ quantityOnHand: '7.000' }],
    });
  });

  it('rolls back the receipt when PostgreSQL rejects its stock update', async () => {
    const receiptNumber = `IT-ROLLBACK-${suffix}`;
    await database.query(`
      CREATE OR REPLACE FUNCTION reject_test_stock_update() RETURNS trigger AS $$
      BEGIN
        IF NEW.product_key = '${`fail-${suffix}`.toLowerCase()}' THEN
          RAISE EXCEPTION 'forced stock failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_test_stock_update_trigger
      BEFORE INSERT OR UPDATE ON inventory_stocks
      FOR EACH ROW EXECUTE FUNCTION reject_test_stock_update();
    `);

    try {
      const payload = dto(receiptNumber, warehouse, 1);
      payload.items[0].productCode = `FAIL-${suffix}`;
      await expect(receipts.create(payload)).rejects.toThrow('forced stock failure');
      const result = await database.query('SELECT count(*)::int AS count FROM inventory_receipts WHERE receipt_number = $1', [receiptNumber]);
      expect(result.rows[0].count).toBe(0);
    } finally {
      await database.query('DROP TRIGGER IF EXISTS reject_test_stock_update_trigger ON inventory_stocks');
      await database.query('DROP FUNCTION IF EXISTS reject_test_stock_update()');
    }
  });
});
