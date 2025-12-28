import * as exec from '@actions/exec';
import * as core from '@actions/core';

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
export async function safeExec(
    command: string,
    args: string[],
    options: {
        cwd?: string;
        silent?: boolean;
        ignoreReturnCode?: boolean;
    } = {}
): Promise<ExecResult> {
    let stdout = '';
    let stderr = '';

    const execOptions: exec.ExecOptions = {
        cwd: options.cwd,
        silent: options.silent ?? false,
        ignoreReturnCode: options.ignoreReturnCode ?? true,
        listeners: {
            stdout: (data: Buffer) => {
                stdout += data.toString();
            },
            stderr: (data: Buffer) => {
                stderr += data.toString();
            }
        }
    };

    core.debug(`Executing: ${command} ${args.join(' ')}`);

    const exitCode = await exec.exec(command, args, execOptions);

    return {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim()
    };
}

/**
 * Check if a command exists and is executable
 */
export async function commandExists(command: string): Promise<boolean> {
    try {
        const result = await safeExec('which', [command], { silent: true });
        return result.exitCode === 0;
    } catch {
        return false;
    }
}
