import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListStocksQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  warehouseName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  productSearch?: string;
}
