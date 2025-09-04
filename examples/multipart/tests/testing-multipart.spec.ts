import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.ts';

const port = 5173;
let app: FastifyInstance;

before(async () => {
  app = await createApp();
  await app.ready();
  await app.listen({ port });
});

after(() => app.close());

const SERVER_URL = `http://localhost:${port}/testing-multi-part`;

describe('file', () => {
  it('should accept files within limit', async (t) => {
    const form = new FormData();
    form.append('stringField', new Blob(['ciao']));

    const res = await fetch(SERVER_URL, { method: 'POST', body: form });
    const json = await res.json();

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  it('should NOT accept files within limit', async (t) => {
    const form = new FormData();
    form.append('stringField', new Blob(['x'.repeat(100_000)]));

    const res = await fetch(SERVER_URL, { method: 'POST', body: form });
    const json = await res.json();

    assert.equal(res.status, 413);
    t.assert.snapshot(json);
  });
});

describe('field', () => {
  it('should accept fields within limit', async (t) => {
    const form = new FormData();
    const html = 'ciao';
    form.append('stringField', html);

    const res = await fetch(SERVER_URL, { method: 'POST', body: form });
    const json = await res.json();

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  it('should NOT accept fields within limit', async (t) => {
    const form = new FormData();
    const html = 'x'.repeat(100_000);
    form.append('stringField', html);

    const res = await fetch(SERVER_URL, { method: 'POST', body: form });
    const json = await res.json();

    assert.equal(res.status, 413);
    t.assert.snapshot(json);
  });
});

describe('body', () => {
  it('should accept body within limit', async (t) => {
    const html = 'ciao';
    const form = { stringField: html };

    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    assert.equal(res.status, 200);
    t.assert.snapshot(json);
  });

  it('should NOT accept fields within limit', async (t) => {
    const html = 'x'.repeat(100_000);
    const form = { stringField: html };

    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    assert.equal(res.status, 400);
    t.assert.snapshot(json);
  });
});
