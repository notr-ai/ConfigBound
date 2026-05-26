import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    configBound: 'src/configBound.ts',
    'section/section': 'src/section/section.ts',
    'element/element': 'src/element/element.ts',
    'bind/bind': 'src/bind/bind.ts',
    'bind/configValueProvider': 'src/bind/configValueProvider.ts',
    'binds/env': 'src/bind/binds/envVar.ts',
    'binds/file': 'src/bind/binds/file.ts',
    'binds/static': 'src/bind/binds/static.ts',
    'utilities/index': 'src/utilities/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  deps: {
    neverBundle: ['zod', 'js-yaml', 'jsonc-parser'],
  },
});
