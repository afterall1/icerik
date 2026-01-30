/**
 * Text Sanitizer for TTS
 * 
 * Removes visual directions and editing cues from script text
 * before sending to TTS API. This ensures only spoken content
 * is processed by the voice generation system.
 * 
 * @module lib/textSanitizer
 */

/**
 * AGGRESSIVE pattern to remove ALL [UPPERCASE...] annotations
 * 
 * Matches ANY text in brackets that starts with uppercase letter:
 * - [ZOOM IN] - Simple
 * - [TEXT: "DİKKAT!"] - With colon and content
 * - [TRANSITION: Smooth Zoom] - Multi-word
 * - [RETENTION HOOK: anything] - Complex
 * - [SEARCH KEYWORD: dijital gizlilik] - SEO cues
 * - [SUBSCRIBE MOMENT] - Engagement markers
 * 
 * Pattern breakdown:
 * - \[ - Opening bracket
 * - [A-ZÇĞİÖŞÜ] - First char uppercase (incl. Turkish)
 * - [^\]]* - Any chars until closing bracket
 * - \] - Closing bracket
 */
const AGGRESSIVE_BRACKET_PATTERN = /\[([A-ZÇĞİÖŞÜ][^\]]*)\]/g;

/**
 * Patterns that represent timing/pause cues - converted to ellipsis
 */
const PAUSE_PATTERN = /\[(PAUSE|BEAT|WAIT)\]/gi;

/**
 * Sanitizes script text for TTS by removing visual directions
 * 
 * @param text - Raw script text with potential visual directions
 * @returns Clean text ready for TTS with only spoken content
 * 
 * @example
 * sanitizeForTTS("Hello [ZOOM IN] world!") // "Hello world!"
 * sanitizeForTTS("[B-ROLL: cafe] Morning scene") // "Morning scene"
 * sanitizeForTTS("First point [PAUSE] second point") // "First point ... second point"
 * sanitizeForTTS("[TEXT: 'DİKKAT!'] Important") // "Important"
 */
export function sanitizeForTTS(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let result = text;

    // Step 1: Replace pause indicators with ellipsis (natural pause in speech)
    result = result.replace(PAUSE_PATTERN, '...');

    // Step 2: Remove ALL [UPPERCASE...] bracket patterns
    result = result.replace(AGGRESSIVE_BRACKET_PATTERN, '');

    // Step 3: Clean up spacing issues
    result = result
        // Multiple spaces to single space
        .replace(/\s{2,}/g, ' ')
        // Space before punctuation
        .replace(/\s+([.,!?;:'"»])/g, '$1')
        // Multiple dots to ellipsis
        .replace(/\.{4,}/g, '...')
        // Trim each line
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // Remove empty lines
        .replace(/\n{3,}/g, '\n\n')
        // Final trim
        .trim();

    return result;
}

/**
 * Checks if text contains visual directions that would be sanitized
 * Useful for showing warnings to users
 * 
 * @param text - Text to check
 * @returns true if text contains visual directions
 */
export function hasVisualDirections(text: string): boolean {
    if (!text || typeof text !== 'string') {
        return false;
    }

    // Reset pattern state before testing
    AGGRESSIVE_BRACKET_PATTERN.lastIndex = 0;
    return AGGRESSIVE_BRACKET_PATTERN.test(text);
}

/**
 * Extracts visual directions from text
 * Useful for debugging or showing what will be removed
 * 
 * @param text - Text to analyze
 * @returns Array of found visual directions
 */
export function extractVisualDirections(text: string): string[] {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const directions: string[] = [];

    // Reset regex state
    AGGRESSIVE_BRACKET_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = AGGRESSIVE_BRACKET_PATTERN.exec(text)) !== null) {
        directions.push(match[0]);
    }

    return directions;
}
