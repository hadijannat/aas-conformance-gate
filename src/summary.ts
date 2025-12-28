import * as core from '@actions/core';
import { CheckResult, getCachedEngineVersion } from './engine';
import { ActionInputs } from './inputs';
import { ReportIndex } from './reports';

/**
 * Generate and write the GitHub job summary
 */
export async function writeSummary(
    inputs: ActionInputs,
    results: CheckResult[],
    index: ReportIndex,
    pythonVersion: string
): Promise<void> {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const allPassed = failed === 0;

    const statusEmoji = allPassed ? '✅' : '❌';
    const statusText = allPassed ? 'All checks passed' : `${failed} check(s) failed`;

    // Build summary markdown
    let summary = `## ${statusEmoji} AAS Conformance Gate - ${statusText}\n\n`;

    // Tooling versions
    summary += `### Environment\n\n`;
    summary += `| Component | Version |\n`;
    summary += `|-----------|----------|\n`;
    summary += `| Python | ${pythonVersion} |\n`;
    summary += `| aas_test_engines | ${getCachedEngineVersion()} |\n`;
    summary += `| Action | 1.0.0 |\n\n`;

    // Configuration
    summary += `### Configuration\n\n`;
    summary += `| Setting | Value |\n`;
    summary += `|---------|-------|\n`;
    summary += `| Mode | \`${inputs.mode}\` |\n`;
    summary += `| Output Directory | \`${inputs.outputDir}\` |\n`;
    summary += `| Report Formats | ${inputs.reportFormats.map(f => `\`${f}\``).join(', ')} |\n`;

    if (inputs.mode === 'file' || inputs.mode === 'both') {
        summary += `| File Patterns | ${inputs.files.length} pattern(s) |\n`;
    }

    if (inputs.mode === 'server' || inputs.mode === 'both') {
        summary += `| Server URL | \`${inputs.serverUrl}\` |\n`;
        summary += `| API Profile | \`${inputs.apiProfile}\` |\n`;
        if (inputs.filter) {
            summary += `| Filter | \`${inputs.filter}\` |\n`;
        }
    }

    summary += `\n`;

    // Results table
    summary += `### Results\n\n`;
    summary += `| Status | Type | Target | Reports |\n`;
    summary += `|--------|------|--------|----------|\n`;

    for (const result of results) {
        const status = result.passed ? '✅ Pass' : '❌ Fail';
        const type = result.type === 'file' ? '📄 File' : '🖥️ Server';
        const target = truncateString(result.target, 60);

        const reportLinks: string[] = [];
        if (result.reportPaths.json) {
            reportLinks.push(`[JSON](${result.reportPaths.json})`);
        }
        if (result.reportPaths.html) {
            reportLinks.push(`[HTML](${result.reportPaths.html})`);
        }
        const reports = reportLinks.join(', ') || 'N/A';

        summary += `| ${status} | ${type} | \`${target}\` | ${reports} |\n`;
    }

    summary += `\n`;

    // Summary stats
    summary += `### Summary\n\n`;
    summary += `- **Total checks:** ${total}\n`;
    summary += `- **Passed:** ${passed} ✅\n`;
    summary += `- **Failed:** ${failed} ${failed > 0 ? '❌' : ''}\n\n`;

    // Artifacts note
    summary += `### Artifacts\n\n`;
    summary += `Reports are available in the \`${inputs.outputDir}/\` directory.\n\n`;
    summary += `To preserve these reports, add an upload-artifact step after this action:\n\n`;
    summary += '```yaml\n';
    summary += `- uses: actions/upload-artifact@v4\n`;
    summary += `  if: always()\n`;
    summary += `  with:\n`;
    summary += `    name: aas-conformance-report\n`;
    summary += `    path: ${inputs.outputDir}/\n`;
    summary += '```\n\n';

    // Failed checks details
    if (failed > 0) {
        summary += `### Failed Checks\n\n`;
        for (const result of results.filter(r => !r.passed)) {
            summary += `#### ❌ ${result.target}\n\n`;
            if (result.error) {
                summary += `**Error:** ${result.error}\n\n`;
            }
            summary += `**Exit code:** ${result.exitCode}\n\n`;
            if (result.reportPaths.html) {
                summary += `See the [HTML report](${result.reportPaths.html}) for details.\n\n`;
            }
        }
    }

    // Reference links
    summary += `---\n\n`;
    summary += `**References:**\n`;
    summary += `- [AAS Test Engines](https://github.com/admin-shell-io/aas-test-engines)\n`;
    summary += `- [IDTA Service Specifications](https://industrialdigitaltwin.io/aas-specifications/IDTA-01002/v3.1.1/http-rest-api/service-specifications-and-profiles.html)\n`;
    summary += `- [AAS Specs API](https://github.com/admin-shell-io/aas-specs-api)\n`;

    // Write to GITHUB_STEP_SUMMARY
    await core.summary.addRaw(summary).write();

    core.info('Job summary written');
}

/**
 * Truncate a string with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}
