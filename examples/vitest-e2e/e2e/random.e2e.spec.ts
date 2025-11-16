import { describe, expect, inject, it } from 'vitest';

describe('/random', () => {
  const appBaseURL = inject('appBaseURL');

  it('works', async () => {
    const req = fetch(`${appBaseURL}/random`, {
      method: 'GET',
    });

    const response = await req;
    await expect(response.json()).resolves.toMatchObject({
      number: expect.any(Number),
    });
  });
});
