import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(sourceDirectory),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/app/config.ts',
        'src/features/**/domain/**/*.ts',
        'src/features/analysis/adapters/copernicus-wms-feature-info.ts',
        'src/features/acquisitions/adapters/copernicus-wfs-acquisition-dates.ts',
        'src/features/place-search/adapters/nominatim-place-search.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
