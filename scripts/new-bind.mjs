#!/usr/bin/env node

/**
 * Contributor script for scaffolding a new Official bind package in this monorepo.
 *
 * Usage:
 *   npm run new:bind <name>
 *   e.g. npm run new:bind 1password
 *
 * What it does:
 *   1. Runs `configbound generate bind <name> --type package --output packages/`
 *   2. Registers the new package in root package.json workspaces
 *   3. Runs npm install
 *   4. Prints contributor next steps
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function toPascal(kebabStr) {
  return kebabStr
    .split('-')
    .map((part) => {
      const withoutLeadingDigits = part.replace(/^\d+/, (digits) => {
        const words = { '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
          '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine', '10': 'Ten' };
        return words[digits] ?? `N${digits}`;
      });
      return withoutLeadingDigits.charAt(0).toUpperCase() + withoutLeadingDigits.slice(1);
    })
    .join('');
}

const name = process.argv[2];

if (!name) {
  console.error('Error: bind name is required.');
  console.error('Usage: npm run new:bind <name>');
  console.error('Example: npm run new:bind 1password');
  process.exit(1);
}

const kebab = name
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const packagePath = `packages/bind-${kebab}`;
const packageName = `@config-bound/bind-${kebab}`;

console.log(`\nScaffolding Official bind: ${packageName}\n`);

// Step 1: Run the CLI to generate the package scaffold
console.log('Step 1/4: Generating package scaffold...');
const cliBin = resolve(repoRoot, 'apps', 'cli', 'bin', 'configbound.js');

execFileSync(
  process.execPath,
  [
    cliBin,
    'generate', 'bind', name,
    '--type', 'package',
    '--output', resolve(repoRoot, 'packages')
  ],
  { stdio: 'inherit', cwd: repoRoot }
);

// Step 2: Register in root package.json workspaces
console.log('\nStep 2/4: Registering workspace...');
const rootPackageJsonPath = resolve(repoRoot, 'package.json');
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));

if (!rootPackageJson.workspaces.includes(packagePath)) {
  // Insert after packages/config-bound to keep official binds grouped
  const configBoundIndex = rootPackageJson.workspaces.indexOf('packages/config-bound');
  if (configBoundIndex !== -1) {
    rootPackageJson.workspaces.splice(configBoundIndex + 1, 0, packagePath);
  } else {
    rootPackageJson.workspaces.push(packagePath);
  }
  writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
  console.log(`  Added "${packagePath}" to workspaces.`);
} else {
  console.log(`  "${packagePath}" already in workspaces.`);
}

// Step 3: Update the generated package.json name to use @config-bound scope
console.log('\nStep 3/4: Updating package name...');
const bindPackageJsonPath = resolve(repoRoot, packagePath, 'package.json');
const bindPackageJson = JSON.parse(readFileSync(bindPackageJsonPath, 'utf8'));
bindPackageJson.name = packageName;
writeFileSync(bindPackageJsonPath, JSON.stringify(bindPackageJson, null, 2) + '\n');
console.log(`  Updated package name to "${packageName}".`);

// Step 4: Run npm install to link the workspace
console.log('\nStep 4/4: Running npm install...');
execFileSync('npm', ['install'], { stdio: 'inherit', cwd: repoRoot });

// Done — print next steps
console.log(`
✓ Done! ${packageName} is ready.

Next steps:
  1. Add the SDK dependency to ${packagePath}/package.json
  2. Fill in the create() method in ${packagePath}/src/${toPascal(kebab)}Bind.ts
  3. Build the package: npm run build --workspace=${packageName}
  4. When ready to publish, set "private": false and run: npm run changeset
`);
