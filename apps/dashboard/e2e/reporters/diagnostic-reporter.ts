/**
 * Diagnostic Reporter for Playwright
 * 
 * Custom reporter that generates detailed diagnostic reports for video E2E tests.
 * Captures:
 * - Stage timing breakdown
 * - Network request/response logs
 * - Console messages
 * - Error stack traces
 * - Test metadata
 * 
 * @module e2e/reporters/diagnostic-reporter
 */

import type {
    FullConfig,
    FullResult,
    Reporter,
    Suite,
    TestCase,
    TestResult,
    TestStep
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface StageInfo {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'pending' | 'running' | 'passed' | 'failed';
    error?: string;
    screenshot?: string;
}

interface NetworkRequest {
    url: string;
    method: string;
    status?: number;
    duration?: number;
    timestamp: number;
}

interface ConsoleMessage {
    type: string;
    text: string;
    timestamp: number;
}

interface TestDiagnostic {
    testName: string;
    testFile: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    stages: StageInfo[];
    networkRequests: NetworkRequest[];
    consoleMessages: ConsoleMessage[];
    errors: string[];
    screenshots: string[];
    videoPath?: string;
    tracePath?: string;
}

interface DiagnosticReport {
    generatedAt: string;
    config: {
        baseURL: string;
        timeout: number;
        retries: number;
    };
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
    };
    tests: TestDiagnostic[];
}

class DiagnosticReporter implements Reporter {
    private report: DiagnosticReport;
    private outputDir: string;
    private currentTest: TestDiagnostic | null = null;

