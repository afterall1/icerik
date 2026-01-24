/**
 * Image Discovery Module
 * 
 * Exports all image-related functionality for the trend engine.
 * 
 * @module images
 */

// Pexels Client
export {
    PexelsClient,
    getPexelsClient,
    resetPexelsClient,
    PexelsError,
    type PexelsPhoto,
    type ImageResult,
} from './PexelsClient.js';

// Image Validator
export {
    ImageValidator,
    getImageValidator,
    resetImageValidator,
    ImageValidatorError,
    type ImageValidationResult,
} from './ImageValidator.js';

// Keyword Extractor
export {
    KeywordExtractor,
    getKeywordExtractor,
    type KeywordExtractionInput,
    type ExtractedKeywords,
} from './KeywordExtractor.js';

// Image Search Service
export {
    ImageSearchService,
    getImageSearchService,
    resetImageSearchService,
    type ValidatedImage,
    type ImageSearchResult,
} from './ImageSearchService.js';

// Scene Analyzer (Phase 22)
export {
    SceneAnalyzer,
    createSceneAnalyzer,
    type Scene,
    type SceneAnalysis,
    type SceneType,
    type SceneMood,
    type SceneAnalyzerOptions,
} from './SceneAnalyzer.js';

// Semantic Matcher (Phase 22)
export {
    SemanticMatcher,
    createSemanticMatcher,
    type VisualQuery,
    type MatchResult,
    type QueryGenerationResult,
    type SemanticMatcherOptions,
} from './SemanticMatcher.js';

// Visual Sequence Builder (Phase 22)
export {
    VisualSequenceBuilder,
    createVisualSequenceBuilder,
    type SceneVisual,
    type VisualSequence,
    type SequenceBuilderOptions,
} from './VisualSequenceBuilder.js';

// Visual Search Specialist (AI-powered)
export {
    VisualSearchSpecialist,
    getVisualSearchSpecialist,
    resetVisualSearchSpecialist,
    type VisualSearchInput,
    type VisualSearchOutput,
    type SectionType,
    type VisualMood,
} from './VisualSearchSpecialist.js';
