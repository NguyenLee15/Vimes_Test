import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class DocumentItemDto {
  @IsString() @MaxLength(1000) itemDescription!: string;
  @IsOptional() @IsString() @MaxLength(100) productCode?: string;
  @IsString() @MaxLength(50) unit!: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) documentQuantity?: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) actualQuantity!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) unitPrice!: number;
}

export class CreateDocumentDto {
  @IsIn(['IN', 'OUT']) type!: 'IN' | 'OUT';
  @IsString() @MaxLength(50) documentNumber!: string;
  @IsDateString() documentDate!: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() debitAccount?: string;
  @IsOptional() @IsString() creditAccount?: string;
  @IsString() counterpartyName!: string;
  @IsString() warehouseName!: string;
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
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DocumentItemDto) items!: DocumentItemDto[];
}
