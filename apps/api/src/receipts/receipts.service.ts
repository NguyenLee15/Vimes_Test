import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

type CreatedReceiptRow = { id: string };
type TotalRow = { total_amount: string };
type PostgresError = { code?: string };
const MAX_QUANTITY = 999_999_999_999_999;
const MAX_ATTACHED_DOCUMENTS = 2_147_483_647;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

@Injectable()
export class ReceiptsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(dto: CreateReceiptDto) {
    this.validateItems(dto);
    const client = await this.database.connect();

    try {
      await client.query('BEGIN');

      const receipt = await client.query<CreatedReceiptRow>(
        `INSERT INTO inventory_receipts (
          receipt_number, receipt_date, organization, department, debit_account,
          credit_account, delivered_by, reference_document, warehouse_name,
          attached_document_count, notes, prepared_by, warehouse_keeper, chief_accountant
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id`,
        [
          dto.receiptNumber.trim(),
          dto.receiptDate,
          this.nullable(dto.organization),
          this.nullable(dto.department),
          this.nullable(dto.debitAccount),
          this.nullable(dto.creditAccount),
          dto.deliveredBy.trim(),
          this.nullable(dto.referenceDocument),
          dto.warehouseName.trim(),
          dto.attachedDocumentCount ?? 0,
          this.nullable(dto.notes),
          this.nullable(dto.preparedBy),
          this.nullable(dto.warehouseKeeper),
          this.nullable(dto.chiefAccountant),
        ],
      );

      const receiptId = receipt.rows[0].id;
      await this.insertItems(client, receiptId, dto);

      const total = await client.query<TotalRow>(
        `UPDATE inventory_receipts
         SET total_amount = COALESCE(
           (SELECT SUM(line_total) FROM inventory_receipt_items WHERE receipt_id = $1),
           0
         )
         WHERE id = $1
         RETURNING total_amount`,
        [receiptId],
      );

      await this.updateStocks(client, dto);

      await client.query('COMMIT');

      return {
        id: receiptId,
        receiptNumber: dto.receiptNumber.trim(),
        totalAmount: total.rows[0].total_amount,
      };
    } catch (error) {
      await this.rollback(client);

      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Số phiếu đã tồn tại');
      }

