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
export declare function ensureReportDirectories(outputDir: string): Promise<void>;
/**
 * Generate a machine-consumable report index
 */
export declare function generateReportIndex(inputs: ActionInputs, results: CheckResult[]): Promise<ReportIndex>;
/**
 * List all generated reports
 */
export declare function listReports(outputDir: string): Promise<string[]>;
