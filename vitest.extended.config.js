import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/extended/**/*.test.js'],
    testTimeout: 900_000,
    fileParallelism: false,
  },
});
