import { BadRequestException } from '@nestjs/common';
import { DocumentsRepository } from '../application/documents/documents.repository.port';
import { DocumentsService } from './documents.service';

const validDocument = {
  type: 'IN' as const, documentNumber: 'PNK-TEST-001', documentDate: '2026-09-07',
  counterpartyName: 'Nguyễn Thị Mai', warehouseName: 'Kho Vật tư Y tế Trung tâm',
  items: [{ itemDescription: 'Găng tay y tế', productCode: 'GT-01', unit: 'Hộp', actualQuantity: 2, unitPrice: 100000 }],
};

function repository(): jest.Mocked<DocumentsRepository> {
  return { create: jest.fn(), list: jest.fn(), findOne: jest.fn(), updateHeader: jest.fn() };
}

describe('DocumentsService presentation facade', () => {
  it('translates domain input errors to HTTP bad requests', async () => {
    const documents = repository(); const service = new DocumentsService(documents);
    await expect(service.create({ ...validDocument, counterpartyName: ' ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(documents.create).not.toHaveBeenCalled();
  });

  it('keeps the controller-facing API stable while delegating to the use case', async () => {
    const documents = repository(); documents.create.mockResolvedValue({ id: 'document-id', totalAmount: '200000' });
    const service = new DocumentsService(documents);
    await expect(service.create(validDocument)).resolves.toEqual({ id: 'document-id', totalAmount: '200000' });
    expect(documents.create).toHaveBeenCalledWith(validDocument);
  });

  it('returns query and header operations through the same repository seam', async () => {
    const documents = repository(); documents.list.mockResolvedValue({ items: [] }); documents.findOne.mockResolvedValue({ id: 'd1' });
    const service = new DocumentsService(documents);
    await expect(service.list({ page: 1 })).resolves.toEqual({ items: [] });
    await expect(service.findOne('d1')).resolves.toEqual({ id: 'd1' });
    expect(documents.list).toHaveBeenCalledWith({ page: 1 });
  });
});
