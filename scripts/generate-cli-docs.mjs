#!/usr/bin/env node
// @ts-check

/**
 * Entry point for CLI docs generation.
 *
 * Delegates to apps/cli/src/generate-docs.ts, which boots the Nest app
 * headlessly via CommandFactory.createWithoutRunning() and generates
 * reference/cli/*.md from the live commander.js Command objects.
 *
 * tsx must be invoked with the CLI's tsconfig.json so that
 * experimentalDecorators and emitDecoratorMetadata are enabled — without
 * them the NestJS/nest-commander decorators fail at runtime.
 */

import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const tsx = resolve(root, 'node_modules/.bin/tsx');
const tsconfig = resolve(root, 'apps/cli/tsconfig.json');
const script = resolve(root, 'apps/cli/scripts/generate-docs.ts');
const outDir = resolve(root, 'apps/docs/reference/cli');

execFileSync(tsx, ['--tsconfig', tsconfig, script, outDir], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, NODE_ENV: 'development' },
});
