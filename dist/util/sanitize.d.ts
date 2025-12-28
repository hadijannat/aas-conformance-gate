/**
 * Sanitize a file path for use as a report filename
 * Replaces unsafe characters and truncates if necessary
 *
 * @param filePath - Original file path
 * @param maxLength - Maximum filename length (default 200)
 * @returns Sanitized filename safe for filesystem use
 */
export declare function sanitizeFilename(filePath: string, maxLength?: number): string;
/**
 * Sanitize a profile identifier for use as a report filename
 *
 * @param profile - IDTA profile identifier URL
 * @returns Sanitized filename
 */
export declare function sanitizeProfileName(profile: string): string;
/**
 * Create a deterministic report path for a file check
 */
export declare function getFileReportPath(outputDir: string, filePath: string, format: 'json' | 'html'): string;
/**
 * Create a deterministic report path for a server check
 */
export declare function getServerReportPath(outputDir: string, profile: string, format: 'json' | 'html'): string;
//# sourceMappingURL=sanitize.d.ts.map