    constructor(options: { outputDir?: string } = {}) {
        this.outputDir = options.outputDir || './test-results';
        this.report = {
            generatedAt: new Date().toISOString(),
            config: {
                baseURL: '',
                timeout: 0,
                retries: 0,
            },
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0,
            },
            tests: [],
        };
    }

    onBegin(config: FullConfig, suite: Suite): void {
        this.report.config = {
            baseURL: config.projects[0]?.use?.baseURL || 'unknown',
            timeout: config.projects[0]?.timeout || 0,
            retries: config.projects[0]?.retries || 0,
        };
        this.report.summary.total = suite.allTests().length;

        console.log('\n🔬 Diagnostic Reporter Started');
        console.log(`📊 Total tests: ${this.report.summary.total}`);
        console.log(`🌐 Base URL: ${this.report.config.baseURL}`);
        console.log(`⏱️  Timeout: ${this.report.config.timeout}ms`);
    }

    onTestBegin(test: TestCase, result: TestResult): void {
        this.currentTest = {
            testName: test.title,
            testFile: test.location.file,
            startTime: new Date().toISOString(),
            status: 'passed',
            stages: [],
            networkRequests: [],
            consoleMessages: [],
            errors: [],
            screenshots: [],
        };

        console.log(`\n🧪 Starting: ${test.title}`);
    }

    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
        if (!this.currentTest) return;

        // Track test stages (custom annotations like [STAGE: Script Generation])
        if (step.title.includes('[STAGE:')) {
            const stageName = step.title.replace('[STAGE:', '').replace(']', '').trim();
            this.currentTest.stages.push({
                name: stageName,
                startTime: Date.now(),
                status: 'running',
            });
            console.log(`  📍 Stage: ${stageName}`);
        }
    }

    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
        if (!this.currentTest) return;

        // Complete the current stage
        const currentStage = this.currentTest.stages.find(s => s.status === 'running');
        if (currentStage && step.title.includes('[STAGE:')) {
            currentStage.endTime = Date.now();
            currentStage.duration = currentStage.endTime - currentStage.startTime;
            currentStage.status = step.error ? 'failed' : 'passed';
            if (step.error) {
                currentStage.error = step.error.message;
            }
            console.log(`  ✓ Stage completed: ${currentStage.name} (${currentStage.duration}ms)`);
        }
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        if (!this.currentTest) return;

        this.currentTest.endTime = new Date().toISOString();
        this.currentTest.duration = result.duration;
        this.currentTest.status = result.status;

        // Collect errors
        if (result.errors.length > 0) {
            this.currentTest.errors = result.errors.map(e => e.message || String(e));
        }

        // Collect attachments
        for (const attachment of result.attachments) {
            if (attachment.name === 'screenshot' && attachment.path) {
                this.currentTest.screenshots.push(attachment.path);
            }
            if (attachment.name === 'video' && attachment.path) {
                this.currentTest.videoPath = attachment.path;
            }
            if (attachment.name === 'trace' && attachment.path) {
                this.currentTest.tracePath = attachment.path;
            }
        }

        // Update summary
        switch (result.status) {
            case 'passed':
                this.report.summary.passed++;
                console.log(`  ✅ PASSED: ${test.title}`);
                break;
            case 'failed':
                this.report.summary.failed++;
                console.log(`  ❌ FAILED: ${test.title}`);
                if (this.currentTest.errors.length > 0) {
                    console.log(`     Error: ${this.currentTest.errors[0]}`);
                }
                break;
            case 'skipped':
                this.report.summary.skipped++;
                console.log(`  ⏭️  SKIPPED: ${test.title}`);
                break;
            case 'timedOut':
                this.report.summary.failed++;
                console.log(`  ⏱️  TIMEOUT: ${test.title}`);
                break;
        }

        this.report.tests.push(this.currentTest);
        this.currentTest = null;
    }

    async onEnd(result: FullResult): Promise<void> {
        this.report.summary.duration = result.duration;
        this.report.generatedAt = new Date().toISOString();

        // Ensure output directory exists
        const reportDir = path.resolve(this.outputDir);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Write JSON report
        const reportPath = path.join(reportDir, 'diagnostic-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

        // Write summary markdown
        const summaryPath = path.join(reportDir, 'diagnostic-summary.md');
        fs.writeFileSync(summaryPath, this.generateMarkdownSummary());

        console.log('\n' + '='.repeat(60));
        console.log('📊 DIAGNOSTIC REPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.report.summary.total}`);
        console.log(`✅ Passed: ${this.report.summary.passed}`);
        console.log(`❌ Failed: ${this.report.summary.failed}`);
        console.log(`⏭️  Skipped: ${this.report.summary.skipped}`);
        console.log(`⏱️  Duration: ${(this.report.summary.duration / 1000).toFixed(2)}s`);
        console.log('='.repeat(60));
        console.log(`📁 JSON Report: ${reportPath}`);
        console.log(`📄 Summary: ${summaryPath}`);
        console.log('='.repeat(60) + '\n');
    }

    private generateMarkdownSummary(): string {
        const { summary, tests, config } = this.report;

        let md = `# Video E2E Test Diagnostic Report

> Generated: ${this.report.generatedAt}

## Configuration

| Setting | Value |
|---------|-------|
| Base URL | ${config.baseURL} |
| Timeout | ${config.timeout}ms |
| Retries | ${config.retries} |

## Summary

| Metric | Count |
|--------|-------|
| Total | ${summary.total} |
| ✅ Passed | ${summary.passed} |
| ❌ Failed | ${summary.failed} |
| ⏭️ Skipped | ${summary.skipped} |
| ⏱️ Duration | ${(summary.duration / 1000).toFixed(2)}s |

## Test Results

`;

        for (const test of tests) {
            const statusIcon = {
                passed: '✅',
                failed: '❌',
                skipped: '⏭️',
                timedOut: '⏱️',
            }[test.status];

            md += `### ${statusIcon} ${test.testName}

- **Status**: ${test.status.toUpperCase()}
- **Duration**: ${test.duration ? (test.duration / 1000).toFixed(2) + 's' : 'N/A'}
- **File**: \`${path.basename(test.testFile)}\`

`;

            if (test.stages.length > 0) {
                md += `#### Stages

| Stage | Duration | Status |
|-------|----------|--------|
`;
                for (const stage of test.stages) {
                    const stageStatus = stage.status === 'passed' ? '✅' : stage.status === 'failed' ? '❌' : '⏳';
                    md += `| ${stage.name} | ${stage.duration ? stage.duration + 'ms' : 'N/A'} | ${stageStatus} |\n`;
                }
                md += '\n';
            }

            if (test.errors.length > 0) {
                md += `#### Errors

\`\`\`
${test.errors.join('\n')}
\`\`\`

`;
            }

            if (test.screenshots.length > 0) {
                md += `#### Screenshots

`;
                for (const ss of test.screenshots) {
                    md += `- [${path.basename(ss)}](${ss})\n`;
                }
                md += '\n';
            }
        }

        return md;
    }
}

export default DiagnosticReporter;
