import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StocksModule } from './stocks/stocks.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [DatabaseModule, ReceiptsModule, StocksModule, DocumentsModule],
  controllers: [AppController],
})
export class AppModule {}
