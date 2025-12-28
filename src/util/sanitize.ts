import * as crypto from 'crypto';
import * as path from 'path';

const MAX_FILENAME_LENGTH = 200;
const UNSAFE_CHARS = /[/\\:*?"<>|\s]/g;

/**
 * Sanitize a file path for use as a report filename
 * Replaces unsafe characters and truncates if necessary
 * 
 * @param filePath - Original file path
 * @param maxLength - Maximum filename length (default 200)
 * @returns Sanitized filename safe for filesystem use
 */
export function sanitizeFilename(
    filePath: string,
    maxLength: number = MAX_FILENAME_LENGTH
): string {
    if (!filePath || filePath.trim() === '') {
        return 'unnamed';
    }

    // Get basename without extension
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);

    // Get directory components for uniqueness
    const dir = path.dirname(filePath);
    const dirParts = dir.split(path.sep).filter(p => p && p !== '.');

    // Create a deterministic path representation
    const parts = dirParts.length > 0 ? [...dirParts, name] : [name];
    let sanitized = parts
        .join('_')
        .replace(UNSAFE_CHARS, '_')
        .replace(/_+/g, '_')  // Collapse multiple underscores
        .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores

    // Handle empty result after sanitization
    if (!sanitized) {
        return 'unnamed';
    }

    // If too long, truncate and add hash for uniqueness
    if (sanitized.length > maxLength) {
        const hash = crypto
            .createHash('sha256')
            .update(filePath)
            .digest('hex')
            .substring(0, 8);

        const truncateLength = maxLength - hash.length - 1; // -1 for underscore
        sanitized = sanitized.substring(0, truncateLength) + '_' + hash;
    }

    return sanitized;
}

/**
 * Sanitize a profile identifier for use as a report filename
 * 
 * @param profile - IDTA profile identifier URL
 * @returns Sanitized filename
 */
export function sanitizeProfileName(profile: string): string {
    // Extract the meaningful part of the profile identifier
    // e.g., "https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002"
    // becomes "AssetAdministrationShellRepositoryServiceSpecification_SSP-002"

    const parts = profile.split('/').filter(Boolean);
    const meaningful = parts.slice(-2).join('_');

    return sanitizeFilename(meaningful);
}

/**
 * Create a deterministic report path for a file check
 */
export function getFileReportPath(
    outputDir: string,
    filePath: string,
    format: 'json' | 'html'
): string {
    const sanitized = sanitizeFilename(filePath);
    return path.join(outputDir, 'file', `${sanitized}.${format}`);
}

/**
 * Create a deterministic report path for a server check
 */
export function getServerReportPath(
    outputDir: string,
    profile: string,
    format: 'json' | 'html'
): string {
    const sanitized = sanitizeProfileName(profile);
    return path.join(outputDir, 'server', `${sanitized}.${format}`);
}
