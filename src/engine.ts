import * as core from '@actions/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionInputs, buildFileCheckArgs, buildServerCheckArgs } from './inputs';
import { safeExec, commandExists, ExecResult } from './util/exec';
import { expandGlobs } from './util/glob';
import { getFileReportPath, getServerReportPath } from './util/sanitize';

export interface CheckResult {
    id: string;
    type: 'file' | 'server';
    target: string;
    passed: boolean;
    exitCode: number;
    reportPaths: {
        json?: string;
        html?: string;
    };
    error?: string;
}

let pythonExecutable: string | null = null;
let engineVersion: string | null = null;

/**
 * Detect available Python executable
 */
export async function detectPython(preferredCmd?: string): Promise<string> {
    const candidates = preferredCmd
        ? [preferredCmd, 'python3', 'python']
        : ['python3', 'python'];

    for (const cmd of candidates) {
        if (await commandExists(cmd)) {
            const result = await safeExec(cmd, ['--version'], { silent: true });
            if (result.exitCode === 0) {
                core.info(`Found Python: ${cmd} (${result.stdout})`);
                return cmd;
            }
        }
    }

    throw new Error(
        'Python not found. Please ensure Python is installed and available in PATH.\n' +
        'In GitHub Actions, use actions/setup-python before this action:\n\n' +
        '- uses: actions/setup-python@v5\n' +
        '  with:\n' +
        '    python-version: "3.11"'
    );
}

/**
 * Get Python version string
 */
