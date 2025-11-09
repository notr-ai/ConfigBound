# Contributing to Config-bound

Thank you for your interest in contributing to Config-bound! Here's how you can help:

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/RobertKeyser/ConfigBound.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Making Changes

1. Make your changes
2. Test your changes thoroughly. See [Testing](#testing)
3. Commit with descriptive messages, preferably using [Conventional Commits](https://www.conventionalcommits.org/en) format: `git commit -m "feat: feature description"`
4. Add a changeset describing your changes, running `npm run changeset` to create a changeset file in the `.changeset` directory. See [Releasing](./RELEASING.md) for more details. Don't edit the CHANGELOG.md file manually.
5. Push to your branch: `git push origin feature/your-feature-name`

## Testing

It is your responsibility to thoroughly test each change and add tests as new code is added. Config-bound uses the [Jest](https://jestjs.io) framework. Test files should be titled `your-feature.spec.ts` and should be colocated with the features they describe.

### Basic usage

There are three variants of the npm test script:

- `test` - Runs tests
- `test:dev` - Runs the tests and watches for file changes
- `test:coverage` - Runs the tests and generates a coverage report

### Advanced usage

Targeting a specific group of tests:

```bash
npm run test -- --group=unit
npm run test -- --group=integration
```

## Pre-commit Hooks

This project uses Git hooks to ensure code quality. The hooks will automatically:

- Check that the package-lock.json is up to date
- Format your code using Prettier
- Lint your code using ESLint

### How it works

Config-bound uses [Husky](https://typicode.github.io/husky/) to manage Git hooks and lint-staged to run checks only on changed files. When you commit changes:

- The pre-commit hook will run automatically
- Your staged files will be formatted and linted
- If there are any errors that can't be fixed automatically, the commit will fail

### Installing hooks

The hooks should install automatically when you run `npm install`. If you need to install them manually: `npm run prepare`

### Skipping hooks (use sparingly!)

In certain edge-case situations, you may need to bypass the hooks with:
`git commit -m "Your message" --no-verify`
Note: Please avoid skipping hooks unless absolutely necessary.

## Submitting a Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template with details about your changes
5. Submit the pull request

## Code Standards

- When adding new files, follow existing naming and organization conventions.
- Follow the existing code style as defined by Prettier and ESLint.
- Write tests for new features.
- Update documentation as needed.
- Annotate relevant code using [TSDoc](https://tsdoc.org).
- Use [Conventional Commits](https://www.conventionalcommits.org/en) for commit messages.
- Follow the [dot-config](https://dot-config.github.io) standard for configuration files when possible.

## Documentation

Documentation is in the [/docs](./docs) directory. Make sure to keep it up to date with your latest changes.

## Questions?

Feel free to open an issue.
