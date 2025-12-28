#!/bin/bash
# AAS Conformance Gate - Quick Verification Script

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   AAS Conformance Gate - Verification Script              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Step 1: Check Prerequisites
echo "Step 1: Checking Prerequisites"
echo "─────────────────────────────────"

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm installed: $NPM_VERSION"
else
    print_status 1 "npm not found"
fi

if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    print_status 0 "Python installed: $PYTHON_VERSION"
else
    print_status 1 "Python 3 not found"
fi

echo

# Step 2: Run Tests
echo "Step 2: Running Unit Tests"
echo "─────────────────────────────────"
print_info "Running test suite..."

if npm test > /tmp/test-output.log 2>&1; then
    TEST_COUNT=$(grep -c "✓" /tmp/test-output.log || echo "0")
    print_status 0 "All tests passed ($TEST_COUNT tests)"
else
    print_status 1 "Tests failed"
fi

echo

# Step 3: Type Checking
echo "Step 3: Type Checking"
echo "─────────────────────────────────"
print_info "Checking TypeScript types..."

if npm run typecheck > /tmp/typecheck-output.log 2>&1; then
    print_status 0 "Type checking passed"
else
    print_status 1 "Type checking failed"
fi

echo

# Step 4: Linting
echo "Step 4: Code Linting"
echo "─────────────────────────────────"
print_info "Running ESLint..."

if npm run lint > /tmp/lint-output.log 2>&1; then
    print_status 0 "Linting passed"
else
    print_status 1 "Linting failed"
fi

echo

# Step 5: Build
echo "Step 5: Building Action"
echo "─────────────────────────────────"
print_info "Compiling and bundling..."

if npm run build > /tmp/build-output.log 2>&1; then
    if [ -f "dist/index.js" ]; then
        SIZE=$(du -h dist/index.js | cut -f1)
        print_status 0 "Build successful (dist/index.js: $SIZE)"
    else
        print_status 1 "dist/index.js not found"
    fi
else
    print_status 1 "Build failed"
fi

echo

# Step 6: Functional Test
echo "Step 6: Local Functional Test"
echo "─────────────────────────────────"

# Install aas_test_engines
print_info "Installing aas_test_engines..."
python3 -m pip install --quiet --upgrade aas_test_engines 2>&1 | grep -v "WARNING" || true

# Create test file
TEST_DIR="/tmp/verify-aas-action-$$"
mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/test.json" << 'EOF'
{
  "assetAdministrationShells": [],
  "submodels": [],
  "conceptDescriptions": []
}
EOF

print_status 0 "Test file created: $TEST_DIR/test.json"

# Run action
print_info "Running action locally..."

export INPUT_MODE="file"
export INPUT_FILES="$TEST_DIR/test.json"
export INPUT_OUTPUTDIR="$TEST_DIR/reports"
export INPUT_REPORTFORMATS="json,html"
export INPUT_CONTINUEONERROR="true"

# Capture output but ignore exit code for this test (file is invalid)
node dist/index.js > "$TEST_DIR/action-output.log" 2>&1 || true

# Check outputs
REPORTS_EXIST=0
if [ -f "$TEST_DIR/reports/index.json" ]; then
    print_status 0 "Report index created"
    REPORTS_EXIST=1
else
    print_status 1 "Report index NOT created"
fi

if [ -f "$TEST_DIR/reports/file"/*.json ]; then
    print_status 0 "JSON report created"
else
    print_status 1 "JSON report NOT created"
fi

if [ -f "$TEST_DIR/reports/file"/*.html ]; then
    print_status 0 "HTML report created"
else
    print_status 1 "HTML report NOT created"
fi

# Cleanup
rm -rf "$TEST_DIR"

echo

# Final Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 VERIFICATION COMPLETE                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo -e "${GREEN}✓ All verification checks passed!${NC}"
echo
echo "The action is fully functional and ready to use."
echo
echo "Next steps:"
echo "  1. Review: cat VERIFICATION.md"
echo "  2. Test in GitHub Actions: git push"
echo "  3. Create release: git tag v1.0.0 && git push --tags"
echo

exit 0
