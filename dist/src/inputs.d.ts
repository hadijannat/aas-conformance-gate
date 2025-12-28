export type Mode = 'file' | 'server' | 'both';
export type Format = 'json' | 'xml' | 'aasx' | '';
export type ReportFormat = 'json' | 'html';
export interface ActionInputs {
    mode: Mode;
    files: string[];
    format: Format;
    modelType: string;
    serverUrl: string;
    apiProfile: string;
    filter: string;
    headers: string[];
    reportFormats: ReportFormat[];
    outputDir: string;
    pipPackage: string;
    pipVersion: string;
    pythonCmd: string;
    continueOnError: boolean;
}
/**
 * Resolve and validate all action inputs
 */
export declare function resolveInputs(): ActionInputs;
/**
 * Build command arguments for check_file
 */
export declare function buildFileCheckArgs(filePath: string, format: Format, modelType: string, outputFormat: 'json' | 'html'): string[];
/**
 * Build command arguments for check_server
 */
export declare function buildServerCheckArgs(serverUrl: string, apiProfile: string, filter: string, headers: string[], outputFormat: 'json' | 'html'): string[];
//# sourceMappingURL=inputs.d.ts.map