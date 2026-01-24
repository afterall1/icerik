/**
 * Prompt Inventory Panel
 * 
 * Displays all AI prompts from knowledge base and embedded sources.
 * This is the most critical panel for project oversight.
 * 
 * @module components/observatory/PromptInventory
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { observatoryApi, type PromptsResponse, type AIPrompt, type EmbeddedPrompt } from '../../lib/observatoryApi';
import { Brain, ChevronDown, ChevronRight, Copy, FileText, Code, Check, Search } from 'lucide-react';

/**
 * Collapsible section component
 */
function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    badge,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string | number;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-indigo-400" />
                    <span className="font-medium text-slate-100">{title}</span>
                    {badge && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * Knowledge prompt card
 */
function PromptCard({ prompt }: { prompt: AIPrompt }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const categoryColors = {
        platform: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        'content-pattern': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        embedded: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${categoryColors[prompt.category]}`}>
                                {prompt.category === 'platform' ? 'Platform' : 'Pattern'}
                            </span>
                            <span className="text-xs text-slate-500">{prompt.wordCount} kelime</span>
                        </div>
                        <h4 className="font-medium text-slate-100">{prompt.name}</h4>
                        <p className="text-sm text-slate-400 mt-1">{prompt.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy();
                            }}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Kopyala"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                    <div className="text-xs text-slate-500 mb-2">
                        Kaynak: <code className="text-indigo-400">{prompt.source}</code>
                    </div>
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-lg max-h-96 overflow-auto">
                        {prompt.content}
                    </pre>
                </div>
            )}
        </div>
    );
}

/**
 * Embedded prompt table
 */
function EmbeddedPromptTable({ prompt }: { prompt: EmbeddedPrompt }) {
    const typeLabels = {
        category: 'Kategori Prompt\'ları',
        tone: 'Ton Talimatları',
        language: 'Dil Talimatları',
        'few-shot': 'Few-Shot Örnekleri',
    };

    const typeColors = {
        category: 'text-cyan-400',
        tone: 'text-amber-400',
        language: 'text-emerald-400',
        'few-shot': 'text-purple-400',
    };

    return (
        <CollapsibleSection
            title={typeLabels[prompt.type]}
            icon={Code}
            badge={prompt.entries.length}
        >
            <div className="space-y-2">
                {prompt.entries.map((entry, index) => (
                    <div
                        key={index}
                        className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-800/50 rounded-lg"
                    >
                        <span className={`font-mono text-sm font-semibold ${typeColors[prompt.type]} min-w-[100px]`}>
                            {entry.key}
                        </span>
                        <span className="text-sm text-slate-300 flex-1">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </CollapsibleSection>
    );
}

/**
 * Prompt Inventory Component
 */
export function PromptInventory() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading, error } = useQuery<PromptsResponse>({
        queryKey: ['observatory', 'prompts'],
        queryFn: () => observatoryApi.getPrompts(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-slate-800/50 animate-pulse" />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                Prompt'lar yüklenemedi: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
            </div>
        );
    }

    // Filter prompts based on search
    const filteredKnowledge = data.knowledgePrompts.filter(
        (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-400" />
                        AI Prompt Envanteri
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {data.summary.totalKnowledgeFiles} knowledge dosyası • {data.summary.totalWords.toLocaleString()} kelime
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Prompt ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Knowledge Base Prompts */}
            <CollapsibleSection
                title="Knowledge Base (Bilgi Tabanı)"
                icon={FileText}
                defaultOpen={true}
                badge={filteredKnowledge.length}
            >
                <div className="space-y-3">
                    {filteredKnowledge.map((prompt) => (
                        <PromptCard key={prompt.id} prompt={prompt} />
                    ))}
                    {filteredKnowledge.length === 0 && (
                        <p className="text-center text-slate-500 py-4">
                            Eşleşen prompt bulunamadı
                        </p>
                    )}
                </div>
            </CollapsibleSection>

            {/* Embedded Prompts */}
            <CollapsibleSection
                title="Kod İçi Prompt'lar"
                icon={Code}
                defaultOpen={false}
                badge={data.embeddedPrompts.length}
            >
                <div className="space-y-3">
                    {data.embeddedPrompts.map((prompt) => (
                        <EmbeddedPromptTable key={prompt.id} prompt={prompt} />
                    ))}
                </div>
            </CollapsibleSection>
        </div>
    );
}
