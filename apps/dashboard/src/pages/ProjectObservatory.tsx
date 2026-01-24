/**
 * Project Observatory Page
 * 
 * Visual governance dashboard for non-technical project oversight.
 * Provides complete visibility into AI prompts, architecture, APIs, and health.
 * 
 * @module pages/ProjectObservatory
 */

import { useState } from 'react';
import { Telescope, Activity, Brain, Network, Globe, Flag, Heart, ChevronLeft } from 'lucide-react';
import { OverviewPanel, PromptInventory, ArchitectureMap, ApiCatalog, FeatureStatus, HealthMetrics } from '../components/observatory';

/**
 * Tab configuration
 */
const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: Activity, color: 'text-indigo-400' },
    { id: 'prompts', label: 'AI Prompt\'lar', icon: Brain, color: 'text-purple-400' },
    { id: 'architecture', label: 'Mimari', icon: Network, color: 'text-cyan-400' },
    { id: 'api', label: 'API Kataloğu', icon: Globe, color: 'text-amber-400' },
    { id: 'features', label: 'Feature Status', icon: Flag, color: 'text-emerald-400' },
    { id: 'health', label: 'Sistem Sağlığı', icon: Heart, color: 'text-rose-400' },
] as const;

type TabId = typeof tabs[number]['id'];

/**
 * Tab button component
 */
function TabButton({
    tab,
    isActive,
    onClick,
}: {
    tab: typeof tabs[number];
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = tab.icon;

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                ${isActive
                    ? 'bg-slate-800 border border-slate-700 shadow-lg'
                    : 'hover:bg-slate-800/50'
                }
            `}
        >
            <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
            <span className={`text-sm ${isActive ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>
                {tab.label}
            </span>
        </button>
    );
}

/**
 * Project Observatory Component
 */
export function ProjectObservatory() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const handleBack = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-100"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                    <Telescope className="w-7 h-7 text-indigo-400" />
                                    Project Observatory
                                </h1>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    Proje Gözlem Merkezi • Kod bilmeden tam hakimiyet
                                </p>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Canlı
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab navigation */}
            <nav className="border-b border-slate-800 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <TabButton
                                key={tab.id}
                                tab={tab}
                                isActive={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            />
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'overview' && <OverviewPanel />}
                {activeTab === 'prompts' && <PromptInventory />}
                {activeTab === 'architecture' && <ArchitectureMap />}
                {activeTab === 'api' && <ApiCatalog />}
                {activeTab === 'features' && <FeatureStatus />}
                {activeTab === 'health' && <HealthMetrics />}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                        <div>
                            İçerik Trend Engine v1.14.0 • Project Observatory
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Phase 19</span>
                            <span>•</span>
                            <span>24 Ocak 2026</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
