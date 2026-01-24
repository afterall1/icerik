/**
 * Memory File Parser
 * 
 * Parses memory markdown files to extract structured data for Observatory.
 * Implements caching to avoid repeated file reads.
 * 
 * @module api/memoryParser
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('memoryParser');

// Get paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory directory is at project root
// From apps/engine/src/api/ we go up 4 levels to reach project root
const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
const MEMORY_PATH = join(PROJECT_ROOT, 'memory');

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
    data: T;
    expires: number;
}

/**
 * In-memory cache with TTL
 */
const memoryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or load from source
 */
async function getCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expires > Date.now()) {
        logger.debug({ key }, 'Cache hit');
        return cached.data;
    }

    logger.debug({ key }, 'Cache miss, loading...');
    const data = await loader();
    memoryCache.set(key, { data, expires: Date.now() + CACHE_TTL });
    return data;
}

/**
 * Clear cache (useful for testing)
 */
export function clearMemoryCache(): void {
    memoryCache.clear();
    logger.info('Memory cache cleared');
}

/**
 * Read a memory file
 */
async function readMemoryFile(relativePath: string): Promise<string | null> {
    try {
        const fullPath = join(MEMORY_PATH, relativePath);
        const content = await readFile(fullPath, 'utf-8');
        return content;
    } catch (error) {
        logger.warn({ relativePath, error }, 'Failed to read memory file');
        return null;
    }
}

// ============================================================================
// ROADMAP PARSER
// ============================================================================

/**
 * Parsed phase structure
 */
export interface ParsedPhase {
    phase: number;
    name: string;
    status: 'complete' | 'in-progress' | 'planned';
    features: string[];
}

/**
 * Parse roadmap.md to extract phases
 */
async function parseRoadmapFile(): Promise<ParsedPhase[]> {
    const content = await readMemoryFile('roadmap.md');
    if (!content) return [];

    const phases: ParsedPhase[] = [];

    // Split into lines
    const lines = content.split('\n');

    let currentPhase: ParsedPhase | null = null;
    let inCompletedSection = false;
    let inProgressSection = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Detect section headers
        if (trimmed.startsWith('## ✅ Completed') || trimmed.startsWith('## Completed')) {
            inCompletedSection = true;
            inProgressSection = false;
            continue;
        }
        if (trimmed.startsWith('## 🚧 In Progress') || trimmed.startsWith('## In Progress')) {
            inCompletedSection = false;
            inProgressSection = true;
            continue;
        }
        if (trimmed.startsWith('## 📋') || trimmed.startsWith('## 🔮') || trimmed.startsWith('---')) {
            // End of phases sections
            if (currentPhase) {
                phases.push(currentPhase);
                currentPhase = null;
            }
            inCompletedSection = false;
            inProgressSection = false;
            continue;
        }

        // Parse phase header: ### Phase N: Name ✅
        const phaseMatch = trimmed.match(/^### Phase (\d+): (.+?)(?:\s*✅)?$/);
        if (phaseMatch) {
            // Save previous phase
            if (currentPhase) {
                phases.push(currentPhase);
            }

            const phaseNum = parseInt(phaseMatch[1], 10);
            const phaseName = phaseMatch[2].trim();
            const hasCheckmark = trimmed.includes('✅');

            let status: 'complete' | 'in-progress' | 'planned' = 'planned';
            if (hasCheckmark || inCompletedSection) {
                status = 'complete';
            } else if (inProgressSection) {
                status = 'in-progress';
            }

            currentPhase = {
                phase: phaseNum,
                name: phaseName,
                status,
                features: [],
            };
            continue;
        }

        // Parse feature items: - [x] Feature name
        if (currentPhase) {
            const featureMatch = trimmed.match(/^- \[[ x]\] (.+)$/);
            if (featureMatch) {
                currentPhase.features.push(featureMatch[1]);
            }
        }
    }

    // Don't forget the last phase
    if (currentPhase) {
        phases.push(currentPhase);
    }

    // Sort by phase number
    phases.sort((a, b) => a.phase - b.phase);

    logger.info({ phaseCount: phases.length }, 'Parsed roadmap');
    return phases;
}

