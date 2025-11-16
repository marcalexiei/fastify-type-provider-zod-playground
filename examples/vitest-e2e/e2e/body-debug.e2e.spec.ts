import { describe, expect, inject, it } from 'vitest';

describe('/body-debug', () => {
  const appBaseURL = inject('appBaseURL');

  it('works', async () => {
    const req = fetch(`${appBaseURL}/body-debug`, {
      method: 'POST',
      body: 'test2',
    });

    const response = await req;
    await expect(response.json()).resolves.toMatchInlineSnapshot(`
      {
        "body": "test2",
        "status": "ok",
      }
    `);
  });
});
