import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
export class ReceiptsController {
  constructor(@Inject(ReceiptsService) private readonly receiptsService: ReceiptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateReceiptDto) {
    return this.receiptsService.create(dto);
  }
}
