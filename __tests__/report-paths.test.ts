/**
 * Unit tests for report path generation and sanitization
 */

import {
    sanitizeFilename,
    sanitizeProfileName,
    getFileReportPath,
    getServerReportPath
} from '../src/util/sanitize';

describe('Filename Sanitization', () => {
    describe('sanitizeFilename', () => {
        it('should replace unsafe characters with underscores', () => {
            const result = sanitizeFilename('path/to/file:name.json');
            expect(result).not.toContain('/');
            expect(result).not.toContain(':');
            expect(result).toContain('_');
        });

        it('should replace spaces with underscores', () => {
            const result = sanitizeFilename('my file name.json');
            expect(result).not.toContain(' ');
        });

        it('should collapse multiple underscores', () => {
            const result = sanitizeFilename('path//to///file.json');
            expect(result).not.toContain('__');
        });

        it('should handle simple filenames', () => {
            const result = sanitizeFilename('simple.json');
            expect(result).toBe('simple');
        });

        it('should truncate long filenames and add hash', () => {
            const longPath = 'a'.repeat(300) + '/file.json';
            const result = sanitizeFilename(longPath, 50);
            expect(result.length).toBeLessThanOrEqual(50);
            expect(result).toMatch(/_[a-f0-9]{8}$/); // ends with hash
        });

        it('should return "unnamed" for empty input', () => {
            const result = sanitizeFilename('');
            expect(result).toBe('unnamed');
        });

        it('should include directory structure for uniqueness', () => {
            const result1 = sanitizeFilename('/path/to/file.json');
            const result2 = sanitizeFilename('/other/path/file.json');
            expect(result1).not.toBe(result2);
        });
    });

    describe('sanitizeProfileName', () => {
        it('should extract meaningful part of profile URL', () => {
            const profile = 'https://admin-shell.io/aas/API/3/0/AssetAdministrationShellRepositoryServiceSpecification/SSP-002';
            const result = sanitizeProfileName(profile);
            expect(result).toContain('AssetAdministrationShellRepositoryServiceSpecification');
            expect(result).toContain('SSP-002');
        });

        it('should handle short profile identifiers', () => {
            const profile = 'https://example.com/profile';
            const result = sanitizeProfileName(profile);
            expect(result).toBeTruthy();
        });
    });

    describe('getFileReportPath', () => {
        it('should create path in file subdirectory', () => {
            const result = getFileReportPath('output', '/path/to/test.json', 'json');
            expect(result).toContain('output');
            expect(result).toContain('file');
            expect(result).toMatch(/\.json$/);
        });

        it('should create HTML report path', () => {
            const result = getFileReportPath('output', '/path/to/test.json', 'html');
            expect(result).toMatch(/\.html$/);
        });

        it('should sanitize the filename', () => {
            const result = getFileReportPath('output', '/path/with spaces/test file.json', 'json');
            expect(result).not.toContain(' ');
        });
    });

    describe('getServerReportPath', () => {
        it('should create path in server subdirectory', () => {
            const result = getServerReportPath('output', 'https://example.com/profile', 'json');
            expect(result).toContain('output');
            expect(result).toContain('server');
            expect(result).toMatch(/\.json$/);
        });

        it('should sanitize the profile identifier', () => {
            const profile = 'https://admin-shell.io/aas/API/3/0/SomeSpec/SSP-001';
            const result = getServerReportPath('output', profile, 'html');
            // Check that the filename (basename) doesn't contain unsafe chars
            const basename = result.split('/').pop() || '';
            expect(basename).not.toContain(':');
            expect(basename).not.toContain('/');
            expect(result).toMatch(/\.html$/);
        });
    });
});
