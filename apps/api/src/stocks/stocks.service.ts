import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type StockRow = {
  warehouse_name: string;
  identifier_type: 'CODE' | 'DESCRIPTION';
  product_identifier: string;
  item_description: string;
  unit: string;
  quantity_on_hand: string;
  last_unit_price: string | null;
  last_updated_at: Date;
};

@Injectable()
export class StocksService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async findAll(warehouseName?: string, productSearch?: string) {
    const normalizedWarehouse = warehouseName?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
    const normalizedProduct = productSearch?.trim();
    const values: string[] = []; const clauses: string[] = [];
    if (normalizedWarehouse) { values.push(normalizedWarehouse); clauses.push(`warehouse_key = $${values.length}`); }
    if (normalizedProduct) { values.push(`%${normalizedProduct}%`); clauses.push(`(product_identifier ILIKE $${values.length} OR item_description ILIKE $${values.length})`); }
    const result = await this.database.query<StockRow>(
      `SELECT stocks.warehouse_name, stocks.identifier_type, stocks.product_identifier,
              stocks.item_description, stocks.unit, stocks.quantity_on_hand::text,
              latest.unit_price::text AS last_unit_price, stocks.last_updated_at
       FROM inventory_stocks stocks
       LEFT JOIN LATERAL (
         SELECT items.unit_price
         FROM inventory_document_items items
         INNER JOIN inventory_documents documents ON documents.id = items.document_id
         WHERE documents.warehouse_key = stocks.warehouse_key
           AND items.product_key = stocks.product_key
           AND items.unit_key = stocks.unit_key
         ORDER BY documents.document_date DESC, documents.created_at DESC, items.line_number DESC
         LIMIT 1
       ) latest ON TRUE
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY stocks.warehouse_name ASC, stocks.item_description ASC, stocks.unit ASC`,
      values,
    );

    return {
      items: result.rows.map((row) => ({
        warehouseName: row.warehouse_name,
        identifierType: row.identifier_type,
        productIdentifier: row.product_identifier,
        itemDescription: row.item_description,
        unit: row.unit,
        quantityOnHand: row.quantity_on_hand,
        lastUnitPrice: row.last_unit_price ?? '0',
        lastUpdatedAt: row.last_updated_at,
      })),
    };
  }
}
