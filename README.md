# lifting-app

https://my-lifting-app.netlify.app/

All data stays on your device only, but you can import and export data and reset your data.

## Automated Releases

This project uses automated releases based on semantic commits. When you merge a pull request with a semantic commit message to the main branch, a new release will be automatically created.

### Semantic Commit Format

Use the following format for your commit messages:

```
type(scope): description
```

**Types:**

- `feat`: New features (minor version bump)
- `fix`: Bug fixes (patch version bump)
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

**Examples:**

- `feat: add new exercise tracking feature`
- `fix(auth): resolve login issue`
- `docs: update README with new instructions`
- `chore: update dependencies`

### Release Workflows

Two release workflows are available:

1. **Manual Semantic Release** (`.github/workflows/release.yml`):
   - Triggers on pushes to main
   - Checks for semantic commit format
   - Automatically bumps version based on commit type
   - Creates GitHub release and updates package.json version

2. **Release Drafter** (`.github/workflows/auto-release.yml`):
   - Uses release-drafter for more sophisticated release management
   - Automatically categorizes changes
   - Creates releases with professional release notes

### How It Works

1. Make your changes in a feature branch
2. Use semantic commit messages when committing
3. Create a pull request to main
4. When merged, the release workflow will:
   - Detect the semantic commit
   - Bump the version appropriately
   - Update package.json version
   - Create a GitHub release
   - Create Git tags

### Skipping Releases

To skip a release, include `[skip ci]` in your commit message:

```
feat: add new feature [skip ci]
```
