import fg from 'fast-glob';
import * as path from 'path';

/**
 * Expand glob patterns to actual file paths
 * @param patterns - Array of glob patterns or file paths
 * @param cwd - Working directory for glob resolution
 * @returns Array of resolved absolute file paths
 */
export async function expandGlobs(
    patterns: string[],
    cwd: string = process.cwd()
): Promise<string[]> {
    if (patterns.length === 0) {
        return [];
    }

    const files = await fg(patterns, {
        cwd,
        absolute: true,
        onlyFiles: true,
        dot: false,
        followSymbolicLinks: true,
        unique: true
    });

    return files.sort();
}

/**
 * Infer the AAS format from a file extension
 * @param filePath - Path to the file
 * @returns Inferred format or undefined if unknown
 */
export function inferFormat(filePath: string): 'json' | 'xml' | 'aasx' | undefined {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.json':
            return 'json';
        case '.xml':
            return 'xml';
        case '.aasx':
            return 'aasx';
        default:
            return undefined;
    }
}

/**
 * Get the relative path from cwd, handling various edge cases
 */
export function getRelativePath(filePath: string, cwd: string = process.cwd()): string {
    const relative = path.relative(cwd, filePath);
    // If the path starts with "..", it's outside cwd - use the basename
    if (relative.startsWith('..')) {
        return path.basename(filePath);
    }
    return relative || path.basename(filePath);
}
