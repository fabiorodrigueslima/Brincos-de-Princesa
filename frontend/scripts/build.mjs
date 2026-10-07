import process from 'node:process';

// CI runs tests with NODE_ENV=test; never ship the development React runtime.
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build();
