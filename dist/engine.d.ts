import { ActionInputs } from './inputs';
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
/**
 * Detect available Python executable
 */
export declare function detectPython(preferredCmd?: string): Promise<string>;
/**
 * Get Python version string
 */
export declare function getPythonVersion(pythonCmd: string): Promise<string>;
/**
 * Install or upgrade aas_test_engines via pip
 */
export declare function installTestEngines(pythonCmd: string, pipPackage: string, pipVersion: string): Promise<void>;
/**
 * Get aas_test_engines version
 */
export declare function getEngineVersion(pythonCmd: string): Promise<string>;
/**
 * Ensure aas_test_engines is installed and return Python executable
 */
export declare function ensureTestEngines(inputs: ActionInputs): Promise<string>;
/**
 * Get the cached engine version
 */
export declare function getCachedEngineVersion(): string;
/**
 * Run file validation checks
 */
export declare function runFileChecks(inputs: ActionInputs): Promise<CheckResult[]>;
/**
 * Run server validation check
 */
export declare function runServerChecks(inputs: ActionInputs): Promise<CheckResult[]>;
