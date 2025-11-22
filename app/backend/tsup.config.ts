import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    lambda: 'src/lambda.ts',
  },
  format: ['cjs'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  target: 'node22',
  external: [],
});
