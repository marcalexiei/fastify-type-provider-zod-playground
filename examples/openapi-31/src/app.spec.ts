import type { FastifyInstance } from 'fastify';
import { before, describe, it } from 'node:test';
import { createApp } from './app.ts';

describe('openAPI 3.1 description and examples', () => {
  let app: FastifyInstance;
  before(async () => {
    app = await createApp();
  });

  it('provide correct openAPI 3.1 spec file', async (t) => {
    const openApiSpecResponse = await app.inject().get('/documentation/json');
    const openApiSpec = openApiSpecResponse.json();

    t.assert.snapshot(openApiSpec);
  });
});
