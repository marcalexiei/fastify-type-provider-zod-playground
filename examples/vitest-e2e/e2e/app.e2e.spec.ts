import { describe, expect, inject, it } from 'vitest';

describe('openAPI 3.1 description and examples', () => {
  const appBaseURL = inject('appBaseURL');

  it('provide correct openAPI 3.1 spec file', async () => {
    const req = fetch(`${appBaseURL}/test`, {
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
