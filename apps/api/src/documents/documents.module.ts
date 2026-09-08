import { Module } from '@nestjs/common';
import { DOCUMENTS_REPOSITORY } from '../application/documents/documents.repository.port';
import { PostgresDocumentsRepository } from '../infrastructure/postgres/postgres-documents.repository';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    PostgresDocumentsRepository,
    { provide: DOCUMENTS_REPOSITORY, useExisting: PostgresDocumentsRepository },
    DocumentsService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
