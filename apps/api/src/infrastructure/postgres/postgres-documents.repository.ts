import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DocumentsRepository } from '../../application/documents/documents.repository.port';
import { DatabaseService } from '../../database/database.service';
import { normalizeKey, normalizeText } from '../../domain/inventory/document-rules';
import { CreateDocumentDto, DocumentItemDto } from '../../documents/dto/create-document.dto';
import { ListDocumentsQueryDto } from '../../documents/dto/list-documents-query.dto';
import { UpdateDocumentDto } from '../../documents/dto/update-document.dto';

type Stock = { warehouseName: string; warehouseKey: string; identifierType: 'CODE' | 'DESCRIPTION'; productIdentifier: string; productKey: string; itemDescription: string; unit: string; unitKey: string; quantity: number };
const nullable = (value?: string) => value?.trim() || null;

/** PostgreSQL adapter. It owns SQL, row mapping and the atomic inventory transaction. */
@Injectable()
export class PostgresDocumentsRepository implements DocumentsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateDocumentDto) {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const warehouseName = normalizeText(dto.warehouseName);
      let referenceDoc = nullable(dto.referenceDocument);
      if (!referenceDoc && (dto.referenceType || dto.referenceNumber || dto.referenceDate || dto.referenceIssuer)) {
        const parts = [dto.referenceType ? `Theo ${dto.referenceType}` : '', dto.referenceNumber ? `số ${dto.referenceNumber}` : '', dto.referenceDate ? `ngày ${dto.referenceDate}` : '', dto.referenceIssuer ? `của ${dto.referenceIssuer}` : ''].filter(Boolean);
        if (parts.length) referenceDoc = parts.join(' ');
      }
      const result = await client.query<{ id: string }>(
        `INSERT INTO inventory_documents (document_type,document_number,document_date,organization,department,debit_account,credit_account,counterparty_name,reference_type,reference_number,reference_date,reference_issuer,reference_document,warehouse_name,warehouse_location,warehouse_key,attached_document_count,notes,prepared_by,warehouse_keeper,chief_accountant) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
        [dto.type, normalizeText(dto.documentNumber), dto.documentDate, nullable(dto.organization), nullable(dto.department), nullable(dto.debitAccount), nullable(dto.creditAccount), normalizeText(dto.counterpartyName), nullable(dto.referenceType), nullable(dto.referenceNumber), nullable(dto.referenceDate), nullable(dto.referenceIssuer), referenceDoc, warehouseName, nullable(dto.warehouseLocation), normalizeKey(warehouseName), dto.attachedDocumentCount ?? 0, nullable(dto.notes), nullable(dto.preparedBy), nullable(dto.warehouseKeeper), nullable(dto.chiefAccountant)],
      );
      const id = result.rows[0].id; const stocks = this.groupStocks(dto);
      if (dto.type === 'OUT') await this.ensureAvailable(client, stocks);
      for (const [index, item] of dto.items.entries()) await this.insertItem(client, id, index + 1, item);
      await this.applyStocks(client, dto.type, stocks);
      const total = await client.query<{ total_amount: string }>(`UPDATE inventory_documents SET total_amount=COALESCE((SELECT SUM(line_total) FROM inventory_document_items WHERE document_id=$1),0),updated_at=NOW() WHERE id=$1 RETURNING total_amount`, [id]);
      await client.query('COMMIT');
      return { id, documentNumber: normalizeText(dto.documentNumber), type: dto.type, totalAmount: total.rows[0].total_amount };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Số phiếu đã tồn tại cho loại chứng từ này');
      throw error;
    } finally { client.release(); }
  }

  async list(query: ListDocumentsQueryDto) {
    const clauses: string[] = []; const values: unknown[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };
    if (query.type) add('d.document_type = ?', query.type);
    if (query.warehouseName?.trim()) add('d.warehouse_key = ?', normalizeKey(query.warehouseName));
    if (query.documentNumber?.trim()) add('d.document_number ILIKE ?', `%${query.documentNumber.trim()}%`);
    if (query.fromDate) add('d.document_date >= ?', query.fromDate);
    if (query.toDate) add('d.document_date <= ?', query.toDate);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''; const page = query.page ?? 1; const pageSize = query.pageSize ?? 20;
    const count = await this.database.query<{ count: string }>(`SELECT count(*)::text AS count FROM inventory_documents d ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await this.database.query(`SELECT d.id,d.document_type AS "type",d.document_number AS "documentNumber",d.document_date AS "documentDate",d.warehouse_name AS "warehouseName",d.counterparty_name AS "counterpartyName",d.total_amount::text AS "totalAmount",d.created_at AS "createdAt",count(i.id)::int AS "itemCount" FROM inventory_documents d LEFT JOIN inventory_document_items i ON i.document_id=d.id ${where} GROUP BY d.id ORDER BY d.document_date DESC,d.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: rows.rows, page, pageSize, total: Number(count.rows[0].count) };
  }

  async findOne(id: string) {
    const document = await this.database.query(`SELECT id,document_type AS "type",document_number AS "documentNumber",document_date AS "documentDate",organization,department,debit_account AS "debitAccount",credit_account AS "creditAccount",counterparty_name AS "counterpartyName",reference_type AS "referenceType",reference_number AS "referenceNumber",reference_date AS "referenceDate",reference_issuer AS "referenceIssuer",reference_document AS "referenceDocument",warehouse_name AS "warehouseName",warehouse_location AS "warehouseLocation",attached_document_count AS "attachedDocumentCount",notes,prepared_by AS "preparedBy",warehouse_keeper AS "warehouseKeeper",chief_accountant AS "chiefAccountant",total_amount::text AS "totalAmount",created_at AS "createdAt",updated_at AS "updatedAt" FROM inventory_documents WHERE id=$1`, [id]);
    if (!document.rows[0]) throw new NotFoundException('Không tìm thấy phiếu');
    const items = await this.database.query(`SELECT line_number AS "lineNumber",item_description AS "itemDescription",product_code AS "productCode",unit,document_quantity::text AS "documentQuantity",actual_quantity::text AS "actualQuantity",unit_price AS "unitPrice",line_total::text AS "lineTotal" FROM inventory_document_items WHERE document_id=$1 ORDER BY line_number`, [id]);
    return { ...document.rows[0], items: items.rows };
  }

  async updateHeader(id: string, dto: UpdateDocumentDto) {
    const allowed: Record<string, string> = { documentDate: 'document_date', organization: 'organization', department: 'department', debitAccount: 'debit_account', creditAccount: 'credit_account', counterpartyName: 'counterparty_name', warehouseLocation: 'warehouse_location', referenceType: 'reference_type', referenceNumber: 'reference_number', referenceDate: 'reference_date', referenceIssuer: 'reference_issuer', referenceDocument: 'reference_document', attachedDocumentCount: 'attached_document_count', notes: 'notes', preparedBy: 'prepared_by', warehouseKeeper: 'warehouse_keeper', chiefAccountant: 'chief_accountant' };
    const entries = Object.entries(dto).filter(([, value]) => value !== undefined);
    if (!entries.length) return this.findOne(id);
    if (dto.counterpartyName !== undefined && !dto.counterpartyName.trim()) throw new BadRequestException('Người giao hoặc nhận không được để trống');
    const values = entries.map(([field, value]) => typeof value === 'string' ? (field === 'counterpartyName' ? normalizeText(value) : nullable(value)) : value);
    const set = entries.map(([field], index) => `${allowed[field]}=$${index + 1}`).join(', ');
    const result = await this.database.query(`UPDATE inventory_documents SET ${set},updated_at=NOW() WHERE id=$${values.length + 1} RETURNING id`, [...values, id]);
    if (!result.rows[0]) throw new NotFoundException('Không tìm thấy phiếu'); return this.findOne(id);
  }

  private async insertItem(client: PoolClient, documentId: string, line: number, item: DocumentItemDto) {
    const code = nullable(item.productCode); const identifierType = code ? 'CODE' : 'DESCRIPTION'; const identifier = code ?? normalizeText(item.itemDescription);
    await client.query(`INSERT INTO inventory_document_items (document_id,line_number,item_description,product_code,identifier_type,product_identifier,product_key,unit,unit_key,document_quantity,actual_quantity,unit_price,line_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,ROUND($11::numeric*($12::bigint)::numeric)::bigint)`, [documentId,line,normalizeText(item.itemDescription),code,identifierType,identifier,normalizeKey(identifier),normalizeText(item.unit),normalizeKey(item.unit),item.documentQuantity ?? null,item.actualQuantity,item.unitPrice]);
  }
  private groupStocks(dto: CreateDocumentDto) {
    const result = new Map<string, Stock>(); const warehouseName = normalizeText(dto.warehouseName); const warehouseKey = normalizeKey(warehouseName);
    for (const item of dto.items) { const code = nullable(item.productCode); const identifierType = code ? 'CODE' : 'DESCRIPTION'; const productIdentifier = code ?? normalizeText(item.itemDescription); const unit = normalizeText(item.unit); const stockKey = `${warehouseKey}|${identifierType}|${normalizeKey(productIdentifier)}|${normalizeKey(unit)}`; const old = result.get(stockKey); if (old) old.quantity += item.actualQuantity; else result.set(stockKey,{ warehouseName,warehouseKey,identifierType,productIdentifier,productKey:normalizeKey(productIdentifier),itemDescription:normalizeText(item.itemDescription),unit,unitKey:normalizeKey(unit),quantity:item.actualQuantity }); }
    return [...result.values()].sort((a,b) => `${a.productKey}${a.unitKey}`.localeCompare(`${b.productKey}${b.unitKey}`));
  }
  private async ensureAvailable(client: PoolClient, stocks: Stock[]) {
    for (const stock of stocks) { const result = await client.query<{ quantity_on_hand: string }>(`SELECT quantity_on_hand::text FROM inventory_stocks WHERE warehouse_key=$1 AND identifier_type=$2 AND product_key=$3 AND unit_key=$4 FOR UPDATE`, [stock.warehouseKey,stock.identifierType,stock.productKey,stock.unitKey]); const available = Number(result.rows[0]?.quantity_on_hand ?? -1); if (available < stock.quantity) throw new ConflictException(`Không đủ tồn kho cho ${stock.itemDescription}. Còn ${Math.max(0,available)} ${stock.unit}`); }
  }
  private async applyStocks(client: PoolClient, type: 'IN' | 'OUT', stocks: Stock[]) {
    for (const stock of stocks) { if (type === 'IN') await client.query(`INSERT INTO inventory_stocks (warehouse_name,warehouse_key,identifier_type,product_identifier,product_key,item_description,unit,unit_key,quantity_on_hand) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (warehouse_key,identifier_type,product_key,unit_key) DO UPDATE SET quantity_on_hand=inventory_stocks.quantity_on_hand+EXCLUDED.quantity_on_hand,last_updated_at=NOW()`, [stock.warehouseName,stock.warehouseKey,stock.identifierType,stock.productIdentifier,stock.productKey,stock.itemDescription,stock.unit,stock.unitKey,stock.quantity]); else await client.query(`UPDATE inventory_stocks SET quantity_on_hand=quantity_on_hand-$5,last_updated_at=NOW() WHERE warehouse_key=$1 AND identifier_type=$2 AND product_key=$3 AND unit_key=$4`, [stock.warehouseKey,stock.identifierType,stock.productKey,stock.unitKey,stock.quantity]); }
  }
}
