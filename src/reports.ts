import * as fs from 'fs/promises';
import * as path from 'path';
import * as core from '@actions/core';
import { CheckResult } from './engine';
import { ActionInputs } from './inputs';

export interface ReportIndex {
    generated: string;
    actionVersion: string;
    mode: string;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    checks: Array<{
        id: string;
        type: string;
        target: string;
        passed: boolean;
        reports: {
            json?: string;
            html?: string;
        };
        error?: string;
    }>;
}

/**
 * Create the report directory structure
 */
export async function ensureReportDirectories(outputDir: string): Promise<void> {
    await fs.mkdir(path.join(outputDir, 'file'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'server'), { recursive: true });
}

/**
 * Generate a machine-consumable report index
 */
export async function generateReportIndex(
    inputs: ActionInputs,
    results: CheckResult[]
): Promise<ReportIndex> {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const index: ReportIndex = {
        generated: new Date().toISOString(),
        actionVersion: '1.0.0',
        mode: inputs.mode,
        totalChecks: results.length,
        passedChecks: passed,
        failedChecks: failed,
        checks: results.map(r => ({
            id: r.id,
            type: r.type,
            target: r.target,
            passed: r.passed,
            reports: r.reportPaths,
            error: r.error
        }))
    };

    // Write index file
    const indexPath = path.join(inputs.outputDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    core.info(`Report index written: ${indexPath}`);

    return index;
}

/**
 * List all generated reports
 */
export async function listReports(outputDir: string): Promise<string[]> {
    const reports: string[] = [];

    try {
        const walk = async (dir: string): Promise<void> => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.html'))) {
                    reports.push(fullPath);
                }
            }
        };

        await walk(outputDir);
    } catch {
        // Directory might not exist yet
    }

    return reports.sort();
}
