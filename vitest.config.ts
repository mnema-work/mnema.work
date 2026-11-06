import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'dist/**'],
    environment: 'node',
    // The cases that build the pages into a directory of their own run the whole preparation, and a cold machine is slower than a warm one.
    testTimeout: 30_000,
  },
});