/**
 * Get parsed roadmap data (cached)
 */
export function getRoadmapData(): Promise<ParsedPhase[]> {
    return getCached('roadmap', parseRoadmapFile);
}

// ============================================================================
// ADR PARSER
// ============================================================================

/**
 * Parsed ADR structure
 */
export interface ParsedADR {
    id: string;
    title: string;
    status: 'accepted' | 'deprecated' | 'proposed';
    summary: string;
}

/**
 * Parse decisions.md to extract ADRs
 */
async function parseADRFile(): Promise<ParsedADR[]> {
    const content = await readMemoryFile('adr/decisions.md');
    if (!content) return [];

    const adrs: ParsedADR[] = [];

    // Split into sections by ADR header
    const sections = content.split(/(?=## ADR-\d+:)/);

    for (const section of sections) {
        // Match ADR header: ## ADR-001: Title
        const headerMatch = section.match(/## (ADR-\d+): (.+)/);
        if (!headerMatch) continue;

        const id = headerMatch[1];
        const title = headerMatch[2].trim();

        // Match status: **Status**: ✅ Accepted
        let status: 'accepted' | 'deprecated' | 'proposed' = 'proposed';
        if (section.includes('✅ Accepted') || section.includes('Accepted')) {
            status = 'accepted';
        } else if (section.includes('❌ Deprecated') || section.includes('Deprecated')) {
            status = 'deprecated';
        }

        // Extract summary from Decision section
        let summary = '';
        const decisionMatch = section.match(/### Decision\s+(.+?)(?=\n###|\n---|\n## |$)/s);
        if (decisionMatch) {
            // Get first sentence/line
            summary = decisionMatch[1].trim().split('\n')[0].trim();
        }

        // Fallback: use rationale first item
        if (!summary) {
            const rationaleMatch = section.match(/### Rationale\s+\d\.\s+\*\*(.+?)\*\*/);
            if (rationaleMatch) {
                summary = rationaleMatch[1];
            }
        }

        adrs.push({ id, title, status, summary });
    }

    logger.info({ adrCount: adrs.length }, 'Parsed ADRs');
    return adrs;
}

/**
 * Get parsed ADR data (cached)
 */
export function getADRData(): Promise<ParsedADR[]> {
    return getCached('adrs', parseADRFile);
}

// ============================================================================
// ENDPOINTS PARSER
// ============================================================================

/**
 * Parsed endpoint structure
 */
export interface ParsedEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    phase: number;
    category: string;
}

/**
 * Parse endpoints.md to extract API endpoints
 */
async function parseEndpointsFile(): Promise<ParsedEndpoint[]> {
    const content = await readMemoryFile('api/endpoints.md');
    if (!content) return [];

    const endpoints: ParsedEndpoint[] = [];

    // Split into sections
    const lines = content.split('\n');

    let currentCategory = 'Core';
    let currentPhase = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect category headers: ## 1. Core Endpoints
        const categoryMatch = line.match(/^## \d+\. (.+?) Endpoints?/i);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            continue;
        }

        // Detect phase markers: **Phase N**
        const phaseMatch = line.match(/\*\*Phase (\d+)\*\*/);
        if (phaseMatch) {
            currentPhase = parseInt(phaseMatch[1], 10);
            continue;
        }

        // Parse endpoint header: ### `GET /api/path`
        const endpointMatch = line.match(/^### `(GET|POST|PUT|DELETE) (.+)`/);
        if (endpointMatch) {
            const method = endpointMatch[1] as 'GET' | 'POST' | 'PUT' | 'DELETE';
            const path = endpointMatch[2].trim();

            // Next non-empty line should be description
            let description = '';
            for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                const nextLine = lines[j].trim();
                if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('```') && !nextLine.startsWith('**')) {
                    description = nextLine;
                    break;
                }
            }

            endpoints.push({
                method,
                path,
                description,
                phase: currentPhase,
                category: currentCategory,
            });
        }
    }

    logger.info({ endpointCount: endpoints.length }, 'Parsed endpoints');
    return endpoints;
}

/**
 * Get parsed endpoints data (cached)
 */
export function getEndpointsData(): Promise<ParsedEndpoint[]> {
    return getCached('endpoints', parseEndpointsFile);
}

// ============================================================================
// ARCHITECTURE PARSER
// ============================================================================

/**
 * Parsed system structure
 */
export interface ParsedSystem {
    name: string;
    description: string;
    docFile: string;
    status: 'active' | 'planned';
}

/**
 * Parse architecture directory to list systems
 */
async function parseArchitectureDir(): Promise<ParsedSystem[]> {
    const systems: ParsedSystem[] = [];

    try {
        const archPath = join(MEMORY_PATH, 'architecture');
        const files = await readdir(archPath);

        for (const file of files) {
            if (!file.endsWith('.md')) continue;

            const content = await readFile(join(archPath, file), 'utf-8');

            // Extract title from first heading
            const titleMatch = content.match(/^# (.+)/m);
            const name = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

            // Extract description from first paragraph after title
            let description = '';
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('#')) continue;
                if (line.startsWith('>')) continue;
                if (line === '') continue;
                if (line.startsWith('---')) continue;
                // First content line
                description = line;
                break;
            }

            systems.push({
                name,
                description: description || `Documentation for ${name}`,
                docFile: file,
                status: 'active',
            });
        }
    } catch (error) {
        logger.warn({ error }, 'Failed to read architecture directory');
    }

    logger.info({ systemCount: systems.length }, 'Parsed architecture');
    return systems;
}

/**
 * Get parsed architecture data (cached)
 */
export function getArchitectureData(): Promise<ParsedSystem[]> {
    return getCached('architecture', parseArchitectureDir);
}

// ============================================================================
// PROJECT METADATA
// ============================================================================

/**
 * Project metadata structure
 */
export interface ProjectMetadata {
    version: string;
    lastUpdate: string;
}

/**
 * Parse package.json and changelog for metadata
 */
async function parseProjectMetadata(): Promise<ProjectMetadata> {
    let version = '1.0.0';
    let lastUpdate = new Date().toISOString();

    // Try to read version from root package.json
    try {
        const packagePath = join(PROJECT_ROOT, 'package.json');
        const packageContent = await readFile(packagePath, 'utf-8');
        const pkg = JSON.parse(packageContent);
        version = pkg.version || version;
    } catch (error) {
        logger.warn({ error }, 'Failed to read package.json');
    }

    // Try to get last update from changelog
    try {
        const changelogContent = await readMemoryFile('changelog.md');
        if (changelogContent) {
            // Match first version entry: ## [1.15.0] - 2026-01-24
            const versionMatch = changelogContent.match(/## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/);
            if (versionMatch) {
                version = versionMatch[1];
                lastUpdate = versionMatch[2] + 'T00:00:00+03:00';
            }
        }
    } catch (error) {
        logger.warn({ error }, 'Failed to parse changelog');
    }

    logger.info({ version, lastUpdate }, 'Parsed project metadata');
    return { version, lastUpdate };
}

/**
 * Get project metadata (cached)
 */
export function getProjectMetadata(): Promise<ProjectMetadata> {
    return getCached('metadata', parseProjectMetadata);
}

// ============================================================================
// FUTURE IDEAS PARSER
// ============================================================================

/**
 * Parse future ideas from roadmap
 */
async function parseFutureIdeas(): Promise<string[]> {
    const content = await readMemoryFile('roadmap.md');
    if (!content) return [];

    const ideas: string[] = [];

    // Find Future Ideas section
    const futureMatch = content.match(/## 🔮 Future Ideas\s+([\s\S]*?)(?=\n## |$)/);
    if (futureMatch) {
        const section = futureMatch[1];
        const lines = section.split('\n');

        for (const line of lines) {
            const ideaMatch = line.match(/^- (.+)/);
            if (ideaMatch) {
                ideas.push(ideaMatch[1].trim());
            }
        }
    }

    logger.info({ ideaCount: ideas.length }, 'Parsed future ideas');
    return ideas;
}

/**
 * Get future ideas (cached)
 */
export function getFutureIdeas(): Promise<string[]> {
    return getCached('futureIdeas', parseFutureIdeas);
}
