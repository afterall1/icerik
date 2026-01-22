/**
 * ScriptPreview Component
 * 
 * Displays generated script with collapsible sections for Hook, Body, and CTA.
 * Supports copying individual sections and displays word/duration counts.
 * 
 * @module components/molecules/ScriptPreview
 */

import { useState, useCallback } from 'react';
import { Card } from '../atoms';
import type { GeneratedScript } from '../../lib/api';
import { Copy, Check, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';

interface ScriptPreviewProps {
    /** Generated script data */
    script: GeneratedScript;
}

interface SectionProps {
    title: string;
    content: string;
    icon: React.ReactNode;
    accentColor: string;
}

/**
 * Individual script section with copy and collapse functionality
 */
function ScriptSection({ title, content, icon, accentColor }: SectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy section:', err);
        }
    }, [content]);

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.round(wordCount / 2.5);

    return (
        <div className={`border-l-4 ${accentColor} bg-slate-800/50 rounded-r-lg overflow-hidden`}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/70 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-slate-200">{title}</span>
                    <span className="text-xs text-slate-500 ml-2">
                        {wordCount} kelime • ~{estimatedSeconds}s
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-md transition-colors"
                        title="Kopyala"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {content}
                    </p>
                </div>
            )}
        </div>
    );
}

export function ScriptPreview({ script }: ScriptPreviewProps) {
    const totalWords = script.script.split(/\s+/).filter(Boolean).length;

    return (
        <Card padding="none" className="overflow-hidden">
            {/* Stats Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <FileText className="w-4 h-4" />
                        {totalWords} kelime
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-4 h-4" />
                        ~{script.estimatedDurationSeconds}s
                    </span>
                </div>
                <span className="text-xs text-slate-500">
                    {new Date(script.metadata.generatedAt).toLocaleTimeString('tr-TR')}
                </span>
            </div>

            {/* Sections */}
            <div className="p-4 space-y-3">
                {/* Hook Section */}
                {script.sections.hook && (
                    <ScriptSection
                        title="Hook"
                        content={script.sections.hook}
                        icon={<span className="text-lg">🎣</span>}
                        accentColor="border-amber-500"
                    />
                )}

                {/* Body Section */}
                <ScriptSection
                    title="Body"
                    content={script.sections.body}
                    icon={<span className="text-lg">📝</span>}
                    accentColor="border-indigo-500"
                />

                {/* CTA Section */}
                {script.sections.cta && (
                    <ScriptSection
                        title="Call to Action"
                        content={script.sections.cta}
                        icon={<span className="text-lg">📢</span>}
                        accentColor="border-green-500"
                    />
                )}
            </div>
        </Card>
    );
}
