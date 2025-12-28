/**
 * Unit tests for input parsing
 */

// Mock @actions/core
const mockGetInput = jest.fn();
const mockSetSecret = jest.fn();

jest.mock('@actions/core', () => ({
    getInput: mockGetInput,
    setSecret: mockSetSecret,
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

// Import after mocking
import { resolveInputs, buildFileCheckArgs, buildServerCheckArgs } from '../src/inputs';

describe('Input Parsing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInput.mockImplementation(() => '');
    });

    describe('resolveInputs', () => {
        it('should use default values for missing inputs', () => {
            mockGetInput.mockImplementation((name: string) => {
                const defaults: Record<string, string> = {
                    mode: 'file',
                    files: 'test.json',
                    format: '',
                    modelType: '',
                    serverUrl: '',
                    apiProfile: '',
                    filter: '',
                    headers: '',
                    reportFormats: 'json,html',
                    outputDir: 'aas-conformance-report',
                    pipPackage: 'aas_test_engines',
                    pipVersion: 'latest',
                    pythonCmd: '',
                    continueOnError: 'false'
                };
                return defaults[name] ?? '';
            });

            const inputs = resolveInputs();
            expect(inputs.mode).toBe('file');
            expect(inputs.reportFormats).toEqual(['json', 'html']);
            expect(inputs.outputDir).toBe('aas-conformance-report');
            expect(inputs.continueOnError).toBe(false);
        });

        it('should parse newline-separated files', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'file';
                if (name === 'files') return 'file1.json\nfile2.xml\n\nfile3.aasx';
                if (name === 'reportFormats') return 'json,html';
                return '';
            });

            const inputs = resolveInputs();
            expect(inputs.files).toEqual(['file1.json', 'file2.xml', 'file3.aasx']);
        });

        it('should parse newline-separated headers and mask values', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'server';
                if (name === 'serverUrl') return 'http://localhost:8080';
                if (name === 'apiProfile') return 'https://example.com/profile';
                if (name === 'headers') return 'Authorization: Bearer token123\nX-Custom: value';
                if (name === 'reportFormats') return 'json';
                return '';
            });

            const inputs = resolveInputs();
            expect(inputs.headers).toEqual([
                'Authorization: Bearer token123',
                'X-Custom: value'
            ]);
            // Should mask header values
            expect(mockSetSecret).toHaveBeenCalledWith('Bearer token123');
            expect(mockSetSecret).toHaveBeenCalledWith('value');
        });

        it('should throw error for invalid mode', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'invalid';
                return '';
            });

            expect(() => resolveInputs()).toThrow('Invalid mode: "invalid"');
        });

        it('should throw error for file mode without files', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'file';
                if (name === 'files') return '';
                return '';
            });

            expect(() => resolveInputs()).toThrow('File mode requires non-empty "files" input');
        });

        it('should throw error for server mode without serverUrl', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'server';
                if (name === 'serverUrl') return '';
                return '';
            });

            expect(() => resolveInputs()).toThrow('Server mode requires "serverUrl" input');
        });

        it('should throw error for server mode without apiProfile', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'server';
                if (name === 'serverUrl') return 'http://localhost:8080';
                if (name === 'apiProfile') return '';
                return '';
            });

            expect(() => resolveInputs()).toThrow('Server mode requires "apiProfile" input');
        });

        it('should parse continueOnError boolean', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'file';
                if (name === 'files') return 'test.json';
                if (name === 'continueOnError') return 'true';
                if (name === 'reportFormats') return 'json';
                return '';
            });

            const inputs = resolveInputs();
            expect(inputs.continueOnError).toBe(true);
        });

        it('should handle both mode requiring both file and server inputs', () => {
            mockGetInput.mockImplementation((name: string) => {
                if (name === 'mode') return 'both';
                if (name === 'files') return 'test.json';
                if (name === 'serverUrl') return 'http://localhost:8080';
                if (name === 'apiProfile') return 'https://example.com/profile';
                if (name === 'reportFormats') return 'json';
                return '';
            });

            const inputs = resolveInputs();
            expect(inputs.mode).toBe('both');
            expect(inputs.files).toEqual(['test.json']);
            expect(inputs.serverUrl).toBe('http://localhost:8080');
        });
    });

    describe('buildFileCheckArgs', () => {
        it('should build args for JSON file', () => {
            const args = buildFileCheckArgs('test.json', '', '', 'json');
            expect(args).toEqual(['check_file', 'test.json', '--format', 'json', '--output', 'json']);
        });

        it('should build args for XML file', () => {
            const args = buildFileCheckArgs('model.xml', '', '', 'html');
            expect(args).toEqual(['check_file', 'model.xml', '--format', 'xml', '--output', 'html']);
        });

        it('should build args for AASX file without format flag', () => {
            const args = buildFileCheckArgs('package.aasx', '', '', 'json');
            expect(args).toEqual(['check_file', 'package.aasx', '--output', 'json']);
        });

        it('should use explicit format over inferred', () => {
            const args = buildFileCheckArgs('test.json', 'xml', '', 'json');
            expect(args).toEqual(['check_file', 'test.json', '--format', 'xml', '--output', 'json']);
        });

        it('should include modelType when provided', () => {
            const args = buildFileCheckArgs('submodel.json', 'json', 'Submodel', 'json');
            expect(args).toEqual([
                'check_file', 'submodel.json',
                '--format', 'json',
                '--model_type', 'Submodel',
                '--output', 'json'
            ]);
        });
    });

    describe('buildServerCheckArgs', () => {
        it('should build basic server check args', () => {
            const args = buildServerCheckArgs(
                'http://localhost:8080',
                'https://example.com/profile',
                '',
                [],
                'json'
            );
            expect(args).toEqual([
                'check_server',
                'http://localhost:8080',
                'https://example.com/profile',
                '--output', 'json'
            ]);
        });

        it('should include filter when provided', () => {
            const args = buildServerCheckArgs(
                'http://localhost:8080',
                'https://example.com/profile',
                'GetAll*',
                [],
                'json'
            );
            expect(args).toContain('--filter');
            expect(args).toContain('GetAll*');
        });

        it('should include multiple headers', () => {
            const args = buildServerCheckArgs(
                'http://localhost:8080',
                'https://example.com/profile',
                '',
                ['Authorization: Bearer token', 'X-Custom: value'],
                'json'
            );
            expect(args).toContain('--header');
            expect(args).toContain('Authorization: Bearer token');
            expect(args).toContain('X-Custom: value');
        });

        it('should include both filter and headers', () => {
            const args = buildServerCheckArgs(
                'http://localhost:8080',
                'https://example.com/profile',
                'GetAll*',
                ['Authorization: Bearer token'],
                'html'
            );
            expect(args).toEqual([
                'check_server',
                'http://localhost:8080',
                'https://example.com/profile',
                '--filter', 'GetAll*',
                '--header', 'Authorization: Bearer token',
                '--output', 'html'
            ]);
        });
    });
});
