# Scripts Directory

This directory contains utility scripts for the Internet Society community opportunities project.

## Cache-Busting Script (`cache_busting.js`)

Automatically adds cache-busting version parameters to all local JavaScript and CSS files in HTML documents.

### Features

- ✅ Automatically finds all HTML files in the project
- ✅ Adds version parameters to local JS and CSS files (`?v=YYYYMMDD-HHMM`)
- ✅ Preserves external URLs (CDN links, etc.)
- ✅ Updates existing version parameters
- ✅ Runs automatically as a pre-commit hook

### Usage

#### Manual Execution
```bash
node scripts/cache_busting.js
```

#### Automatic (Pre-commit Hook)
The script runs automatically before each commit. If it modifies any HTML files, you'll need to stage the changes:

```bash
git add *.html
git commit  # Retry your commit
```

### Version Format

Versions use the format: `YYYYMMDD-HHMM`
- Example: `20251128-1408` (November 28, 2025 at 14:08)

### Files Processed

The script processes all HTML files in the project and updates:
- `<script src="path/to/file.js">` → `<script src="path/to/file.js?v=VERSION">`
- `<link href="path/to/file.css">` → `<link href="path/to/file.css?v=VERSION">`

### Exclusions

- External URLs (starting with `http://` or `https://`) are ignored
- Files that already have version parameters are updated

### Pre-commit Hook

The `.git/hooks/pre-commit` script automatically runs the cache-busting script before each commit. If HTML files are modified, it will:
1. Run the cache-busting script
2. Detect if any HTML files were changed
3. Prompt you to stage the updated files
4. Prevent the commit until changes are staged

This ensures that every commit has proper cache-busting versions for all assets.
