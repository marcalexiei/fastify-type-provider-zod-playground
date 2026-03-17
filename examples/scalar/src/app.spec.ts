import { before, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from './app.ts';

void describe('openAPI 3.1 description and examples', () => {
  // oxlint-disable-next-line init-declarations
  let app: FastifyInstance;
  before(async () => {
    app = await createApp();
  });

  void it('provide correct openAPI 3.1 spec file', async (t) => {
    const openApiSpecResponse = await app.inject().get('/docs/openapi.json');
    const openApiSpec: Record<string, unknown> = openApiSpecResponse.json();

    t.assert.snapshot(openApiSpec);
  });
});
