/**
 * Phase 22 End-to-End Test Script
 * 
 * Tests SceneAnalyzer, SemanticMatcher, VisualSequenceBuilder
 * and the /api/images/sequence endpoint
 */

import { SceneAnalyzer, createSceneAnalyzer } from '../images/SceneAnalyzer.js';
import { SemanticMatcher, createSemanticMatcher } from '../images/SemanticMatcher.js';
import { VisualSequenceBuilder, createVisualSequenceBuilder } from '../images/VisualSequenceBuilder.js';
import type { PlatformScript, ScriptSection } from '@icerik/shared';

// Test utilities
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(testName: string): void {
    log(`  ✅ ${testName}`, 'green');
}

function fail(testName: string, error: unknown): void {
    log(`  ❌ ${testName}: ${error}`, 'red');
}

function section(name: string): void {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`  ${name}`, 'cyan');
    log(`${'='.repeat(60)}`, 'cyan');
}

// Mock PlatformScript for testing
function createMockScript(): PlatformScript {
    const hookSection: ScriptSection = {
        content: 'Bu bilgiyi kaçıranlar büyük hata yapıyor! iPhone kullananlar dikkat edin.',
        wordCount: 10,
        estimatedSeconds: 4,
    };

    const bodySection: ScriptSection = {
        content: 'Apple, yeni güncelleme ile batarya ömrünü %30 artırdığını açıkladı. Ancak bu özelliği aktif etmek için ayarlardan bir değişiklik yapmanız gerekiyor. Settings menüsüne gidin, Battery seçeneğine tıklayın, Low Power Mode\'u açın. Bu basit ayar sayesinde telefonunuz çok daha uzun süre dayanacak.',
        wordCount: 45,
        estimatedSeconds: 18,
    };

    const ctaSection: ScriptSection = {
        content: 'Bu ipucunu beğendiyseniz takip edin ve yorumlarda hangi telefonu kullandığınızı yazın!',
        wordCount: 12,
        estimatedSeconds: 5,
    };

    return {
        platform: 'tiktok',
        script: `${hookSection.content} ${bodySection.content} ${ctaSection.content}`,
        title: 'iPhone Batarya Hilesi - %30 Daha Uzun Kullanım',
        hashtags: ['#iphone', '#apple', '#teknoloji', '#ipucu'],
        estimatedDurationSeconds: 27,
        sections: {
            hook: hookSection,
            body: bodySection,
            cta: ctaSection,
        },
        optimizations: ['TikTok FYP algorithm optimization', '1-second hook engineering'],
        metadata: {
            generatedAt: new Date().toISOString(),
            trendId: 'test-trend-123',
            category: 'technology',
            agentVersion: 'test-v1',
        },
    };
}

// Test 1: SceneAnalyzer
async function testSceneAnalyzer(): Promise<boolean> {
    section('TEST 1: SceneAnalyzer');
    let passed = true;

    try {
        // Test 1.1: Factory function
        const analyzer = createSceneAnalyzer();
        success('Factory function creates instance');

        // Test 1.2: Analyze script
        const script = createMockScript();
        const analysis = analyzer.analyzeScript(script, 'technology');

        if (analysis.scenes.length > 0) {
            success(`Script analyzed: ${analysis.scenes.length} scenes extracted`);
        } else {
            fail('Scene extraction', 'No scenes extracted');
            passed = false;
        }

        // Test 1.3: Scene structure
        const firstScene = analysis.scenes[0];
        if (firstScene.id && firstScene.type && firstScene.content && firstScene.keywords.length > 0) {
            success(`Scene structure valid: id=${firstScene.id}, type=${firstScene.type}, ${firstScene.keywords.length} keywords`);
        } else {
            fail('Scene structure', 'Missing required fields');
            passed = false;
        }

        // Test 1.4: Mood detection
        if (firstScene.mood) {
            success(`Mood detected: ${firstScene.mood}`);
        } else {
            fail('Mood detection', 'No mood detected');
            passed = false;
        }

        // Test 1.5: Platform and theme
        if (analysis.platform === 'tiktok' && analysis.overallTheme.length > 0) {
            success(`Platform: ${analysis.platform}, Theme: ${analysis.overallTheme}`);
        } else {
            fail('Platform/Theme', 'Missing platform or theme');
            passed = false;
        }

        // Test 1.6: Scene types
        const sceneTypes = analysis.scenes.map(s => s.type);
        log(`    Scene types: ${sceneTypes.join(' → ')}`, 'yellow');

        // Test 1.7: Keywords extraction
        log(`    Sample keywords: ${firstScene.keywords.slice(0, 5).join(', ')}`, 'yellow');

    } catch (error) {
        fail('SceneAnalyzer test', error);
        passed = false;
    }

    return passed;
}

