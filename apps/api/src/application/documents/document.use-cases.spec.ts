import { DocumentRuleViolation } from '../../domain/inventory/document-rules';
import { CreateDocumentUseCase, ListDocumentsUseCase } from './document.use-cases';
import { DocumentsRepository } from './documents.repository.port';

const repository = (): jest.Mocked<DocumentsRepository> => ({
  create: jest.fn(), list: jest.fn(), findOne: jest.fn(), updateHeader: jest.fn(),
});

const validDocument = {
  type: 'IN' as const, documentNumber: 'PNK-001', documentDate: '2026-09-08',
  warehouseName: 'Kho trung tâm', counterpartyName: 'Nguyễn Thị Mai',
  items: [{ itemDescription: 'Bông y tế', unit: 'Cuộn', actualQuantity: 2, unitPrice: 10000 }],
};

describe('document application use cases', () => {
  it('rejects invalid business input without invoking an adapter', async () => {
    const documents = repository();
    await expect(new CreateDocumentUseCase(documents).execute({ ...validDocument, counterpartyName: ' ' }))
      .rejects.toBeInstanceOf(DocumentRuleViolation);
    expect(documents.create).not.toHaveBeenCalled();
  });

  it('delegates a valid document to its repository port', async () => {
    const documents = repository(); documents.create.mockResolvedValue({ id: 'document-id' });
    await expect(new CreateDocumentUseCase(documents).execute(validDocument)).resolves.toEqual({ id: 'document-id' });
    expect(documents.create).toHaveBeenCalledWith(validDocument);
  });

  it('rejects an inverted history date range before querying a repository', async () => {
    const documents = repository();
    await expect(new ListDocumentsUseCase(documents).execute({ fromDate: '2026-09-09', toDate: '2026-09-08' }))
      .rejects.toBeInstanceOf(DocumentRuleViolation);
    expect(documents.list).not.toHaveBeenCalled();
  });
});
