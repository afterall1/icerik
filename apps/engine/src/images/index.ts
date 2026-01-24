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
