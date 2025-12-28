import * as core from '@actions/core';

export type Mode = 'file' | 'server' | 'both';
export type Format = 'json' | 'xml' | 'aasx' | '';
export type ReportFormat = 'json' | 'html';

export interface ActionInputs {
    mode: Mode;
    files: string[];
    format: Format;
    modelType: string;
    serverUrl: string;
    apiProfile: string;
    filter: string;
    headers: string[];
    reportFormats: ReportFormat[];
    outputDir: string;
    pipPackage: string;
    pipVersion: string;
    pythonCmd: string;
    continueOnError: boolean;
}

/**
 * Parse a newline-separated string into an array of non-empty trimmed lines
 */
function parseNewlineSeparated(value: string): string[] {
    return value
        .split(/[\r\n]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Parse a comma-separated string into an array of trimmed values
 */
function parseCommaSeparated(value: string): string[] {
    return value
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);
}

/**
 * Parse a boolean string value
 */
function parseBoolean(value: string): boolean {
    return value.toLowerCase() === 'true';
}

/**
 * Validate mode input
 */
function validateMode(mode: string): Mode {
    const normalized = mode.toLowerCase().trim();
    if (normalized === 'file' || normalized === 'server' || normalized === 'both') {
        return normalized;
    }
    throw new Error(
        `Invalid mode: "${mode}". Must be one of: file, server, both`
    );
}

/**
 * Validate format input
 */
function validateFormat(format: string): Format {
    if (!format) return '';
    const normalized = format.toLowerCase().trim();
    if (normalized === 'json' || normalized === 'xml' || normalized === 'aasx') {
        return normalized;
    }
    throw new Error(
        `Invalid format: "${format}". Must be one of: json, xml, aasx`
    );
}

/**
 * Validate report formats
 */
function validateReportFormats(formats: string[]): ReportFormat[] {
    const valid: ReportFormat[] = [];
    for (const f of formats) {
        if (f === 'json' || f === 'html') {
            valid.push(f);
        } else {
            throw new Error(
                `Invalid report format: "${f}". Must be json or html`
            );
        }
    }
    return valid.length > 0 ? valid : ['json', 'html'];
}

/**
 * Resolve and validate all action inputs
 */
export function resolveInputs(): ActionInputs {
    const mode = validateMode(core.getInput('mode') || 'file');
    const files = parseNewlineSeparated(core.getInput('files'));
    const format = validateFormat(core.getInput('format'));
    const modelType = core.getInput('modelType').trim();
    const serverUrl = core.getInput('serverUrl').trim();
    const apiProfile = core.getInput('apiProfile').trim();
    const filter = core.getInput('filter').trim();
    const headers = parseNewlineSeparated(core.getInput('headers'));
    const reportFormats = validateReportFormats(
        parseCommaSeparated(core.getInput('reportFormats') || 'json,html')
    );
    const outputDir = core.getInput('outputDir') || 'aas-conformance-report';
    const pipPackage = core.getInput('pipPackage') || 'aas_test_engines';
    const pipVersion = core.getInput('pipVersion') || 'latest';
    const pythonCmd = core.getInput('pythonCmd').trim();
    const continueOnError = parseBoolean(core.getInput('continueOnError'));

    // Mask sensitive header values
    for (const header of headers) {
        const colonIndex = header.indexOf(':');
        if (colonIndex > 0) {
            const value = header.substring(colonIndex + 1).trim();
            if (value) {
                core.setSecret(value);
            }
        }
    }

    // Validate mode-specific requirements
    if (mode === 'file' || mode === 'both') {
        if (files.length === 0) {
            throw new Error(
                'File mode requires non-empty "files" input with file paths or glob patterns'
            );
        }
    }

    if (mode === 'server' || mode === 'both') {
        if (!serverUrl) {
            throw new Error(
                'Server mode requires "serverUrl" input with the base URL of the AAS HTTP API server'
            );
        }
        if (!apiProfile) {
            throw new Error(
                'Server mode requires "apiProfile" input with the IDTA profile identifier.\n' +
                'Example: https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002\n' +
                'See: https://industrialdigitaltwin.io/aas-specifications/IDTA-01002/v3.1.1/http-rest-api/service-specifications-and-profiles.html'
            );
        }
    }

    return {
        mode,
        files,
        format,
        modelType,
        serverUrl,
        apiProfile,
        filter,
        headers,
        reportFormats,
        outputDir,
        pipPackage,
        pipVersion,
        pythonCmd,
        continueOnError
    };
}

/**
 * Build command arguments for check_file
 */
export function buildFileCheckArgs(
    filePath: string,
    format: Format,
    modelType: string,
    outputFormat: 'json' | 'html'
): string[] {
    const args = ['check_file', filePath];

    // Add format flag for non-aasx files
    const effectiveFormat = format || inferFormatFromPath(filePath);
    if (effectiveFormat && effectiveFormat !== 'aasx') {
        args.push('--format', effectiveFormat);
    }

    if (modelType) {
        args.push('--model_type', modelType);
    }

    args.push('--output', outputFormat);

    return args;
}

/**
 * Build command arguments for check_server
 */
export function buildServerCheckArgs(
    serverUrl: string,
    apiProfile: string,
    filter: string,
    headers: string[],
    outputFormat: 'json' | 'html'
): string[] {
    const args = ['check_server', serverUrl, apiProfile];

    if (filter) {
        args.push('--filter', filter);
    }

    for (const header of headers) {
        args.push('--header', header);
    }

    args.push('--output', outputFormat);

    return args;
}

/**
 * Infer format from file path extension
 */
function inferFormatFromPath(filePath: string): Format {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
        case 'json': return 'json';
        case 'xml': return 'xml';
        case 'aasx': return 'aasx';
        default: return '';
    }
}
