import type { TestProject } from 'vitest/node';

import { createApp } from '../src/app.ts';

// biome-ignore lint/style/noDefaultExport: vitest requirement
export default async function setup(project: TestProject) {
  const app = await createApp();

  const port = 3002;
  await app.listen({ port });

  project.provide('appBaseURL', `http://localhost:${port}`);

  return async () => {
    await app.close();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    appBaseURL: string;
  }
}
