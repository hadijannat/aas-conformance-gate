# AAS Conformance Gate

[![CI](https://github.com/hadijannat/aas-conformance-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/hadijannat/aas-conformance-gate/actions/workflows/ci.yml)

A GitHub Action that turns [IDTA AAS Test Engines](https://github.com/admin-shell-io/aas-test-engines) into a CI quality gate for:

- **AAS artifacts** (AASX, JSON, XML files)
- **AAS HTTP API implementations** (server conformance testing)

## Quick Start

### File Validation

```yaml
name: AAS Conformance

on: [push, pull_request]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - uses: hadijannat/aas-conformance-gate@v1
        with:
          mode: file
          files: |
            **/*.aasx
            **/*.json

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: aas-conformance-report
          path: aas-conformance-report/
```

### Server Validation

```yaml
      - uses: hadijannat/aas-conformance-gate@v1
        with:
          mode: server
          serverUrl: http://my-server.com/api/v3.0
          apiProfile: https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002
          headers: |
            Authorization: Bearer ${{ secrets.AAS_TOKEN }}
          filter: GetAll*
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `mode` | Validation mode: `file`, `server`, or `both` | `file` |
| `files` | Newline-separated file patterns (for file mode) | - |
| `format` | Force format: `json`, `xml`, or `aasx` | (inferred) |
| `modelType` | AAS model type (e.g., `Submodel`) | - |
| `serverUrl` | Base URL of AAS HTTP API server | - |
| `apiProfile` | IDTA profile identifier for conformance | - |
| `filter` | Glob filter for server operations | - |
| `headers` | Newline-separated HTTP headers | - |
| `reportFormats` | Comma-separated: `json,html` | `json,html` |
| `outputDir` | Report output directory | `aas-conformance-report` |
| `pipPackage` | pip package name | `aas_test_engines` |
| `pipVersion` | Version to install (`latest` or specific) | `latest` |
| `pythonCmd` | Python executable | (auto-detect) |
| `continueOnError` | Don't fail the job on errors | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `passed` | `"true"` if all checks passed |
| `reportDir` | Path to report directory |
| `failedChecks` | JSON array of failed check IDs |

## Profile Identifiers

For server mode, use IDTA service profile identifiers. Examples:

- `https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002` (AAS Repository Read)

See [IDTA Service Specifications](https://industrialdigitaltwin.io/aas-specifications/IDTA-01002/v3.1.1/http-rest-api/service-specifications-and-profiles.html) for available profiles.

## Server Testing Prerequisites

Server conformance tests require pre-populated test data. See the [aas-test-engines documentation](https://github.com/admin-shell-io/aas-test-engines#server-testing) for setup instructions.

## Reports

Reports are generated in the specified `outputDir`:

```
aas-conformance-report/
├── index.json          # Machine-readable summary
├── file/
│   ├── model.json      # Individual file reports
│   └── model.html
└── server/
    ├── profile.json    # Server check reports
    └── profile.html
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

## License

MIT

## References

- [AAS Test Engines](https://github.com/admin-shell-io/aas-test-engines)
- [IDTA Service Specifications](https://industrialdigitaltwin.io/aas-specifications/IDTA-01002/v3.1.1/http-rest-api/service-specifications-and-profiles.html)
- [AAS Specs API](https://github.com/admin-shell-io/aas-specs-api)
