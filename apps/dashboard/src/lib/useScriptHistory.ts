/**
 * useScriptHistory Hook
 *
 * Manages script generation history using IndexedDB.
 * Stores full scripts with metadata for later reference.
 *
 * @module lib/hooks/useScriptHistory
 */

import { useState, useCallback, useEffect } from 'react';
import type { PlatformScript, TrendData, Platform } from './api';

const DB_NAME = 'icerik_history';
const STORE_NAME = 'scripts';
const DB_VERSION = 1;
const MAX_HISTORY = 50;

/**
 * Script history entry
 */
export interface ScriptHistoryEntry {
    id: string;
    trendId: string;
    trendTitle: string;
    platform: Platform;
    script: PlatformScript;
    createdAt: string;
}

/**
 * Hook return type
 */
interface UseScriptHistoryReturn {
    /** List of script history entries */
    history: ScriptHistoryEntry[];
    /** Add a script to history */
    addToHistory: (trend: TrendData, script: PlatformScript) => void;
    /** Remove an entry from history */
    removeFromHistory: (id: string) => void;
    /** Clear all history */
    clearHistory: () => void;
    /** Get history by trend */
    getByTrend: (trendId: string) => ScriptHistoryEntry[];
    /** Loading state */
    isLoading: boolean;
    /** Number of entries */
    count: number;
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
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('trendId', 'trendId', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

/**
 * Custom hook for managing script generation history
 *
 * @example
 * const { history, addToHistory, isLoading } = useScriptHistory();
 * addToHistory(trend, generatedScript);
 */
export function useScriptHistory(): UseScriptHistoryReturn {
    const [history, setHistory] = useState<ScriptHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load history from IndexedDB on mount
    useEffect(() => {
        async function loadHistory() {
            try {
                const db = await openDB();
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const index = store.index('createdAt');
                const request = index.openCursor(null, 'prev');

                const entries: ScriptHistoryEntry[] = [];

                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor && entries.length < MAX_HISTORY) {
                        entries.push(cursor.value);
                        cursor.continue();
                    } else {
                        setHistory(entries);
                        setIsLoading(false);
                    }
                };

                request.onerror = () => {
                    console.error('Failed to load history:', request.error);
                    setIsLoading(false);
                };
            } catch (error) {
                console.error('Failed to open history DB:', error);
                setIsLoading(false);
            }
        }

        loadHistory();
    }, []);

    // Add a script to history
    const addToHistory = useCallback(
        async (trend: TrendData, script: PlatformScript): Promise<void> => {
            try {
                const entry: ScriptHistoryEntry = {
                    id: `${trend.id}_${script.platform}_${Date.now()}`,
                    trendId: trend.id,
                    trendTitle: trend.title,
                    platform: script.platform,
                    script,
                    createdAt: new Date().toISOString(),
                };

                const db = await openDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.add(entry);

                // Update local state
                setHistory((prev) => {
                    const updated = [entry, ...prev];
                    if (updated.length > MAX_HISTORY) {
                        // Remove oldest in DB
                        const toRemove = updated.slice(MAX_HISTORY);
                        toRemove.forEach((e) => store.delete(e.id));
                        return updated.slice(0, MAX_HISTORY);
                    }
                    return updated;
                });
            } catch (error) {
                console.error('Failed to add to history:', error);
            }
        },
        []
    );

    // Remove an entry from history
    const removeFromHistory = useCallback(async (id: string): Promise<void> => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);

            setHistory((prev) => prev.filter((e) => e.id !== id));
        } catch (error) {
            console.error('Failed to remove from history:', error);
        }
    }, []);

    // Clear all history
    const clearHistory = useCallback(async (): Promise<void> => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();

            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    }, []);

    // Get history by trend
    const getByTrend = useCallback(
        (trendId: string): ScriptHistoryEntry[] => {
            return history.filter((e) => e.trendId === trendId);
        },
        [history]
    );

    return {
        history,
        addToHistory,
        removeFromHistory,
        clearHistory,
        getByTrend,
        isLoading,
        count: history.length,
    };
}

export type { UseScriptHistoryReturn };
