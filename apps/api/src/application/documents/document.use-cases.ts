import { assertDocumentDates, assertDocumentInput } from '../../domain/inventory/document-rules';
import { CreateDocumentDto } from '../../documents/dto/create-document.dto';
import { ListDocumentsQueryDto } from '../../documents/dto/list-documents-query.dto';
import { UpdateDocumentDto } from '../../documents/dto/update-document.dto';
import { DocumentsRepository } from './documents.repository.port';

/** Application layer: orchestration only; no NestJS or PostgreSQL dependency. */
export class CreateDocumentUseCase {
  constructor(private readonly documents: DocumentsRepository) {}
  async execute(input: CreateDocumentDto) {
    assertDocumentInput(input);
    return this.documents.create(input);
  }
}

export class ListDocumentsUseCase {
  constructor(private readonly documents: DocumentsRepository) {}
  async execute(query: ListDocumentsQueryDto) {
    assertDocumentDates(query.fromDate, query.toDate);
    return this.documents.list(query);
  }
}

export class GetDocumentUseCase {
  constructor(private readonly documents: DocumentsRepository) {}
  execute(id: string) { return this.documents.findOne(id); }
}

export class UpdateDocumentHeaderUseCase {
  constructor(private readonly documents: DocumentsRepository) {}
  execute(id: string, input: UpdateDocumentDto) { return this.documents.updateHeader(id, input); }
}
