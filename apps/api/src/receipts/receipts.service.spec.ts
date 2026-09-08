import { BadRequestException, ConflictException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptsService } from './receipts.service';

const validReceipt: CreateReceiptDto = {
  receiptNumber: 'PNK-TEST-001',
  receiptDate: '2026-09-07',
  deliveredBy: 'Nguyễn Văn Giao',
  warehouseName: 'Kho trung tâm',
  items: [
    {
      itemDescription: 'Giấy A4',
      productCode: 'A4',
      unit: 'Ram',
      documentQuantity: 2,
      receivedQuantity: 2,
      unitPrice: 75000,
    },
  ],
};

function createClient(queryResults: Array<unknown | Error>) {
  const query = jest.fn();
  for (const result of queryResults) {
    if (result instanceof Error) {
      query.mockRejectedValueOnce(result);
    } else {
      query.mockResolvedValueOnce(result);
    }
  }

  return { query, release: jest.fn() } as unknown as PoolClient & {
    query: ReturnType<typeof jest.fn>;
    release: ReturnType<typeof jest.fn>;
  };
}

function createService(client: PoolClient) {
  const database = { connect: jest.fn().mockResolvedValue(client) } as unknown as DatabaseService & {
    connect: ReturnType<typeof jest.fn>;
  };

  return { service: new ReceiptsService(database), database };
}

describe('ReceiptsService', () => {
  it('creates a receipt in one transaction and returns the database total', async () => {
    const client = createClient([
      { rows: [] },
      { rows: [{ id: 'receipt-id' }] },
      { rows: [] },
      { rows: [{ total_amount: '150000' }] },
      { rows: [] },
      { rows: [] },
    ]);
    const { service } = createService(client);

    await expect(service.create(validReceipt)).resolves.toEqual({
      id: 'receipt-id',
      receiptNumber: 'PNK-TEST-001',
      totalAmount: '150000',
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(6, 'COMMIT');
    expect(client.query.mock.calls[2][1]).toEqual([
      'receipt-id',
      1,
      'Giấy A4',
      'A4',
      'Ram',
      2,
      2,
      75000,
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('adds the received quantity to the matching stock balance before commit', async () => {
    const client = createClient([
      { rows: [] },
      { rows: [{ id: 'receipt-id' }] },
      { rows: [] },
      { rows: [{ total_amount: '150000' }] },
      { rows: [] },
      { rows: [] },
    ]);
    const { service } = createService(client);

    await service.create(validReceipt);

    const [sql, params] = client.query.mock.calls[4];
    expect(sql).toContain('INSERT INTO inventory_stocks');
    expect(sql).toContain('quantity_on_hand + EXCLUDED.quantity_on_hand');
    expect(params).toEqual([
      'Kho trung tâm',
      'kho trung tâm',
      'CODE',
      'A4',
      'a4',
      'Giấy A4',
      'Ram',
      'ram',
      '2.000',
    ]);
  });

  it('groups matching receipt lines into one stock update', async () => {
    const client = createClient([
      { rows: [] }, { rows: [{ id: 'receipt-id' }] }, { rows: [] }, { rows: [] },
      { rows: [{ total_amount: '262500' }] }, { rows: [] }, { rows: [] },
    ]);
    const { service } = createService(client);

    await service.create({
      ...validReceipt,
      items: [validReceipt.items[0], { ...validReceipt.items[0], receivedQuantity: 1.5 }],
    });

    const stockCalls = client.query.mock.calls.filter((call: unknown[]) => String(call[0]).includes('INSERT INTO inventory_stocks'));
    expect(stockCalls).toHaveLength(1);
    expect(stockCalls[0][1][8]).toBe('3.500');
  });

  it('rolls back the whole receipt when updating stock fails', async () => {
    const stockError = new Error('stock update failed');
    const client = createClient([
      { rows: [] }, { rows: [{ id: 'receipt-id' }] }, { rows: [] },
      { rows: [{ total_amount: '150000' }] }, stockError, { rows: [] },
    ]);
    const { service } = createService(client);

    await expect(service.create(validReceipt)).rejects.toThrow('stock update failed');
    expect(client.query).toHaveBeenNthCalledWith(6, 'ROLLBACK');
    expect(client.query.mock.calls.some((call: unknown[]) => call[0] === 'COMMIT')).toBe(false);
  });

  it('rejects a receipt with no items before opening a transaction', async () => {
    const client = createClient([]);
    const { service, database } = createService(client);

    await expect(service.create({ ...validReceipt, items: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(database.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['received quantity is zero', { receivedQuantity: 0 }],
    ['received quantity exceeds database precision', { receivedQuantity: 1_000_000_000_000_000 }],
    ['unit price is negative', { unitPrice: -1 }],
    ['document quantity is negative', { documentQuantity: -1 }],
  ])('rejects invalid item when %s', async (_description: string, itemUpdate: Record<string, unknown>) => {
    const client = createClient([]);
    const { service, database } = createService(client);
    const item = { ...validReceipt.items[0], ...itemUpdate };

    await expect(service.create({ ...validReceipt, items: [item] })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(database.connect).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only required text before opening a transaction', async () => {
    const client = createClient([]);
    const { service, database } = createService(client);

    await expect(
      service.create({ ...validReceipt, deliveredBy: '   ', items: [{ ...validReceipt.items[0], unit: ' ' }] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.connect).not.toHaveBeenCalled();
  });

  it('rejects a receipt whose calculated total exceeds PostgreSQL BIGINT', async () => {
    const client = createClient([]);
    const { service, database } = createService(client);

    await expect(
      service.create({
        ...validReceipt,
        items: [
          {
            ...validReceipt.items[0],
            receivedQuantity: 999_999_999_999_999,
            unitPrice: Number.MAX_SAFE_INTEGER,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.connect).not.toHaveBeenCalled();
  });

  it('maps a duplicate receipt number to conflict and rolls back', async () => {
    const duplicateError = Object.assign(new Error('duplicate'), { code: '23505' });
    const client = createClient([{ rows: [] }, duplicateError, { rows: [] }]);
    const { service } = createService(client);

    await expect(service.create(validReceipt)).rejects.toBeInstanceOf(ConflictException);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and releases the client if an item insert fails', async () => {
    const insertError = new Error('insert failed');
    const client = createClient([
      { rows: [] },
      { rows: [{ id: 'receipt-id' }] },
      insertError,
      { rows: [] },
    ]);
    const { service } = createService(client);

    await expect(service.create(validReceipt)).rejects.toThrow('insert failed');

    expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(client.query.mock.calls.some((call: unknown[]) => call[0] === 'COMMIT')).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('maps a database check violation to bad request and rolls back', async () => {
    const checkError = Object.assign(new Error('check violation'), { code: '23514' });
    const client = createClient([{ rows: [] }, checkError, { rows: [] }]);
    const { service } = createService(client);

    await expect(service.create(validReceipt)).rejects.toBeInstanceOf(BadRequestException);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
