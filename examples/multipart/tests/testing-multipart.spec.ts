import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { createApp } from '../src/app.ts';

const port = 5173;
// oxlint-disable-next-line init-declarations
let app: FastifyInstance;

before(async () => {
  app = await createApp();
  await app.ready();
  await app.listen({ port });
});

after(async () => {
  await app.close();
});

const SERVER_URL = `http://localhost:${port}/testing-multi-part`;

void describe('file', () => {
  void it('should accept files within limit', async (t) => {
    const form = new FormData();
    form.append('stringField', new Blob(['ciao']));

    const res = await fetch(SERVER_URL, { body: form, method: 'POST' });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  void it('should NOT accept files within limit', async (t) => {
    const form = new FormData();
    form.append('stringField', new Blob(['x'.repeat(100_000)]));

    const res = await fetch(SERVER_URL, { body: form, method: 'POST' });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 413);
    t.assert.snapshot(json);
  });
});

void describe('field', () => {
  void it('should accept fields within limit', async (t) => {
    const form = new FormData();
    const html = 'ciao';
    form.append('stringField', html);

    const res = await fetch(SERVER_URL, { body: form, method: 'POST' });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  void it('should NOT accept fields within limit', async (t) => {
    const form = new FormData();
    const html = 'x'.repeat(100_000);
    form.append('stringField', html);

    const res = await fetch(SERVER_URL, { body: form, method: 'POST' });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 413);
    t.assert.snapshot(json);
  });
});

void describe('body', () => {
  void it('should accept body within limit', async (t) => {
    const html = 'ciao';
    const form = { stringField: html };

    const res = await fetch(SERVER_URL, {
      body: JSON.stringify(form),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  void it('should NOT accept fields within limit', async (t) => {
    const html = 'x'.repeat(100_000);
    const form = { stringField: html };

    const res = await fetch(SERVER_URL, {
      body: JSON.stringify(form),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const json = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 400);
    t.assert.snapshot(json);
  });
});
