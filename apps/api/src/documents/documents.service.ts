import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateDocumentUseCase, GetDocumentUseCase, ListDocumentsUseCase, UpdateDocumentHeaderUseCase } from '../application/documents/document.use-cases';
import { DOCUMENTS_REPOSITORY, DocumentsRepository } from '../application/documents/documents.repository.port';
import { DocumentRuleViolation } from '../domain/inventory/document-rules';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  private readonly createDocument: CreateDocumentUseCase;
  private readonly listDocuments: ListDocumentsUseCase;
  private readonly getDocument: GetDocumentUseCase;
  private readonly updateDocumentHeader: UpdateDocumentHeaderUseCase;

  constructor(@Inject(DOCUMENTS_REPOSITORY) documents: DocumentsRepository) {
    this.createDocument = new CreateDocumentUseCase(documents);
    this.listDocuments = new ListDocumentsUseCase(documents);
    this.getDocument = new GetDocumentUseCase(documents);
    this.updateDocumentHeader = new UpdateDocumentHeaderUseCase(documents);
  }

  async create(dto: CreateDocumentDto) { return this.translate(() => this.createDocument.execute(dto)); }

  async list(query: ListDocumentsQueryDto) { return this.translate(() => this.listDocuments.execute(query)); }

  async findOne(id: string) { return this.getDocument.execute(id); }

  async updateHeader(id: string, dto: UpdateDocumentDto) { return this.updateDocumentHeader.execute(id, dto); }

  private async translate<T>(action: () => Promise<T>) {
    try { return await action(); }
    catch (error) {
      if (error instanceof DocumentRuleViolation) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