export async function getPythonVersion(pythonCmd: string): Promise<string> {
    const result = await safeExec(pythonCmd, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")'], { silent: true });
    return result.stdout.trim() || 'unknown';
}

/**
 * Install or upgrade aas_test_engines via pip
 */
export async function installTestEngines(
    pythonCmd: string,
    pipPackage: string,
    pipVersion: string
): Promise<void> {
    core.info(`Installing ${pipPackage}...`);

    const packageSpec = pipVersion === 'latest'
        ? pipPackage
        : `${pipPackage}==${pipVersion}`;

    const result = await safeExec(
        pythonCmd,
        ['-m', 'pip', 'install', '--upgrade', packageSpec],
        { silent: false }
    );

    if (result.exitCode !== 0) {
        throw new Error(
            `Failed to install ${packageSpec}:\n${result.stderr || result.stdout}`
        );
    }

    core.info(`Successfully installed ${pipPackage}`);
}

/**
 * Get aas_test_engines version
 */
export async function getEngineVersion(pythonCmd: string): Promise<string> {
    const result = await safeExec(
        pythonCmd,
        ['-m', 'pip', 'show', 'aas_test_engines'],
        { silent: true }
    );

    if (result.exitCode === 0) {
        const match = result.stdout.match(/^Version:\s*(.+)$/m);
        if (match) {
            return match[1].trim();
        }
    }

    return 'unknown';
}

/**
 * Ensure aas_test_engines is installed and return Python executable
 */
export async function ensureTestEngines(inputs: ActionInputs): Promise<string> {
    if (pythonExecutable) {
        return pythonExecutable;
    }

    pythonExecutable = await detectPython(inputs.pythonCmd);
    await installTestEngines(pythonExecutable, inputs.pipPackage, inputs.pipVersion);
    engineVersion = await getEngineVersion(pythonExecutable);

    core.info(`aas_test_engines version: ${engineVersion}`);

    return pythonExecutable;
}

/**
 * Get the cached engine version
 */
export function getCachedEngineVersion(): string {
    return engineVersion || 'unknown';
}

/**
 * Run a single check_file command
 */
async function runFileCheck(
    pythonCmd: string,
    filePath: string,
    inputs: ActionInputs
): Promise<CheckResult> {
    const result: CheckResult = {
        id: `file:${filePath}`,
        type: 'file',
        target: filePath,
        passed: false,
        exitCode: -1,
        reportPaths: {}
    };

    try {
        // Ensure output directories exist
        const fileReportDir = path.join(inputs.outputDir, 'file');
        await fs.mkdir(fileReportDir, { recursive: true });

        // Run checks for each requested report format
        for (const reportFormat of inputs.reportFormats) {
            const args = buildFileCheckArgs(
                filePath,
                inputs.format,
                inputs.modelType,
                reportFormat
            );

            core.info(`Running: aas_test_engines ${args.join(' ')}`);

            const execResult = await safeExec('aas_test_engines', args, {
                ignoreReturnCode: true
            });

            result.exitCode = execResult.exitCode;

            // Write report file
            const reportPath = getFileReportPath(inputs.outputDir, filePath, reportFormat);
            await fs.writeFile(reportPath, execResult.stdout, 'utf-8');
            result.reportPaths[reportFormat] = reportPath;

            core.info(`Report written: ${reportPath}`);

            if (execResult.stderr) {
                core.warning(`stderr: ${execResult.stderr}`);
            }
        }

        // Pass/fail based on exit code (run once with json to get definitive result)
        result.passed = result.exitCode === 0;

    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        core.error(`File check failed for ${filePath}: ${result.error}`);
    }

    return result;
}

/**
 * Run file validation checks
 */
export async function runFileChecks(inputs: ActionInputs): Promise<CheckResult[]> {
    const pythonCmd = await ensureTestEngines(inputs);
    const results: CheckResult[] = [];

    // Expand glob patterns
    const files = await expandGlobs(inputs.files);

    if (files.length === 0) {
        core.warning('No files matched the provided patterns');
        return results;
    }

    core.info(`Found ${files.length} file(s) to check`);

    for (const filePath of files) {
        const result = await runFileCheck(pythonCmd, filePath, inputs);
        results.push(result);

        if (result.passed) {
            core.info(`✓ ${filePath} passed`);
        } else {
            core.error(`✗ ${filePath} failed (exit code: ${result.exitCode})`);
        }
    }

    return results;
}

/**
 * Run server validation check
 */
export async function runServerChecks(inputs: ActionInputs): Promise<CheckResult[]> {
    const pythonCmd = await ensureTestEngines(inputs);
    const results: CheckResult[] = [];

    const result: CheckResult = {
        id: `server:${inputs.apiProfile}`,
        type: 'server',
        target: `${inputs.serverUrl} (${inputs.apiProfile})`,
        passed: false,
        exitCode: -1,
        reportPaths: {}
    };

    try {
        // Ensure output directories exist
        const serverReportDir = path.join(inputs.outputDir, 'server');
        await fs.mkdir(serverReportDir, { recursive: true });

        core.info(`\nServer conformance check:`);
        core.info(`  URL: ${inputs.serverUrl}`);
        core.info(`  Profile: ${inputs.apiProfile}`);
        if (inputs.filter) {
            core.info(`  Filter: ${inputs.filter}`);
        }

        // Note about test data requirement
        core.info(`Note: Server tests require pre-populated test data. See: https://github.com/admin-shell-io/aas-test-engines#readme`);

        // Run checks for each requested report format
        for (const reportFormat of inputs.reportFormats) {
            const args = buildServerCheckArgs(
                inputs.serverUrl,
                inputs.apiProfile,
                inputs.filter,
                inputs.headers,
                reportFormat
            );

            // Log command without sensitive headers
            const safeArgs = args.map((arg, i) => {
                if (args[i - 1] === '--header' && arg.includes(':')) {
                    const [name] = arg.split(':');
                    return `${name}: ***`;
                }
                return arg;
            });
            core.info(`Running: aas_test_engines ${safeArgs.join(' ')}`);

            const execResult = await safeExec('aas_test_engines', args, {
                ignoreReturnCode: true
            });

            result.exitCode = execResult.exitCode;

            // Write report file
            const reportPath = getServerReportPath(inputs.outputDir, inputs.apiProfile, reportFormat);
            await fs.writeFile(reportPath, execResult.stdout, 'utf-8');
            result.reportPaths[reportFormat] = reportPath;

            core.info(`Report written: ${reportPath}`);

            if (execResult.stderr) {
                core.warning(`stderr: ${execResult.stderr}`);
            }
        }

        result.passed = result.exitCode === 0;

    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        core.error(`Server check failed: ${result.error}`);
    }

    results.push(result);

    if (result.passed) {
        core.info(`✓ Server check passed`);
    } else {
        core.error(`✗ Server check failed (exit code: ${result.exitCode})`);
    }

    return results;
}