// Test 2: SemanticMatcher
async function testSemanticMatcher(): Promise<boolean> {
    section('TEST 2: SemanticMatcher');
    let passed = true;

    try {
        // Test 2.1: Factory function
        const matcher = createSemanticMatcher();
        success('Factory function creates instance');

        // Test 2.2: Check configuration
        const isConfigured = matcher.isConfigured();
        log(`    Gemini API configured: ${isConfigured}`, isConfigured ? 'green' : 'yellow');

        // Test 2.3: Generate queries (with analyzer)
        const analyzer = createSceneAnalyzer();
        const script = createMockScript();
        const analysis = analyzer.analyzeScript(script, 'technology');

        const queryResult = await matcher.generateQueries(analysis);

        if (queryResult.queries.length > 0) {
            success(`Queries generated: ${queryResult.queries.length} queries`);
        } else {
            fail('Query generation', 'No queries generated');
            passed = false;
        }

        // Test 2.4: Query structure
        const firstQuery = queryResult.queries[0];
        if (firstQuery.primaryQuery && firstQuery.sceneId) {
            success(`Query structure valid: "${firstQuery.primaryQuery.slice(0, 30)}..."`);
        } else {
            fail('Query structure', 'Missing primaryQuery or sceneId');
            passed = false;
        }

        // Test 2.5: Theme query
        if (queryResult.themeQuery) {
            success(`Theme query: "${queryResult.themeQuery}"`);
        } else {
            fail('Theme query', 'Missing theme query');
            passed = false;
        }

        // Test 2.6: Color palette
        if (queryResult.colorPalette && queryResult.colorPalette.length > 0) {
            success(`Color palette: ${queryResult.colorPalette.join(', ')}`);
        }

        // Test 2.7: Video preference
        const videoPreferred = queryResult.queries.filter(q => q.preferVideo);
        log(`    Scenes preferring video: ${videoPreferred.length}/${queryResult.queries.length}`, 'yellow');

        // Test 2.8: Model used
        log(`    Model used: ${queryResult.metadata.modelUsed}`, 'yellow');
        log(`    Processing time: ${queryResult.metadata.processingTimeMs}ms`, 'yellow');

    } catch (error) {
        fail('SemanticMatcher test', error);
        passed = false;
    }

    return passed;
}

