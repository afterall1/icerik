/**
 * AI Module Public API
 * 
 * Exports all AI-related functionality.
 * 
 * @module ai
 */

// Gemini Client
export {
    GeminiClient,
    GeminiError,
    getGeminiClient,
    resetGeminiClient,
} from './gemini.js';

// Script Generator
export {
    ScriptGenerator,
    getScriptGenerator,
    resetScriptGenerator,
    type ScriptOptions,
    type GeneratedScript,
    type VideoFormat,
} from './scriptGenerator.js';
