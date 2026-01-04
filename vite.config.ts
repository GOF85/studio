import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
// @ts-ignore: optional dev dependency in this environment
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: './components/__tests__/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
