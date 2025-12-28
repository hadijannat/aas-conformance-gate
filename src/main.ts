import * as core from '@actions/core';
import { resolveInputs } from './inputs';
import { ensureTestEngines, runFileChecks, runServerChecks, getPythonVersion, CheckResult } from './engine';
import { ensureReportDirectories, generateReportIndex } from './reports';
import { writeSummary } from './summary';

async function run(): Promise<void> {
    try {
        core.info('🔧 AAS Conformance Gate v1.0.0');
        core.info('================================\n');

        // Parse and validate inputs
        const inputs = resolveInputs();
        core.info(`Mode: ${inputs.mode}`);

        // Ensure report directories exist
        await ensureReportDirectories(inputs.outputDir);

        // Ensure Python and aas_test_engines are available
        const pythonCmd = await ensureTestEngines(inputs);
        const pythonVersion = await getPythonVersion(pythonCmd);

        // Collect all results
        const results: CheckResult[] = [];

        // Run file checks if mode includes file
        if (inputs.mode === 'file' || inputs.mode === 'both') {
            core.info('\n📄 Running file checks...\n');
            const fileResults = await runFileChecks(inputs);
            results.push(...fileResults);
        }

        // Run server checks if mode includes server
        if (inputs.mode === 'server' || inputs.mode === 'both') {
            core.info('\n🖥️ Running server checks...\n');
            const serverResults = await runServerChecks(inputs);
            results.push(...serverResults);
        }

        // Generate report index
        const index = await generateReportIndex(inputs, results);

        // Determine overall pass/fail status
        const passed = results.every(r => r.passed);
        const failedChecks = results.filter(r => !r.passed).map(r => r.id);

        // Set outputs
        core.setOutput('passed', passed ? 'true' : 'false');
        core.setOutput('reportDir', inputs.outputDir);
        core.setOutput('failedChecks', JSON.stringify(failedChecks));

        // Write job summary
        await writeSummary(inputs, results, index, pythonVersion);

        // Final status
        core.info('\n================================');
        if (passed) {
            core.info('✅ All conformance checks passed!');
        } else {
            core.info(`❌ ${failedChecks.length} check(s) failed`);

            if (!inputs.continueOnError) {
                core.setFailed(
                    `AAS conformance gate failed. ${failedChecks.length} check(s) did not pass.\n` +
                    `See the job summary and reports in ${inputs.outputDir}/ for details.`
                );
            } else {
                core.warning(
                    `AAS conformance gate: ${failedChecks.length} check(s) failed, but continueOnError is enabled.`
                );
            }
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.setFailed(`Action failed: ${message}`);
    }
}

run();
