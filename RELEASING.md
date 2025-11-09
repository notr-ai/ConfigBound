# Releasing Packages

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## How it works

1. **Make changes** to one or both packages
2. **Add a changeset** describing your changes
3. **Version packages** to update versions and generate changelogs
4. **Publish** packages to npm

```bash
# Make your changes
# Then add a changeset
  npm run changeset
# Select packages
# If you are...
# ...fixing a bug, choose "patch"
# ...adding a new feature, choose "minor"
# ...making a breaking change, choose "major"
# Add description of the changes
# Commit and push
```

This creates a changeset file in `.changeset/`

## Versioning Packages

To update package versions and generate changelogs:

```bash
npm run version-packages
```

This will:

- Read all changesets
- Update package.json versions
- Generate/update CHANGELOG.md
- Delete used changesets

## Publishing

To publish packages to npm:

```bash
npm run release
```

This will:

- Publish all packages with updated versions
- Use the NPM_TOKEN environment variable

## Automated Workflow

The CI/CD pipeline automatically:

- Creates a release PR when changesets are added
- Publishes packages when the release PR is merged
- Updates changelogs and versions

## Package Linking

The packages are configured to stay in sync:

- Both packages get the same version number
- Changes to one package can trigger updates to the other
- Dependencies are automatically updated

## Configuration

Changesets configuration is in `.changeset/config.json`:
