import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class UpdateDocumentDto {
  @IsOptional() @IsDateString() documentDate?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() @MaxLength(50) debitAccount?: string;
  @IsOptional() @IsString() @MaxLength(50) creditAccount?: string;
  @IsOptional() @IsString() counterpartyName?: string;
  @IsOptional() @IsString() warehouseLocation?: string;
  @IsOptional() @IsString() referenceType?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsDateString() referenceDate?: string;
  @IsOptional() @IsString() referenceIssuer?: string;
  @IsOptional() @IsString() referenceDocument?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) attachedDocumentCount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() preparedBy?: string;
  @IsOptional() @IsString() warehouseKeeper?: string;
  @IsOptional() @IsString() chiefAccountant?: string;
}
