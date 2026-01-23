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

// Script Generator (single platform - legacy)
export {
    ScriptGenerator,
    getScriptGenerator,
    resetScriptGenerator,
    type ScriptOptions,
    type GeneratedScript,
    type VideoFormat,
} from './scriptGenerator.js';

// Platform Agents
export {
    BasePlatformAgent,
    TikTokAgent,
    ReelsAgent,
    ShortsAgent,
    getTikTokAgent,
    getReelsAgent,
    getShortsAgent,
    getAgentForPlatform,
    getAllAgents,
    type AgentOptions,
} from './agents/index.js';

// Multi-Platform Orchestrator
export {
    MultiPlatformOrchestrator,
    getOrchestrator,
    resetOrchestrator,
} from './orchestrator/index.js';

// Validation
export {
    ScriptValidator,
    getValidator,
    getValidationRules,
    type ValidationRules,
    type ValidationResult,
    type Violation,
} from './validation/index.js';

// Supervisor Agent
export {
    SupervisorAgent,
    getSupervisor,
    resetSupervisor,
    type SupervisedOptions,
    type SupervisedScriptResult,
    type SupervisedResult,
} from './supervisor/index.js';
