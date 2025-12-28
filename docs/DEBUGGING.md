# Debugging & Testing Guide for AAS Conformance Gate

## 1. Local Development Testing

### Run Unit Tests
```bash
cd /Users/aeroshariati/.gemini/antigravity/scratch/aas-conformance-gate

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest __tests__/inputs.test.ts

# Run in watch mode (re-runs on file changes)
npx jest --watch
```

### Type Checking
```bash
npm run typecheck   # or: npx tsc --noEmit
```

### Linting
```bash
npm run lint
npm run lint:fix    # auto-fix issues
```

---

## 2. Local Action Execution (Without GitHub)

### Method A: Simulate with Environment Variables
```bash
# Set required environment variables
export INPUT_MODE="file"
export INPUT_FILES="test_samples/**/*.json"
export INPUT_REPORTFORMATS="json,html"
export INPUT_OUTPUTDIR="test-reports"
export INPUT_CONTINUEONERROR="true"

# Build and run
npm run build
node dist/index.js
```

### Method B: Use `act` (Local GitHub Actions Runner)
Install [act](https://github.com/nektos/act) to run workflows locally:

```bash
# Install act
brew install act

# Run the CI workflow locally
act -j build

# Run with specific event
act push

# Run with verbose output
act -v
```

### Method C: Create a Test Script
```bash
# Create test_local.sh
cat > test_local.sh << 'EOF'
#!/bin/bash
set -e

# Install aas_test_engines
python3 -m pip install --upgrade aas_test_engines

# Generate test samples
mkdir -p test_samples
aas_test_engines generate_files test_samples || true

# Set action inputs as env vars
export INPUT_MODE="file"
export INPUT_FILES="test_samples/**/*.json"
export INPUT_OUTPUTDIR="local-test-report"
export INPUT_REPORTFORMATS="json,html"
export INPUT_CONTINUEONERROR="true"

# Run the action
npm run build
node dist/index.js

# Check results
echo "--- Reports ---"
ls -la local-test-report/
EOF

chmod +x test_local.sh
./test_local.sh
```

---

## 3. GitHub Actions Debugging

### Enable Debug Logging
Add these secrets to your repo (Settings → Secrets → Actions):
```
ACTIONS_RUNNER_DEBUG = true
ACTIONS_STEP_DEBUG = true
```

Or add to workflow:
```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

### Add Debug Statements in Code
```typescript
import * as core from '@actions/core';

// These show up in GitHub Actions logs
core.debug('Debug message (only visible with ACTIONS_STEP_DEBUG)');
core.info('Info message (always visible)');
core.warning('Warning message');
core.error('Error message');

// Group output for readability
core.startGroup('Detailed logs');
core.info('Line 1');
core.info('Line 2');
core.endGroup();
```

### Workflow with Manual Trigger for Testing
Add to `.github/workflows/test.yml`:
```yaml
name: Test Action

on:
  workflow_dispatch:
    inputs:
      mode:
        description: 'Validation mode'
        default: 'file'
        type: choice
        options: [file, server, both]
      debug:
        description: 'Enable debug'
        default: false
        type: boolean

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      ACTIONS_STEP_DEBUG: ${{ inputs.debug }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Generate test files
        run: |
          pip install aas_test_engines
          aas_test_engines generate_files test_samples
      
      - name: Run action
        uses: ./
        with:
          mode: ${{ inputs.mode }}
          files: 'test_samples/**/*.json'
          continueOnError: 'true'
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: aas-conformance-report/
```

---

## 4. Debugging Specific Components

### Debug Input Parsing
```typescript
// In src/inputs.ts, add:
console.log('Raw inputs:', {
  mode: core.getInput('mode'),
  files: core.getInput('files'),
  serverUrl: core.getInput('serverUrl')
});
```

### Debug Command Execution
```typescript
// In src/util/exec.ts, add logging:
core.info(`[EXEC] Command: ${command}`);
core.info(`[EXEC] Args: ${JSON.stringify(args)}`);
core.info(`[EXEC] Exit code: ${exitCode}`);
core.info(`[EXEC] Stdout: ${stdout.substring(0, 500)}...`);
```

### Debug with Breakpoints (VS Code)
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Action",
      "program": "${workspaceFolder}/dist/index.js",
      "env": {
        "INPUT_MODE": "file",
        "INPUT_FILES": "test_samples/**/*.json",
        "INPUT_OUTPUTDIR": "debug-reports",
        "INPUT_CONTINUEONERROR": "true"
      },
      "preLaunchTask": "npm: build"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 5. Integration Testing

### Test with Real AAS Files
```bash
# Download sample AAS files
mkdir -p integration_tests
curl -o integration_tests/sample.json \
  "https://raw.githubusercontent.com/admin-shell-io/aas-specs/main/schemas/json/examples/aas.json"

# Run action against them
export INPUT_MODE="file"
export INPUT_FILES="integration_tests/**/*.json"
node dist/index.js
```

### Test Server Mode (Requires Running Server)
```yaml
# In a workflow with a test server:
services:
  aas-server:
    image: eclipsebasyx/aas-server:latest
    ports:
      - 8080:8080

steps:
  - uses: ./
    with:
      mode: server
      serverUrl: http://localhost:8080/api/v3.0
      apiProfile: https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002
```

---

## 6. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Python not found` | Add `actions/setup-python@v5` before the action |
| `No files matched` | Check glob patterns, use `**/*.json` syntax |
| `Exit code non-zero` | Check aas_test_engines output in reports |
| `GITHUB_STEP_SUMMARY` not working | Only works in GitHub Actions, not locally |
| `Permission denied` | Check file permissions on test samples |

---

## 7. Quick Commands Reference

```bash
# Full test + build cycle
npm run all

# Watch tests during development
npx jest --watch

# Check for type errors without building
npx tsc --noEmit

# Rebuild after code changes
npm run build

# View test coverage
npm run test:coverage && open coverage/lcov-report/index.html
```
