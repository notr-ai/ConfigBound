import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  deps: {
    neverBundle: ['@config-bound/core', 'js-yaml', 'zod'],
  },
});
