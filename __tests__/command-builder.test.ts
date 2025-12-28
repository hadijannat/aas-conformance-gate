/**
 * Unit tests for glob utilities
 */

import { inferFormat, getRelativePath } from '../src/util/glob';

describe('Glob Utilities', () => {
    describe('inferFormat', () => {
        it('should infer json format from .json extension', () => {
            expect(inferFormat('test.json')).toBe('json');
            expect(inferFormat('/path/to/file.JSON')).toBe('json');
        });

        it('should infer xml format from .xml extension', () => {
            expect(inferFormat('model.xml')).toBe('xml');
            expect(inferFormat('/path/to/file.XML')).toBe('xml');
        });

        it('should infer aasx format from .aasx extension', () => {
            expect(inferFormat('package.aasx')).toBe('aasx');
            expect(inferFormat('/path/to/file.AASX')).toBe('aasx');
        });

        it('should return undefined for unknown extensions', () => {
            expect(inferFormat('file.txt')).toBeUndefined();
            expect(inferFormat('file.pdf')).toBeUndefined();
            expect(inferFormat('file')).toBeUndefined();
        });
    });

    describe('getRelativePath', () => {
        it('should return relative path for files within cwd', () => {
            const result = getRelativePath('/home/user/project/file.json', '/home/user/project');
            expect(result).toBe('file.json');
        });

        it('should return relative path including subdirectories', () => {
            const result = getRelativePath('/home/user/project/sub/file.json', '/home/user/project');
            expect(result).toBe('sub/file.json');
        });

        it('should return basename for files outside cwd', () => {
            const result = getRelativePath('/other/path/file.json', '/home/user/project');
            expect(result).toBe('file.json');
        });

        it('should return basename when path equals cwd', () => {
            const result = getRelativePath('/home/user/project', '/home/user/project');
            expect(result).toBe('project');
        });
    });
});
