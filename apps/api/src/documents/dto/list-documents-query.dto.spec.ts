import { ValidationPipe } from '@nestjs/common';
import { ListDocumentsQueryDto } from './list-documents-query.dto';

describe('ListDocumentsQueryDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

  it('rejects a history filter with an invalid ISO date', async () => {
    await expect(
      pipe.transform(
        { fromDate: '07/09/2026' },
        { type: 'query', metatype: ListDocumentsQueryDto },
      ),
    ).rejects.toThrow('Bad Request Exception');
  });
});