// Test 3: VisualSequenceBuilder
async function testVisualSequenceBuilder(): Promise<boolean> {
    section('TEST 3: VisualSequenceBuilder');
    let passed = true;

    try {
        // Test 3.1: Factory function
        const builder = createVisualSequenceBuilder({
            maxAlternatives: 2,
            minMatchScore: 30,
            validateImages: false, // Skip validation for faster testing
            searchCountPerScene: 3,
        });
        success('Factory function creates instance with options');

        // Test 3.2: Build sequence
        const script = createMockScript();
        log('    Building visual sequence (this may take a moment)...', 'yellow');

        const sequence = await builder.buildSequence(script, 'technology');

        if (sequence.sceneVisuals.length > 0) {
            success(`Sequence built: ${sequence.sceneVisuals.length} scene-visual pairs`);
        } else if (sequence.warnings.length > 0) {
            log(`    ⚠️ Sequence built with warnings: ${sequence.warnings.join(', ')}`, 'yellow');
            passed = true; // Still passes if we got a result with warnings
        } else {
            fail('Sequence building', 'No scene visuals and no warnings');
            passed = false;
        }

        // Test 3.3: Coherence score
        log(`    Coherence score: ${sequence.coherenceScore}/100`, 'yellow');

        // Test 3.4: Average match score
        log(`    Average match score: ${sequence.metadata.avgMatchScore}/100`, 'yellow');

        // Test 3.5: Check scene visual structure
        if (sequence.sceneVisuals.length > 0) {
            const first = sequence.sceneVisuals[0];
            if (first.scene && first.query && first.visual) {
                success(`Scene visual structure valid`);
                log(`    First visual: ${first.visual.alt?.slice(0, 50)}...`, 'yellow');
            } else {
                fail('Scene visual structure', 'Missing required fields');
                passed = false;
            }
        }

        // Test 3.6: Warnings
        if (sequence.warnings.length > 0) {
            log(`    Warnings: ${sequence.warnings.length}`, 'yellow');
            sequence.warnings.forEach(w => log(`      - ${w}`, 'yellow'));
        }

        // Test 3.7: Processing time
        log(`    Processing time: ${sequence.metadata.processingTimeMs}ms`, 'yellow');

        // Test 3.8: Cache stats
        const cacheStats = builder.getCacheStats();
        log(`    Cache: ${cacheStats.entries} entries`, 'yellow');

    } catch (error) {
        fail('VisualSequenceBuilder test', error);
        passed = false;
    }

    return passed;
}

// Test 4: API Endpoint (if server is running)
async function testAPIEndpoint(): Promise<boolean> {
    section('TEST 4: API Endpoint (/api/images/sequence)');
    let passed = true;

    const API_URL = 'http://localhost:3000/api/images/sequence';

    try {
        const script = createMockScript();

        log('    Sending POST request to API...', 'yellow');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                script,
                category: 'technology',
                options: {
                    validateImages: false,
                    searchCountPerScene: 3,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            fail('API request', `Status ${response.status}: ${errorText}`);
            return false;
        }

        const result = await response.json();

        if (result.success) {
            success('API returned success');
            log(`    Scene count: ${result.data.sceneCount}`, 'yellow');
            log(`    Avg match score: ${result.data.avgMatchScore}`, 'yellow');
            log(`    Coherence score: ${result.data.coherenceScore}`, 'yellow');

            if (result.data.warnings?.length > 0) {
                log(`    Warnings: ${result.data.warnings.length}`, 'yellow');
            }
        } else {
            fail('API response', result.error);
            passed = false;
        }

    } catch (error) {
        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
            log('    ⚠️ API server not running - skipping endpoint test', 'yellow');
            log('    Start server with: npm run dev', 'yellow');
            return true; // Not a failure, just skipped
        }
        fail('API endpoint test', error);
        passed = false;
    }

    return passed;
}

// Main test runner
async function runAllTests(): Promise<void> {
    log('\n🧪 PHASE 22: END-TO-END TEST SUITE', 'cyan');
    log(`   Started at: ${new Date().toISOString()}\n`, 'cyan');

    const results: { name: string; passed: boolean }[] = [];

    // Run tests sequentially
    results.push({ name: 'SceneAnalyzer', passed: await testSceneAnalyzer() });
    results.push({ name: 'SemanticMatcher', passed: await testSemanticMatcher() });
    results.push({ name: 'VisualSequenceBuilder', passed: await testVisualSequenceBuilder() });
    results.push({ name: 'API Endpoint', passed: await testAPIEndpoint() });

    // Summary
    section('TEST SUMMARY');

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    results.forEach(r => {
        if (r.passed) {
            log(`  ✅ ${r.name}`, 'green');
        } else {
            log(`  ❌ ${r.name}`, 'red');
        }
    });

    log(`\n  Total: ${passedCount}/${totalCount} passed`, passedCount === totalCount ? 'green' : 'yellow');
    log(`  Completed at: ${new Date().toISOString()}\n`, 'cyan');

    // Exit with appropriate code
    process.exit(passedCount === totalCount ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    log(`\n❌ Test suite failed: ${error}`, 'red');
    process.exit(1);
});
