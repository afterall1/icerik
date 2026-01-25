/**
 * VoiceSelectionModal Component
 * 
 * Modal for selecting and managing TTS voices.
 * Displays available voices from configured providers
 * with preview and selection functionality.
 * 
 * @module components/organisms/VoiceSelectionModal
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { VoicePreviewCard } from '../molecules/VoicePreviewCard';
import type { Voice, VoiceProvider, VoiceListResponse } from '../../lib/voiceTypes';
import { useVoiceSelection } from '../../lib/useVoiceSelection';

const API_BASE = '/api';

interface VoiceSelectionModalProps {
    /** Whether modal is open */
    isOpen: boolean;
    /** Callback to close modal */
    onClose: () => void;
    /** Callback when a voice is selected as primary */
    onVoiceSelected?: (voice: Voice) => void;
    /** Title override */
    title?: string;
}

export function VoiceSelectionModal({
    isOpen,
    onClose,
    onVoiceSelected,
    title = 'Ses Seçimi',
}: VoiceSelectionModalProps) {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | 'all'>('all');

    const {
        primaryVoice,
        setPrimaryVoice,
        addAlternativeVoice,
        getAllVoices,
    } = useVoiceSelection();

    // Fetch voices on mount
    useEffect(() => {
        if (!isOpen) return;

        async function fetchVoices() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${API_BASE}/voice/list`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to fetch voices');
                }

                const data = await response.json();

                if (data.success && data.data?.voices) {
                    setVoices(data.data.voices);
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(message);
                console.error('Failed to fetch voices:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchVoices();
    }, [isOpen]);

    // Filter voices
    const filteredVoices = voices.filter(voice => {
        const matchesSearch = searchQuery.trim() === '' ||
            voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            voice.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesProvider = selectedProvider === 'all' || voice.provider === selectedProvider;

        return matchesSearch && matchesProvider;
    });

    // Handle voice selection
    const handleSelectVoice = useCallback(async (voice: Voice) => {
        await setPrimaryVoice(voice);
        if (onVoiceSelected) {
            onVoiceSelected(voice);
        }
        onClose();
    }, [setPrimaryVoice, onVoiceSelected, onClose]);

    // Handle set as primary
    const handleSetPrimary = useCallback(async (voice: Voice) => {
        await setPrimaryVoice(voice);
        if (onVoiceSelected) {
            onVoiceSelected(voice);
        }
    }, [setPrimaryVoice, onVoiceSelected]);

    // Check if voice is primary
    const isPrimaryVoice = useCallback((voiceId: string): boolean => {
        return primaryVoice?.voiceId === voiceId;
    }, [primaryVoice]);

    // Check if voice is in alternatives
    const isAlternativeVoice = useCallback((voiceId: string): boolean => {
        const all = getAllVoices();
        return all.some(v => v.voiceId === voiceId && !v.isPrimary);
    }, [getAllVoices]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-600/20">
                            <Volume2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Current Primary Voice */}
                {primaryVoice && (
                    <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Ana Ses:</span>
                            <span className="text-sm font-medium text-amber-400">
                                {primaryVoice.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${primaryVoice.provider === 'elevenlabs'
                                ? 'bg-purple-900/50 text-purple-300'
                                : 'bg-cyan-900/50 text-cyan-300'
                                }`}>
                                {primaryVoice.provider === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ses ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Provider Filter */}
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setSelectedProvider('all')}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${selectedProvider === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setSelectedProvider('elevenlabs')}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${selectedProvider === 'elevenlabs'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                ElevenLabs
                            </button>
                            <button
                                onClick={() => setSelectedProvider('fishaudio')}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${selectedProvider === 'fishaudio'
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Fish Audio
                            </button>
                        </div>
                    </div>
                </div>

                {/* Voice List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                            <p className="text-slate-400 text-sm">Sesler yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
                            <p className="text-red-400 text-sm mb-2">Sesler yüklenemedi</p>
                            <p className="text-slate-500 text-xs">{error}</p>
                            <p className="text-slate-500 text-xs mt-4">
                                TTS API anahtarlarını (.env) kontrol edin
                            </p>
                        </div>
                    ) : filteredVoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Volume2 className="w-8 h-8 text-slate-500 mb-4" />
                            <p className="text-slate-400 text-sm">
                                {searchQuery ? 'Aramayla eşleşen ses bulunamadı' : 'Kullanılabilir ses yok'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredVoices.map(voice => (
                                <VoicePreviewCard
                                    key={`${voice.provider}-${voice.id}`}
                                    voice={voice}
                                    isSelected={isPrimaryVoice(voice.id) || isAlternativeVoice(voice.id)}
                                    isPrimary={isPrimaryVoice(voice.id)}
                                    onSelect={handleSelectVoice}
                                    onSetPrimary={handleSetPrimary}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                            {filteredVoices.length} ses mevcut
                        </span>
                        <span>
                            Seçilen ses tüm scriptlerde kullanılacak
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
