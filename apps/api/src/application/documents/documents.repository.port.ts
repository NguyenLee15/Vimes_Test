import { CreateDocumentDto } from '../../documents/dto/create-document.dto';
import { ListDocumentsQueryDto } from '../../documents/dto/list-documents-query.dto';
import { UpdateDocumentDto } from '../../documents/dto/update-document.dto';

export const DOCUMENTS_REPOSITORY = Symbol('DOCUMENTS_REPOSITORY');

export interface DocumentsRepository {
  create(input: CreateDocumentDto): Promise<unknown>;
  list(query: ListDocumentsQueryDto): Promise<unknown>;
  findOne(id: string): Promise<unknown>;
  updateHeader(id: string, input: UpdateDocumentDto): Promise<unknown>;
}
