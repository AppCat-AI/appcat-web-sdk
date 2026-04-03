import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { server: 'src/server.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    platform: 'node',
  },
]);
