/**
 * useExport Hook
 *
 * Provides export functionality for scripts.
 * Supports Markdown and JSON formats.
 *
 * @module lib/hooks/useExport
 */

import { useCallback } from 'react';
import type { PlatformScript, TrendData } from './api';
import { PLATFORM_LABELS } from './api';

/**
 * Export format options
 */
export type ExportFormat = 'markdown' | 'json';

/**
 * Hook return type
 */
interface UseExportReturn {
    /** Export a single script */
    exportScript: (script: PlatformScript, trend: TrendData, format: ExportFormat) => void;
    /** Export multiple scripts */
    exportBatch: (scripts: PlatformScript[], trend: TrendData, format: ExportFormat) => void;
    /** Copy script to clipboard as text */
    copyToClipboard: (script: PlatformScript) => Promise<boolean>;
}

/**
 * Generate filename for export
 */
function generateFilename(trend: TrendData, platform: string, format: ExportFormat): string {
    const sanitized = trend.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
    const extension = format === 'markdown' ? 'md' : 'json';
    return `script-${platform}-${sanitized}.${extension}`;
}

/**
 * Convert script to Markdown format
 */
function scriptToMarkdown(script: PlatformScript, trend: TrendData): string {
    const platformLabel = PLATFORM_LABELS[script.platform];
    const sections = script.sections;

    let md = `# ${platformLabel} Script\n\n`;
    md += `> **Trend**: ${trend.title}  \n`;
    md += `> **Source**: r/${trend.subreddit}  \n`;
    md += `> **NES**: ${trend.nes.toFixed(1)}  \n`;
    md += `> **Generated**: ${new Date().toLocaleDateString('tr-TR')}\n\n`;
    md += `---\n\n`;

    // Hook
    if (sections.hook) {
        md += `## 🎣 Hook\n\n`;
        md += `${sections.hook.content}\n\n`;
        md += `*${sections.hook.wordCount} kelime, ~${sections.hook.estimatedSeconds}s*\n\n`;
    }

    // Body
    md += `## 📝 Body\n\n`;
    md += `${sections.body.content}\n\n`;
    md += `*${sections.body.wordCount} kelime, ~${sections.body.estimatedSeconds}s*\n\n`;

    // CTA
    if (sections.cta) {
        md += `## 📢 Call to Action\n\n`;
        md += `${sections.cta.content}\n\n`;
    }

    // Title
    md += `## 📌 Title\n\n`;
    md += `${script.title}\n\n`;

    // Hashtags
    md += `## #️⃣ Hashtags\n\n`;
    md += script.hashtags.map(tag => `\`${tag}\``).join(' ') + '\n\n';

    // Stats
    md += `---\n\n`;
    const totalWords = (script.sections.hook?.wordCount ?? 0) +
        script.sections.body.wordCount +
        (script.sections.cta?.wordCount ?? 0);
    md += `**Stats**: ${script.estimatedDurationSeconds}s total, ${totalWords} words\n`;

    return md;
}

/**
 * Convert script to JSON format
 */
function scriptToJson(script: PlatformScript, trend: TrendData): string {
    return JSON.stringify({
        meta: {
            platform: script.platform,
            trend: {
                id: trend.id,
                title: trend.title,
                subreddit: trend.subreddit,
                category: trend.category,
                nes: trend.nes,
            },
            generatedAt: new Date().toISOString(),
        },
        script: {
            title: script.title,
            sections: script.sections,
            hashtags: script.hashtags,
            stats: {
                wordCount: (script.sections.hook?.wordCount ?? 0) +
                    script.sections.body.wordCount +
                    (script.sections.cta?.wordCount ?? 0),
                durationSeconds: script.estimatedDurationSeconds,
            },
            optimizations: script.optimizations,
        },
    }, null, 2);
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Custom hook for exporting scripts
 *
 * @example
 * const { exportScript, copyToClipboard } = useExport();
 * exportScript(script, trend, 'markdown');
 */
export function useExport(): UseExportReturn {
    // Export a single script
    const exportScript = useCallback(
        (script: PlatformScript, trend: TrendData, format: ExportFormat): void => {
            const filename = generateFilename(trend, script.platform, format);

            if (format === 'markdown') {
                const content = scriptToMarkdown(script, trend);
                downloadFile(content, filename, 'text/markdown');
            } else {
                const content = scriptToJson(script, trend);
                downloadFile(content, filename, 'application/json');
            }
        },
        []
    );

    // Export multiple scripts as a batch
    const exportBatch = useCallback(
        (scripts: PlatformScript[], trend: TrendData, format: ExportFormat): void => {
            if (scripts.length === 0) return;

            if (format === 'markdown') {
                // Combine all scripts into one markdown
                const combined = scripts
                    .map((s) => scriptToMarkdown(s, trend))
                    .join('\n\n---\n\n');
                const filename = generateFilename(trend, 'all', format);
                downloadFile(combined, filename, 'text/markdown');
            } else {
                // Export as JSON array
                const content = JSON.stringify(
                    scripts.map((s) => ({
                        platform: s.platform,
                        ...JSON.parse(scriptToJson(s, trend)),
                    })),
                    null,
                    2
                );
                const filename = generateFilename(trend, 'all', format);
                downloadFile(content, filename, 'application/json');
            }
        },
        []
    );

    // Copy script text to clipboard
    const copyToClipboard = useCallback(
        async (script: PlatformScript): Promise<boolean> => {
            try {
                await navigator.clipboard.writeText(script.script);
                return true;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                return false;
            }
        },
        []
    );

    return {
        exportScript,
        exportBatch,
        copyToClipboard,
    };
}

export type { UseExportReturn };