      if (this.isCheckViolation(error)) {
        throw new BadRequestException('Dữ liệu không thỏa mãn ràng buộc của cơ sở dữ liệu');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async updateStocks(client: PoolClient, dto: CreateReceiptDto) {
    const stocks = new Map<
      string,
      {
        warehouseName: string;
        warehouseKey: string;
        identifierType: 'CODE' | 'DESCRIPTION';
        productIdentifier: string;
        productKey: string;
        itemDescription: string;
        unit: string;
        unitKey: string;
        quantity: bigint;
      }
    >();

    for (const item of dto.items) {
      const warehouseName = this.clean(dto.warehouseName);
      const productCode = this.nullable(item.productCode);
      const identifierType = productCode ? 'CODE' : 'DESCRIPTION';
      const productIdentifier = productCode ?? this.clean(item.itemDescription);
      const warehouseKey = this.normalizeKey(warehouseName);
      const productKey = this.normalizeKey(productIdentifier);
      const unit = this.clean(item.unit);
      const unitKey = this.normalizeKey(unit);
      const key = `${warehouseKey}\u0000${identifierType}\u0000${productKey}\u0000${unitKey}`;
      const quantity = this.toThousandths(item.receivedQuantity)!;
      const current = stocks.get(key);

      if (current) {
        current.quantity += quantity;
      } else {
        stocks.set(key, {
          warehouseName,
          warehouseKey,
          identifierType,
          productIdentifier,
          productKey,
          itemDescription: this.clean(item.itemDescription),
          unit,
          unitKey,
          quantity,
        });
      }
    }

    for (const stock of [...stocks.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value)) {
      await client.query(
        `INSERT INTO inventory_stocks (
          warehouse_name, warehouse_key, identifier_type, product_identifier,
          product_key, item_description, unit, unit_key, quantity_on_hand
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::numeric)
        ON CONFLICT (warehouse_key, identifier_type, product_key, unit_key)
        DO UPDATE SET
          warehouse_name = EXCLUDED.warehouse_name,
          product_identifier = EXCLUDED.product_identifier,
          item_description = EXCLUDED.item_description,
          unit = EXCLUDED.unit,
          quantity_on_hand = inventory_stocks.quantity_on_hand + EXCLUDED.quantity_on_hand,
          last_updated_at = NOW()`,
        [
          stock.warehouseName,
          stock.warehouseKey,
          stock.identifierType,
          stock.productIdentifier,
          stock.productKey,
          stock.itemDescription,
          stock.unit,
          stock.unitKey,
          this.formatThousandths(stock.quantity),
        ],
      );
    }
  }

  private async insertItems(client: PoolClient, receiptId: string, dto: CreateReceiptDto) {
    for (const [index, item] of dto.items.entries()) {
      await client.query(
        `INSERT INTO inventory_receipt_items (
          receipt_id, line_number, item_description, product_code, unit,
          document_quantity, received_quantity, unit_price, line_total
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          ROUND($7::numeric * ($8::bigint)::numeric)::bigint
        )`,
        [
          receiptId,
          index + 1,
          item.itemDescription.trim(),
          this.nullable(item.productCode),
          item.unit.trim(),
          item.documentQuantity ?? null,
          item.receivedQuantity,
          item.unitPrice,
        ],
      );
    }
  }

  private nullable(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private clean(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeKey(value: string) {
    return this.clean(value).toLocaleLowerCase('vi-VN');
  }

  private formatThousandths(value: bigint) {
    const whole = value / 1000n;
    const fraction = String(value % 1000n).padStart(3, '0');
    return `${whole}.${fraction}`;
  }

  private validateItems(dto: CreateReceiptDto) {
    if (
      !dto.receiptNumber.trim() ||
      !dto.deliveredBy.trim() ||
      !dto.warehouseName.trim() ||
      (dto.attachedDocumentCount !== undefined &&
        (!Number.isInteger(dto.attachedDocumentCount) ||
          dto.attachedDocumentCount < 0 ||
          dto.attachedDocumentCount > MAX_ATTACHED_DOCUMENTS))
    ) {
      throw new BadRequestException('Thông tin phiếu nhập kho không hợp lệ');
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('Phiếu nhập kho phải có ít nhất một dòng hàng');
    }

    let receiptTotal = 0n;
    for (const item of dto.items) {
      const quantityInThousandths = this.toThousandths(item.receivedQuantity);
      if (
        !item.itemDescription.trim() ||
        !item.unit.trim() ||
        !Number.isFinite(item.receivedQuantity) ||
        item.receivedQuantity <= 0 ||
        item.receivedQuantity > MAX_QUANTITY ||
        !Number.isInteger(item.unitPrice) ||
        item.unitPrice < 0 ||
        item.unitPrice > Number.MAX_SAFE_INTEGER ||
        quantityInThousandths === null ||
        (item.documentQuantity !== undefined &&
          (!Number.isFinite(item.documentQuantity) ||
            item.documentQuantity < 0 ||
            item.documentQuantity > MAX_QUANTITY))
      ) {
        throw new BadRequestException('Số lượng hoặc đơn giá không hợp lệ');
      }

      const lineTotal = (quantityInThousandths * BigInt(item.unitPrice) + 500n) / 1000n;
      receiptTotal += lineTotal;
      if (lineTotal > MAX_POSTGRES_BIGINT || receiptTotal > MAX_POSTGRES_BIGINT) {
        throw new BadRequestException('Thành tiền vượt quá giới hạn cho phép');
      }
    }
  }

  private toThousandths(value: number) {
    const [whole, fraction = ''] = String(value).split('.');
    if (!/^\d+$/.test(whole) || !/^\d{0,3}$/.test(fraction)) {
      return null;
    }

    return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0') || '0');
  }

  private async rollback(client: PoolClient) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original database error.
    }
  }

  private isUniqueViolation(error: unknown): error is PostgresError {
    return typeof error === 'object' && error !== null && (error as PostgresError).code === '23505';
  }

  private isCheckViolation(error: unknown): error is PostgresError {
    return typeof error === 'object' && error !== null && (error as PostgresError).code === '23514';
  }
}
