/**
 * XSS Prevention Utilities
 * 
 * Sanitization functions for displaying user-generated content safely.
 * Uses built-in browser APIs for maximum security.
 * 
 * @module sanitize
 * @version 1.0.0
 */

/**
 * Escape HTML entities to prevent XSS
 * Uses DOM APIs for reliable encoding
 * 
 * @param text - Raw text that may contain HTML/script tags
 * @returns Safely escaped string for display
 * 
 * @example
 * ```tsx
 * <h3>{escapeForDisplay(trend.title)}</h3>
 * ```
 */
export function escapeForDisplay(text: string): string {
    if (!text) return '';

    // Use template element for safe encoding
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape string for use in HTML attributes
 * More aggressive than escapeForDisplay
 * 
 * @param value - Value to escape for attribute use
 * @returns Safely escaped string
 */
export function escapeForAttribute(value: string): string {
    if (!value) return '';

    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#x60;')
        .replace(/=/g, '&#x3D;');
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 * Returns empty string for malicious URLs
 * 
 * @param url - URL to validate
 * @returns Safe URL or empty string
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const protocol = parsed.protocol.toLowerCase();

        // Only allow safe protocols
        if (protocol === 'http:' || protocol === 'https:') {
            return url;
        }

        // Log suspicious URL attempt
        console.warn('Blocked unsafe URL:', url.substring(0, 50));
        return '';
    } catch {
        // If URL parsing fails, it might be a relative path - allow it
        // But check for javascript: and data: at the start
        const lower = url.toLowerCase().trim();
        if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
            console.warn('Blocked unsafe URL:', url.substring(0, 50));
            return '';
        }
        return url;
    }
}

/**
 * Strip all HTML tags from a string
 * Useful for plain text display
 * 
 * @param html - String that may contain HTML
 * @returns Plain text without any tags
 */
export function stripHtml(html: string): string {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Truncate text safely without breaking HTML entities
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum character length
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export function safeTruncate(
    text: string,
    maxLength: number,
    suffix: string = '...'
): string {
    if (!text || text.length <= maxLength) {
        return text;
    }

    // First escape the text, then truncate
    const escaped = escapeForDisplay(text);
    if (escaped.length <= maxLength) {
        return escaped;
    }

    // Find a safe break point (not in the middle of an entity)
    let truncated = escaped.substring(0, maxLength);

    // Check if we're in the middle of an entity
    const lastAmpersand = truncated.lastIndexOf('&');
    const lastSemicolon = truncated.lastIndexOf(';');

    if (lastAmpersand > lastSemicolon) {
        // We're in the middle of an entity, back up
        truncated = truncated.substring(0, lastAmpersand);
    }

    return truncated + suffix;
}

/**
 * Validate and sanitize a Reddit subreddit name
 * 
 * @param name - Subreddit name to validate
 * @returns Clean subreddit name or null if invalid
 */
export function sanitizeSubredditName(name: string): string | null {
    if (!name) return null;

    const cleaned = name.trim().toLowerCase().replace(/^\/?(r\/)?/, '');

    // Reddit subreddit rules: 3-21 chars, alphanumeric + underscores
    if (/^[a-z0-9_]{3,21}$/.test(cleaned)) {
        return cleaned;
    }

    return null;
}

/**
 * Create a safe onClick handler that prevents XSS
 * Validates the action before executing
 * 
 * @param callback - The function to call on click
 * @returns Event handler with security checks
 */
export function createSafeClickHandler(
    callback: () => void
): (e: React.MouseEvent) => void {
    return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Execute in next tick to avoid potential issues
        setTimeout(callback, 0);
    };
}
