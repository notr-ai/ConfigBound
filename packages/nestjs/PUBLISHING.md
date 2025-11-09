# Publishing @config-bound/nestjs

This document outlines the steps to publish the `@config-bound/nestjs` package to npm.

## Prerequisites

1. npm account with access to the `@config-bound` scope
2. Authentication configured: `npm login`
3. Package built successfully: `npm run build`

## Pre-publish Checklist

- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] README.md is complete and accurate
- [ ] Version number is updated in package.json
- [ ] CHANGELOG.md is updated (if applicable)
- [ ] LICENSE file is present
- [ ] .npmignore is configured correctly

## Publishing Steps

### 1. Verify Package Contents

Preview what will be published:

```bash
cd packages/nestjs
npm pack --dry-run
```

This shows all files that will be included in the package.

### 2. Verify Package Configuration

Check the package.json exports:

```bash
cat package.json | grep -A 10 "exports"
```

Should show:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "require": "./dist/index.js",
    "import": "./dist/index.js"
  }
}
```

### 3. Test Installation Locally

Create a test package and install from local directory:

```bash
mkdir /tmp/test-nestjs-package
cd /tmp/test-nestjs-package
npm init -y
npm install /path/to/configBound/packages/nestjs
```

### 4. Update Version

Use semantic versioning:

```bash
# For bug fixes
npm version patch

# For new features
npm version minor

# For breaking changes
npm version major
```

Or manually update `package.json`:

```json
{
  "version": "0.0.2"
}
```

### 5. Build the Package

```bash
npm run clean
npm run build
```

### 6. Publish to npm

For the first release:

```bash
npm publish --access public
```

For subsequent releases:

```bash
npm publish
```

### 7. Verify Publication

```bash
npm view @config-bound/nestjs
```

### 8. Test Installation from npm

```bash
cd /tmp/test-install
npm init -y
npm install @config-bound/nestjs @config-bound/config-bound @nestjs/common @nestjs/core
```

## Publishing from CI/CD

If using GitHub Actions or similar:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'nestjs-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        working-directory: packages/nestjs
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Post-publish

1. Create a GitHub release with the same version tag
2. Update documentation website (if applicable)
3. Announce on relevant channels
4. Update dependent packages to use new version

## Troubleshooting

### "Package already exists"

You cannot republish the same version. Bump the version and try again.

### "403 Forbidden"

Ensure you're logged in and have permission to publish to the `@config-bound` scope:

```bash
npm whoami
npm access list packages
```

### "EPERM: operation not permitted"

Make sure you have write permissions in the package directory.

### Type definitions not working

Verify that:

- `declaration: true` in tsconfig.json
- `types` field in package.json points to correct .d.ts file
- Build process generates .d.ts files

## Version History

- 0.0.1 - Initial release

## Related Commands

```bash
# View package info
npm view @config-bound/nestjs

# Download package tarball
npm pack

# Deprecate a version
npm deprecate @config-bound/nestjs@0.0.1 "Reason for deprecation"

# Unpublish (only within 72 hours)
npm unpublish @config-bound/nestjs@0.0.1
```
