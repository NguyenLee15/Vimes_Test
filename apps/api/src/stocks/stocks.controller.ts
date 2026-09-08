import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { StocksService } from './stocks.service';

@Controller('inventory/stocks')
export class StocksController {
  constructor(@Inject(StocksService) private readonly stocks: StocksService) {}

  @Get()
  findAll(@Query() query: ListStocksQueryDto) {
    return this.stocks.findAll(query.warehouseName, query.productSearch);
  }
}
