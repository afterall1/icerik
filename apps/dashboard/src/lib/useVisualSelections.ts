/**
 * useVisualSelections Hook
 * 
 * Manages visual selections for script sections using IndexedDB.
 * Allows users to select 1-2 visuals per section (hook, body, cta)
 * for future Reels composition.
 * 
 * @module lib/hooks/useVisualSelections
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ValidatedImage } from './useVisualSearch';
import {
    type SelectedVisual,
    type ScriptVisualSelections,
    type SelectableSectionType,
    MAX_VISUALS_PER_SECTION,
    createEmptySelections,
    getNextOrder,
} from './selectedVisualsTypes';

const DB_NAME = 'icerik_visual_selections';
const STORE_NAME = 'selections';
const DB_VERSION = 1;

/**
 * Hook return type
 */
interface UseVisualSelectionsReturn {
    /** Current selections for the script */
    selections: ScriptVisualSelections | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: string | null;
    /** Add a visual to a section (max 2 per section) */
    addSelection: (sectionType: SelectableSectionType, image: ValidatedImage) => Promise<boolean>;
    /** Remove a visual from a section */
    removeSelection: (sectionType: SelectableSectionType, imageId: string) => Promise<void>;
    /** Check if an image is selected in a section */
    isSelected: (sectionType: SelectableSectionType, imageId: string) => boolean;
    /** Get selection order for an image (1 or 2), or 0 if not selected */
    getSelectionOrder: (sectionType: SelectableSectionType, imageId: string) => number;
    /** Check if a section is full (2 visuals) */
    isSectionFull: (sectionType: SelectableSectionType) => boolean;
    /** Clear all selections for the script */
    clearAllSelections: () => Promise<void>;
    /** Get total selection count across all sections */
    getTotalCount: () => number;
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
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'scriptId' });
                store.createIndex('platform', 'platform', { unique: false });
                store.createIndex('trendId', 'trendId', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

/**
 * Hook for managing visual selections for a specific script
 * 
 * @param scriptId - Unique script identifier
 * @param platform - Platform the script is for
 * @param trendId - Trend ID the script was generated from
 * @param scriptTitle - Script title for reference
 * 
 * @example
 * const { selections, addSelection, isSelected } = useVisualSelections(
 *     scriptId,
 *     'tiktok',
 *     trend.id,
 *     script.title
 * );
 */
export function useVisualSelections(
    scriptId: string | null,
    platform: 'tiktok' | 'reels' | 'shorts' = 'tiktok',
    trendId: string = '',
    scriptTitle: string = ''
): UseVisualSelectionsReturn {
    const [selections, setSelections] = useState<ScriptVisualSelections | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dbRef = useRef<IDBDatabase | null>(null);

    // Load selections on mount or when scriptId changes
    useEffect(() => {
        if (!scriptId) {
            setSelections(null);
            setIsLoading(false);
            return;
        }

        async function loadSelections() {
            setIsLoading(true);
            setError(null);

            try {
                const db = await openDB();
                dbRef.current = db;

                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                // scriptId is guaranteed to be non-null due to early return above
                const safeScriptId = scriptId as string;
                const request = store.get(safeScriptId);

                request.onsuccess = () => {
                    if (request.result) {
                        setSelections(request.result);
                    } else {
                        // Create empty selections for new script
                        setSelections(createEmptySelections(safeScriptId, platform, trendId, scriptTitle));
                    }
                    setIsLoading(false);
                };

                request.onerror = () => {
                    console.error('Failed to load selections:', request.error);
                    setError('Failed to load selections');
                    setIsLoading(false);
                };
            } catch (err) {
                console.error('Failed to open selections DB:', err);
                setError('Failed to open database');
                setIsLoading(false);
            }
        }

        loadSelections();

        return () => {
            // Cleanup database connection on unmount
            if (dbRef.current) {
                dbRef.current.close();
                dbRef.current = null;
            }
        };
    }, [scriptId, platform, trendId, scriptTitle]);

    // Persist selections to IndexedDB
    const persistSelections = useCallback(async (newSelections: ScriptVisualSelections): Promise<void> => {
        try {
            const db = dbRef.current || await openDB();
            if (!dbRef.current) dbRef.current = db;

            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const updated = {
                ...newSelections,
                updatedAt: new Date().toISOString(),
            };

            store.put(updated);
            setSelections(updated);
        } catch (err) {
            console.error('Failed to persist selections:', err);
            throw new Error('Failed to save selection');
        }
    }, []);

    // Add a visual to a section
    const addSelection = useCallback(async (
        sectionType: SelectableSectionType,
        image: ValidatedImage
    ): Promise<boolean> => {
        if (!selections || !scriptId) {
            console.warn('Cannot add selection: no active script');
            return false;
        }

        const sectionSelections = selections.selections[sectionType];

        // Check if already at max
        if (sectionSelections.length >= MAX_VISUALS_PER_SECTION) {
            console.warn(`Section ${sectionType} is full (max ${MAX_VISUALS_PER_SECTION})`);
            return false;
        }

        // Check if already selected
        if (sectionSelections.some(s => s.imageId === image.id)) {
            console.warn('Image already selected in this section');
            return false;
        }

        const newSelection: SelectedVisual = {
            id: `${scriptId}_${sectionType}_${image.id}`,
            imageId: image.id,
            scriptId,
            sectionType,
            order: getNextOrder(sectionSelections),
            image,
            addedAt: new Date().toISOString(),
        };

        const newSelections: ScriptVisualSelections = {
            ...selections,
            selections: {
                ...selections.selections,
                [sectionType]: [...sectionSelections, newSelection],
            },
        };

        await persistSelections(newSelections);
        return true;
    }, [selections, scriptId, persistSelections]);

    // Remove a visual from a section
    const removeSelection = useCallback(async (
        sectionType: SelectableSectionType,
        imageId: string
    ): Promise<void> => {
        if (!selections) return;

        const sectionSelections = selections.selections[sectionType];
        const filtered = sectionSelections.filter(s => s.imageId !== imageId);

        // Reorder remaining selections
        const reordered = filtered.map((s, i) => ({ ...s, order: i + 1 }));

        const newSelections: ScriptVisualSelections = {
            ...selections,
            selections: {
                ...selections.selections,
                [sectionType]: reordered,
            },
        };

        await persistSelections(newSelections);
    }, [selections, persistSelections]);

    // Check if an image is selected in a section
    const isSelected = useCallback((
        sectionType: SelectableSectionType,
        imageId: string
    ): boolean => {
        if (!selections) return false;
        return selections.selections[sectionType].some(s => s.imageId === imageId);
    }, [selections]);

    // Get selection order for an image
    const getSelectionOrder = useCallback((
        sectionType: SelectableSectionType,
        imageId: string
    ): number => {
        if (!selections) return 0;
        const selection = selections.selections[sectionType].find(s => s.imageId === imageId);
        return selection?.order ?? 0;
    }, [selections]);

    // Check if a section is full
    const isSectionFull = useCallback((sectionType: SelectableSectionType): boolean => {
        if (!selections) return false;
        return selections.selections[sectionType].length >= MAX_VISUALS_PER_SECTION;
    }, [selections]);

    // Clear all selections for the script
    const clearAllSelections = useCallback(async (): Promise<void> => {
        if (!selections || !scriptId) return;

        const newSelections: ScriptVisualSelections = {
            ...selections,
            selections: {
                hook: [],
                body: [],
                cta: [],
            },
        };

        await persistSelections(newSelections);
    }, [selections, scriptId, persistSelections]);

    // Get total selection count
    const getTotalCount = useCallback((): number => {
        if (!selections) return 0;
        return (
            selections.selections.hook.length +
            selections.selections.body.length +
            selections.selections.cta.length
        );
    }, [selections]);

    return {
        selections,
        isLoading,
        error,
        addSelection,
        removeSelection,
        isSelected,
        getSelectionOrder,
        isSectionFull,
        clearAllSelections,
        getTotalCount,
    };
}

export type { UseVisualSelectionsReturn };
