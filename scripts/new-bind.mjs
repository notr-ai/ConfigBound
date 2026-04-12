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
 *   3. Updates the package name to use @config-bound scope
 *   4. Runs npm install
 *   5. Creates a how-to stub page in apps/docs/how-to/
 *   6. Adds a sidebar entry to apps/docs/.vitepress/config.mts
 *   7. Creates a changeset for the new package
 *   8. Prints contributor next steps
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

const pascal = toPascal(kebab);
const packagePath = `packages/bind-${kebab}`;
const packageName = `@config-bound/bind-${kebab}`;

console.log(`\nScaffolding Official bind: ${packageName}\n`);

// Step 1: Run the CLI to generate the package scaffold
console.log('Step 1/7: Generating package scaffold...');
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
console.log('\nStep 2/7: Registering workspace...');
const rootPackageJsonPath = resolve(repoRoot, 'package.json');
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));

if (!rootPackageJson.workspaces.includes(packagePath)) {
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
console.log('\nStep 3/7: Updating package name...');
const bindPackageJsonPath = resolve(repoRoot, packagePath, 'package.json');
const bindPackageJson = JSON.parse(readFileSync(bindPackageJsonPath, 'utf8'));
bindPackageJson.name = packageName;
writeFileSync(bindPackageJsonPath, JSON.stringify(bindPackageJson, null, 2) + '\n');
console.log(`  Updated package name to "${packageName}".`);

// Step 4: Run npm install to link the workspace
console.log('\nStep 4/7: Running npm install...');
execFileSync('npm', ['install'], { stdio: 'inherit', cwd: repoRoot });

// Step 5: Create how-to stub page
console.log('\nStep 5/7: Creating how-to stub page...');
const howToPath = resolve(repoRoot, 'apps', 'docs', 'how-to', `${kebab}-bind.md`);
const howToContent = `---
description: Read configuration from ${pascal} using ${pascal}Bind.
---

# Read configuration from ${pascal}

TODO: Add a description of this bind and what service/source it reads from.

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Steps

**1. Pass a \`${pascal}Bind\` to \`ConfigBound.createConfig\`:**

\`\`\`typescript
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
import { ${pascal}Bind } from "${packageName}";

const config = await ConfigBound.createConfig(
  {
    // your schema here
  },
  {
    binds: [new ${pascal}Bind({ /* options */ })]
  }
);
\`\`\`

## Related

- [Use EnvVarBind](./env-var-bind.md) — read config from environment variables
- [Use FileBind](./file-bind.md) — read config from a file
- [Use StaticBind](./static-bind.md) — supply config values directly in code
`;
writeFileSync(howToPath, howToContent);
console.log(`  Created apps/docs/how-to/${kebab}-bind.md`);

// Step 6: Add sidebar entry to .vitepress/config.mts
console.log('\nStep 6/7: Adding sidebar entry...');
const configMtsPath = resolve(repoRoot, 'apps', 'docs', '.vitepress', 'config.mts');
const configMts = readFileSync(configMtsPath, 'utf8');

const bindsEndMarker = '\n          ]\n        },\n        {\n          text: "Schema"';
const newSidebarEntry = `,\n            { text: "${pascal}Bind", link: "/how-to/${kebab}-bind" }`;

if (configMts.includes(bindsEndMarker)) {
  const updatedConfig = configMts.replace(
    bindsEndMarker,
    `${newSidebarEntry}${bindsEndMarker}`
  );
  writeFileSync(configMtsPath, updatedConfig);
  console.log(`  Added "${pascal}Bind" to the Binds sidebar section.`);
} else {
  console.log(`  Warning: could not locate Binds sidebar section in config.mts — add the entry manually.`);
}

// Step 7: Create changeset
console.log('\nStep 7/7: Creating changeset...');
const changesetPath = resolve(repoRoot, '.changeset', `${kebab}-bind.md`);
const changesetContent = `---
"${packageName}": minor
---

Initial release of \`${packageName}\`.
`;
writeFileSync(changesetPath, changesetContent);
console.log(`  Created .changeset/${kebab}-bind.md`);

// Done — print next steps
console.log(`
✓ Done! ${packageName} is ready.

Next steps:
  1. Add the SDK dependency to ${packagePath}/package.json
  2. Fill in the \`retrieve()\` method in ${packagePath}/src/${pascal}Bind.ts
  3. Fill in the how-to page at apps/docs/how-to/${kebab}-bind.md
  4. Build the package: npm run build --workspace=${packageName}
  5. When ready to publish, set "private": false in ${packagePath}/package.json
`);
