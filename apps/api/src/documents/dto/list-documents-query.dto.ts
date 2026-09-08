import { IsDateString, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class ListDocumentsQueryDto {
  @IsOptional() @IsIn(['IN', 'OUT']) type?: 'IN' | 'OUT';
  @IsOptional() @IsString() warehouseName?: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @Type(() => Number) @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @Min(1) @Max(100) pageSize?: number;
}
