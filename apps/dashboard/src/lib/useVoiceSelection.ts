/**
 * useVoiceSelection Hook
 * 
 * Manages voice selection and persistence using IndexedDB.
 * Stores primary voice and alternative voices for consistent
 * channel voice across all generated content.
 * 
 * @module lib/hooks/useVoiceSelection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    Voice,
    VoiceConfig,
    VoiceSelectionState,
    VoiceSettings,
} from './voiceTypes';
import {
    createEmptyVoiceSelectionState,
    createVoiceConfig,
    DEFAULT_VOICE_SETTINGS,
} from './voiceTypes';

const DB_NAME = 'icerik_voice_selection';
const STORE_NAME = 'voice_config';
const DB_VERSION = 1;
const CONFIG_KEY = 'main';
const CHANNEL_NAME = 'icerik_voice_selection_sync';

/**
 * Hook return type
 */
export interface UseVoiceSelectionReturn {
    /** Current voice selection state */
    state: VoiceSelectionState | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: string | null;
    /** Get primary voice */
    primaryVoice: VoiceConfig | null;
    /** Check if primary voice is set */
    hasPrimaryVoice: boolean;
    /** Set primary voice */
    setPrimaryVoice: (voice: Voice, settings?: Partial<VoiceSettings>) => Promise<void>;
    /** Add alternative voice */
    addAlternativeVoice: (voice: Voice, settings?: Partial<VoiceSettings>) => Promise<void>;
    /** Remove alternative voice */
    removeAlternativeVoice: (voiceId: string) => Promise<void>;
    /** Update voice settings */
    updateVoiceSettings: (voiceId: string, settings: Partial<VoiceSettings>) => Promise<void>;
    /** Clear all voice selections */
    clearAll: () => Promise<void>;
    /** Get all configured voices */
    getAllVoices: () => VoiceConfig[];
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Hook for managing voice selection persistence
 */
export function useVoiceSelection(): UseVoiceSelectionReturn {
    const [state, setState] = useState<VoiceSelectionState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dbRef = useRef<IDBDatabase | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Helper to reload state from IndexedDB (used for cross-instance sync)
    const reloadStateFromDB = useCallback(async () => {
        try {
            const db = dbRef.current || await openDB();
            if (!dbRef.current) dbRef.current = db;

            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(CONFIG_KEY);

            request.onsuccess = () => {
                if (request.result) {
                    setState(request.result.data);
                } else {
                    setState(createEmptyVoiceSelectionState());
                }
            };

            request.onerror = () => {
                console.error('Failed to reload voice selection:', request.error);
            };
        } catch (err) {
            console.error('Failed to reload voice selection from DB:', err);
        }
    }, []);

    // Load state on mount and setup BroadcastChannel for cross-instance sync
    useEffect(() => {
        async function loadState() {
            setIsLoading(true);
            setError(null);

            try {
                const db = await openDB();
                dbRef.current = db;

                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(CONFIG_KEY);

                request.onsuccess = () => {
                    if (request.result) {
                        setState(request.result.data);
                    } else {
                        setState(createEmptyVoiceSelectionState());
                    }
                    setIsLoading(false);
                };

                request.onerror = () => {
                    console.error('Failed to load voice selection:', request.error);
                    setError('Failed to load voice settings');
                    setState(createEmptyVoiceSelectionState());
                    setIsLoading(false);
                };
            } catch (err) {
                console.error('Failed to open voice selection DB:', err);
                setError('Failed to open database');
                setState(createEmptyVoiceSelectionState());
                setIsLoading(false);
            }
        }

        // Initialize BroadcastChannel for cross-instance sync
        try {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);
            channelRef.current.onmessage = (event) => {
                if (event.data?.type === 'VOICE_SELECTION_UPDATED') {
                    // Another instance updated voice selection, reload from DB
                    reloadStateFromDB();
                }
            };
        } catch (err) {
            // BroadcastChannel not supported (shouldn't happen in modern browsers)
            console.warn('BroadcastChannel not supported:', err);
        }

        loadState();

        return () => {
            if (dbRef.current) {
                dbRef.current.close();
                dbRef.current = null;
            }
            if (channelRef.current) {
                channelRef.current.close();
                channelRef.current = null;
            }
        };
    }, [reloadStateFromDB]);

