/**
 * IterationPanel Component
 *
 * Provides iteration controls for script sections.
 * Allows regenerating specific parts like hook, body, CTA, etc.
 *
 * @module components/molecules/IterationPanel
 */

import { useState, useCallback } from 'react';
import { RefreshCw, Sparkles, Minus, Plus, Volume2, Zap, ChevronDown } from 'lucide-react';
import type { PlatformScript, IterationTarget, IterationResult } from '../../lib/api';
import { useIterateScript } from '../../lib/hooks';

/**
 * Iteration button configuration
 */
interface IterationButton {
    target: IterationTarget;
    label: string;
    icon: React.ReactNode;
    description: string;
    group: 'section' | 'action';
}

const ITERATION_BUTTONS: IterationButton[] = [
    // Section regeneration
    { target: 'hook', label: 'Hook', icon: <Zap className="w-3 h-3" />, description: 'Dikkat çekici açılış', group: 'section' },
    { target: 'body', label: 'Body', icon: <Sparkles className="w-3 h-3" />, description: 'Ana içerik', group: 'section' },
    { target: 'cta', label: 'CTA', icon: <RefreshCw className="w-3 h-3" />, description: 'Çağrı aksiyonu', group: 'section' },
    { target: 'title', label: 'Başlık', icon: <Sparkles className="w-3 h-3" />, description: 'Video başlığı', group: 'section' },
    { target: 'hashtags', label: 'Hashtag', icon: <RefreshCw className="w-3 h-3" />, description: 'Etiketler', group: 'section' },
    // Quick actions
    { target: 'shorten', label: 'Kısalt', icon: <Minus className="w-3 h-3" />, description: '~%20 kısalt', group: 'action' },
    { target: 'lengthen', label: 'Uzat', icon: <Plus className="w-3 h-3" />, description: '~%20 uzat', group: 'action' },
    { target: 'change_tone', label: 'Ton', icon: <Volume2 className="w-3 h-3" />, description: 'Tonu değiştir', group: 'action' },
    { target: 'add_hooks', label: 'Re-Hook', icon: <Zap className="w-3 h-3" />, description: 'Pattern interrupt ekle', group: 'action' },
];

interface IterationPanelProps {
    /** Current script to iterate on */
    script: PlatformScript;
    /** Callback when script is updated */
    onScriptUpdated: (result: IterationResult) => void;
    /** Whether panel is compact */
    compact?: boolean;
}

/**
 * IterationPanel - Script section regeneration controls
 */
export function IterationPanel({
    script,
    onScriptUpdated,
    compact = false,
}: IterationPanelProps) {
    const [expanded, setExpanded] = useState(!compact);
    const [activeTarget, setActiveTarget] = useState<IterationTarget | null>(null);
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [selectedTone, setSelectedTone] = useState<'casual' | 'professional' | 'humorous' | 'dramatic'>('casual');

    const { mutate: iterate, isPending } = useIterateScript();

    const handleIterate = useCallback((target: IterationTarget) => {
        setActiveTarget(target);

        iterate(
            {
                originalScript: script,
                target,
                newTone: target === 'change_tone' ? selectedTone : undefined,
                additionalInstructions: additionalInstructions || undefined,
            },
            {
                onSuccess: (result) => {
                    onScriptUpdated(result);
                    setActiveTarget(null);
                    setAdditionalInstructions('');
                },
                onError: () => {
                    setActiveTarget(null);
                },
            }
        );
    }, [script, iterate, onScriptUpdated, additionalInstructions, selectedTone]);

    const sectionButtons = ITERATION_BUTTONS.filter(b => b.group === 'section');
    const actionButtons = ITERATION_BUTTONS.filter(b => b.group === 'action');

    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
            >
                <RefreshCw className="w-3 h-3" />
                İyileştir
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Script İyileştirme</span>
                {compact && (
                    <button
                        onClick={() => setExpanded(false)}
                        className="text-slate-500 hover:text-slate-400 text-xs"
                    >
                        Gizle
                    </button>
                )}
            </div>

            {/* Section buttons */}
            <div>
                <span className="text-xs text-slate-500 mb-1 block">Bölüm Yenile</span>
                <div className="flex flex-wrap gap-1">
                    {sectionButtons.map((btn) => (
                        <button
                            key={btn.target}
                            onClick={() => handleIterate(btn.target)}
                            disabled={isPending}
                            className={`
                                flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
                                ${activeTarget === btn.target
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-transparent'
                                }
                                ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            title={btn.description}
                        >
                            {activeTarget === btn.target && isPending ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                                btn.icon
                            )}
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div>
                <span className="text-xs text-slate-500 mb-1 block">Hızlı Aksiyonlar</span>
                <div className="flex flex-wrap gap-1">
                    {actionButtons.map((btn) => (
                        <button
                            key={btn.target}
                            onClick={() => handleIterate(btn.target)}
                            disabled={isPending}
                            className={`
                                flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
                                ${activeTarget === btn.target
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-transparent'
                                }
                                ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            title={btn.description}
                        >
                            {activeTarget === btn.target && isPending ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                                btn.icon
                            )}
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tone selector for change_tone */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Ton:</span>
                <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as typeof selectedTone)}
                    className="bg-slate-700 text-slate-300 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-blue-500"
                    disabled={isPending}
                >
                    <option value="casual">Samimi 😊</option>
                    <option value="professional">Profesyonel 💼</option>
                    <option value="humorous">Mizahi 😂</option>
                    <option value="dramatic">Dramatik 🎭</option>
                </select>
            </div>

            {/* Additional instructions */}
            <div>
                <input
                    type="text"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Ek talimatlar (opsiyonel)..."
                    className="w-full bg-slate-700/50 text-slate-300 text-xs rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                    disabled={isPending}
                />
            </div>
        </div>
    );
}

export default IterationPanel;
