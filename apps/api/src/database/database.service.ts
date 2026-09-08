import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    this.pool = new Pool({ connectionString });
    this.pool.on('error', (error) => {
      console.error('Unexpected error on idle PostgreSQL client', error);
    });
  }

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) {
    return this.pool.query<Row>(text, values);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
