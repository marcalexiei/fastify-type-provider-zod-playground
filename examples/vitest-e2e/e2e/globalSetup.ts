import type { TestProject } from 'vitest/node';

import { createApp } from '../src/app.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    appBaseURL: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const app = await createApp();

  const port = 3002;
  await app.listen({ port });

  project.provide('appBaseURL', `http://localhost:${port}`);

  return async () => {
    await app.close();
  };
}
