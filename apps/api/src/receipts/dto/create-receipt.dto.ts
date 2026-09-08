import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_QUANTITY = 999_999_999_999_999;
const MAX_ATTACHED_DOCUMENTS = 2_147_483_647;
const trimString = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReceiptItemDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  itemDescription!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  productCode?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  documentQuantity?: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(Number.EPSILON)
  @Max(MAX_QUANTITY)
  receivedQuantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  unitPrice!: number;
}

export class CreateReceiptDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  receiptNumber!: string;

  @IsDateString()
  receiptDate!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  organization?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  department?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  debitAccount?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  creditAccount?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  deliveredBy!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  referenceDocument?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  warehouseName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ATTACHED_DOCUMENTS)
  attachedDocumentCount?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  preparedBy?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  warehouseKeeper?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  chiefAccountant?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptItemDto)
  items!: CreateReceiptItemDto[];
}
