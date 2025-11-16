import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './e2e/_globalSetup.ts',
  },
});