    // Persist state to IndexedDB
    const persistState = useCallback(async (newState: VoiceSelectionState): Promise<void> => {
        try {
            const db = dbRef.current || await openDB();
            if (!dbRef.current) dbRef.current = db;

            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record = {
                id: CONFIG_KEY,
                data: {
                    ...newState,
                    lastUsedAt: new Date().toISOString(),
                },
            };

            store.put(record);
            setState(record.data);

            // Broadcast to other instances that voice selection changed
            try {
                channelRef.current?.postMessage({
                    type: 'VOICE_SELECTION_UPDATED',
                    timestamp: Date.now(),
                });
            } catch (broadcastErr) {
                // Non-critical: sync will still work on next load
                console.warn('Failed to broadcast voice update:', broadcastErr);
            }
        } catch (err) {
            console.error('Failed to persist voice selection:', err);
            throw new Error('Failed to save voice settings');
        }
    }, []);

    // Set primary voice
    const setPrimaryVoice = useCallback(async (
        voice: Voice,
        settings?: Partial<VoiceSettings>
    ): Promise<void> => {
        if (!state) return;

        const config = createVoiceConfig(voice, settings, true);

        // If there was a previous primary, move it to alternatives
        let alternatives = [...state.alternativeVoices];
        if (state.primaryVoice) {
            const oldPrimary = { ...state.primaryVoice, isPrimary: false };
            // Only add if not already in alternatives
            if (!alternatives.some(v => v.voiceId === oldPrimary.voiceId)) {
                alternatives = [oldPrimary, ...alternatives].slice(0, 5); // Keep max 5 alternatives
            }
        }

        // Remove new primary from alternatives if it was there
        alternatives = alternatives.filter(v => v.voiceId !== voice.id);

        await persistState({
            ...state,
            primaryVoice: config,
            alternativeVoices: alternatives,
        });
    }, [state, persistState]);

    // Add alternative voice
    const addAlternativeVoice = useCallback(async (
        voice: Voice,
        settings?: Partial<VoiceSettings>
    ): Promise<void> => {
        if (!state) return;

        // Don't add if it's the primary voice
        if (state.primaryVoice?.voiceId === voice.id) return;

        // Don't add duplicates
        if (state.alternativeVoices.some(v => v.voiceId === voice.id)) return;

        const config = createVoiceConfig(voice, settings, false);
        const alternatives = [config, ...state.alternativeVoices].slice(0, 5);

        await persistState({
            ...state,
            alternativeVoices: alternatives,
        });
    }, [state, persistState]);

    // Remove alternative voice
    const removeAlternativeVoice = useCallback(async (voiceId: string): Promise<void> => {
        if (!state) return;

        await persistState({
            ...state,
            alternativeVoices: state.alternativeVoices.filter(v => v.voiceId !== voiceId),
        });
    }, [state, persistState]);

    // Update voice settings
    const updateVoiceSettings = useCallback(async (
        voiceId: string,
        settings: Partial<VoiceSettings>
    ): Promise<void> => {
        if (!state) return;

        let updated = false;
        let newState = { ...state };

        // Check primary voice
        if (state.primaryVoice?.voiceId === voiceId) {
            newState.primaryVoice = {
                ...state.primaryVoice,
                settings: { ...state.primaryVoice.settings, ...settings },
            };
            updated = true;
        }

        // Check alternatives
        const altIndex = state.alternativeVoices.findIndex(v => v.voiceId === voiceId);
        if (altIndex !== -1) {
            const alternatives = [...state.alternativeVoices];
            alternatives[altIndex] = {
                ...alternatives[altIndex],
                settings: { ...alternatives[altIndex].settings, ...settings },
            };
            newState.alternativeVoices = alternatives;
            updated = true;
        }

        if (updated) {
            await persistState(newState);
        }
    }, [state, persistState]);

    // Clear all voice selections
    const clearAll = useCallback(async (): Promise<void> => {
        await persistState(createEmptyVoiceSelectionState());
    }, [persistState]);

    // Get all configured voices (primary + alternatives)
    const getAllVoices = useCallback((): VoiceConfig[] => {
        if (!state) return [];
        const all: VoiceConfig[] = [];
        if (state.primaryVoice) all.push(state.primaryVoice);
        all.push(...state.alternativeVoices);
        return all;
    }, [state]);

    return {
        state,
        isLoading,
        error,
        primaryVoice: state?.primaryVoice || null,
        hasPrimaryVoice: Boolean(state?.primaryVoice),
        setPrimaryVoice,
        addAlternativeVoice,
        removeAlternativeVoice,
        updateVoiceSettings,
        clearAll,
        getAllVoices,
    };
}

export type { VoiceConfig, VoiceSelectionState };
