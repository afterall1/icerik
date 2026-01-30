/**
 * Script Sanitizer
 * 
 * Removes visual directions, editing cues, and annotation brackets
 * from AI-generated script text. This ensures clean spoken content
 * for display and voice generation.
 * 
 * @module ai/scriptSanitizer
 */

/**
 * Aggressive pattern to remove ALL [UPPERCASE...] annotations
 * 
 * Matches:
 * - [ZOOM IN] - Simple uppercase
 * - [TEXT: "DİKKAT!"] - With colon and content
 * - [TRANSITION: Smooth Zoom] - Multi-word value
 * - [RETENTION HOOK: anything] - Multi-word key
 * - [SOUND: GLITCH] - Audio cues
 * - [LOOP START], [LOOP POINT] - Flow markers
 * - [SUBSCRIBE MOMENT] - Engagement cues
 * 
 * Pattern breakdown:
 * - \[ - Opening bracket
 * - [A-ZÇĞİÖŞÜ] - First char must be uppercase (incl. Turkish)
 * - [^\]]* - Any characters until closing bracket
 * - \] - Closing bracket
 */
const BRACKET_ANNOTATION_PATTERN = /\[([A-ZÇĞİÖŞÜ][^\]]*)\]/g;

/**
 * Additional patterns for edge cases
 */
const EMOJI_DIRECTION_PATTERN = /\[([🎬🎥📹🎤🔊🎵🎶💡⚡🔥✨🚀][^\]]*)\]/g;

/**
 * Sanitizes script text by removing all bracket annotations
 * 
 * @param text - Raw script text from AI
 * @returns Clean text with no visual/editing annotations
 * 
 * @example
 * sanitizeScriptText("[ZOOM IN] Hello world") // "Hello world"
 * sanitizeScriptText("Watch this [TEXT: 'DİKKAT!'] now") // "Watch this now"
 * sanitizeScriptText("[TRANSITION: Fade] Next scene") // "Next scene"
 */
export function sanitizeScriptText(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let result = text;

    // Step 1: Remove [UPPERCASE...] patterns
    result = result.replace(BRACKET_ANNOTATION_PATTERN, '');

    // Step 2: Remove emoji-based directions (rare but possible)
    result = result.replace(EMOJI_DIRECTION_PATTERN, '');

    // Step 3: Clean up spacing artifacts
    result = result
        // Multiple spaces to single
        .replace(/\s{2,}/g, ' ')
        // Space before punctuation
        .replace(/\s+([.,!?;:'"»])/g, '$1')
        // Multiple newlines to double
        .replace(/\n{3,}/g, '\n\n')
        // Trim each line
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // Final trim
        .trim();

    return result;
}

/**
 * Checks if text contains bracket annotations
 * 
 * @param text - Text to check
 * @returns true if annotations are present
 */
export function hasBracketAnnotations(text: string): boolean {
    if (!text || typeof text !== 'string') {
        return false;
    }

    // Reset pattern state
    BRACKET_ANNOTATION_PATTERN.lastIndex = 0;
    return BRACKET_ANNOTATION_PATTERN.test(text);
}

/**
 * Extracts all bracket annotations from text
 * Useful for debugging or logging
 * 
 * @param text - Text to analyze
 * @returns Array of found annotations
 */
export function extractBracketAnnotations(text: string): string[] {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const annotations: string[] = [];

    // Reset pattern state
    BRACKET_ANNOTATION_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = BRACKET_ANNOTATION_PATTERN.exec(text)) !== null) {
        annotations.push(match[0]);
    }

    return annotations;
}
