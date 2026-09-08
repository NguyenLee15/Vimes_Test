import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
@Controller('inventory/documents')
export class DocumentsController { constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {} @Post() create(@Body() dto: CreateDocumentDto) { return this.documents.create(dto); } @Get() list(@Query() query: ListDocumentsQueryDto) { return this.documents.list(query); } @Get(':id') findOne(@Param('id') id: string) { return this.documents.findOne(id); } @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.documents.updateHeader(id, dto); } }
