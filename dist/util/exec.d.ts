export interface ExecResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
/**
 * Execute a command safely with array arguments (no shell injection)
 *
 * @param command - The command to execute
 * @param args - Array of arguments
 * @param options - Optional execution options
 * @returns ExecResult with exit code, stdout, and stderr
 */
export declare function safeExec(command: string, args: string[], options?: {
    cwd?: string;
    silent?: boolean;
    ignoreReturnCode?: boolean;
}): Promise<ExecResult>;
/**
 * Check if a command exists and is executable
 */
export declare function commandExists(command: string): Promise<boolean>;
//# sourceMappingURL=exec.d.ts.map