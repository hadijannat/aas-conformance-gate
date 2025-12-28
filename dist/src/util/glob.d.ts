/**
 * Expand glob patterns to actual file paths
 * @param patterns - Array of glob patterns or file paths
 * @param cwd - Working directory for glob resolution
 * @returns Array of resolved absolute file paths
 */
export declare function expandGlobs(patterns: string[], cwd?: string): Promise<string[]>;
/**
 * Infer the AAS format from a file extension
 * @param filePath - Path to the file
 * @returns Inferred format or undefined if unknown
 */
export declare function inferFormat(filePath: string): 'json' | 'xml' | 'aasx' | undefined;
/**
 * Get the relative path from cwd, handling various edge cases
 */
export declare function getRelativePath(filePath: string, cwd?: string): string;
//# sourceMappingURL=glob.d.ts.map