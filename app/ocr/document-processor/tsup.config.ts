import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    local: 'src/local.ts',
  },
  format: ['cjs'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  treeshake: false,
  target: 'node22',
  external: [],
});
