/**
 * Selected Visuals Types
 * 
 * Types for the visual selection system that allows users
 * to select 1-2 visuals per script section for future Reels composition.
 * 
 * @module lib/selectedVisualsTypes
 */

import type { ValidatedImage } from './useVisualSearch';

/**
 * Section types that can have visual selections
 */
export type SelectableSectionType = 'hook' | 'body' | 'cta';

/**
 * Maximum visuals allowed per section
 */
export const MAX_VISUALS_PER_SECTION = 2;

/**
 * A single selected visual with metadata
 */
export interface SelectedVisual {
    /** Unique selection ID */
    id: string;
    /** Original image ID from Pexels */
    imageId: string;
    /** Script identifier this selection belongs to */
    scriptId: string;
    /** Section type (hook, body, cta) */
    sectionType: SelectableSectionType;
    /** Order within section (1 or 2) */
    order: number;
    /** Full image data */
    image: ValidatedImage;
    /** When this selection was added */
    addedAt: string;
}

/**
 * All visual selections for a single script
 */
export interface ScriptVisualSelections {
    /** Unique script identifier */
    scriptId: string;
    /** Platform the script is for */
    platform: 'tiktok' | 'reels' | 'shorts';
    /** Trend ID the script was generated from */
    trendId: string;
    /** Script title for reference */
    scriptTitle: string;
    /** Selections per section */
    selections: {
        hook: SelectedVisual[];
        body: SelectedVisual[];
        cta: SelectedVisual[];
    };
    /** When selections were first created */
    createdAt: string;
    /** When selections were last updated */
    updatedAt: string;
}

/**
 * Generate a unique script ID from script metadata
 */
export function generateScriptId(
    trendId: string,
    platform: 'tiktok' | 'reels' | 'shorts',
    generatedAt: string
): string {
    // Create a deterministic ID from the script's unique properties
    return `${platform}_${trendId}_${new Date(generatedAt).getTime()}`;
}

/**
 * Create an empty selections object for a script
 */
export function createEmptySelections(
    scriptId: string,
    platform: 'tiktok' | 'reels' | 'shorts',
    trendId: string,
    scriptTitle: string
): ScriptVisualSelections {
    const now = new Date().toISOString();
    return {
        scriptId,
        platform,
        trendId,
        scriptTitle,
        selections: {
            hook: [],
            body: [],
            cta: [],
        },
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Check if a section has reached its maximum visual limit
 */
export function isSectionFull(selections: SelectedVisual[]): boolean {
    return selections.length >= MAX_VISUALS_PER_SECTION;
}

/**
 * Get the next order number for a section
 */
export function getNextOrder(selections: SelectedVisual[]): number {
    if (selections.length === 0) return 1;
    return Math.max(...selections.map(s => s.order)) + 1;
}
