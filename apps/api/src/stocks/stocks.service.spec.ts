import { DatabaseService } from '../database/database.service';
import { StocksService } from './stocks.service';

describe('StocksService', () => {
  const rows = [
    {
      warehouse_name: 'Kho Trung Tâm',
      identifier_type: 'CODE' as const,
      product_identifier: 'XM-HT',
      item_description: 'Xi măng Hà Tiên',
      unit: 'Bao',
      quantity_on_hand: '150.000',
      last_unit_price: '1000',
      last_updated_at: new Date('2026-09-07T10:00:00.000Z'),
    },
  ];

  it('returns stock balances using the public API shape', async () => {
    const database = { query: jest.fn().mockResolvedValue({ rows }) } as unknown as DatabaseService;
    const service = new StocksService(database);

    await expect(service.findAll()).resolves.toEqual({
      items: [
        {
          warehouseName: 'Kho Trung Tâm',
          identifierType: 'CODE',
          productIdentifier: 'XM-HT',
          itemDescription: 'Xi măng Hà Tiên',
          unit: 'Bao',
          quantityOnHand: '150.000',
          lastUnitPrice: '1000',
          lastUpdatedAt: new Date('2026-09-07T10:00:00.000Z'),
        },
      ],
    });
  });

  it('normalizes and parameterizes the warehouse filter', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const service = new StocksService({ query } as unknown as DatabaseService);

    await expect(service.findAll('  KHO   Trung Tâm ')).resolves.toEqual({ items: [] });
    expect(query.mock.calls[0][0]).toContain('WHERE warehouse_key = $1');
    expect(query.mock.calls[0][1]).toEqual(['kho trung tâm']);
  });

  it('propagates database errors', async () => {
    const service = new StocksService({
      query: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as DatabaseService);

    await expect(service.findAll()).rejects.toThrow('database unavailable');
  });
});
