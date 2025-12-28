import { CheckResult } from './engine';
import { ActionInputs } from './inputs';
import { ReportIndex } from './reports';
/**
 * Generate and write the GitHub job summary
 */
export declare function writeSummary(inputs: ActionInputs, results: CheckResult[], index: ReportIndex, pythonVersion: string): Promise<void>;
//# sourceMappingURL=summary.d.ts.map