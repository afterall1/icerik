/**
 * Visual Search Specialist
 * 
 * AI-powered agent that deeply understands scripts and generates
 * optimized search queries for stock photo/video discovery.
 * 
 * Features:
 * - Semantic script analysis
 * - Abstract→Concrete visual mapping
 * - Pexels taxonomy optimization
 * - Multi-query fallback strategy
 * 
 * @module images/VisualSearchSpecialist
 */

import { createChildLogger } from '../utils/logger.js';
import { getGeminiClient, GeminiError } from '../ai/gemini.js';

const logger = createChildLogger('visual-search-specialist');

/**
 * Section types for visual context
 */
export type SectionType = 'hook' | 'body' | 'cta';

/**
 * Visual mood types for image selection
 */
export type VisualMood = 'dramatic' | 'calm' | 'energetic' | 'professional' | 'dark' | 'bright';

/**
 * Input for visual search specialist
 */
export interface VisualSearchInput {
    /** Section type being searched */
    sectionType: SectionType;
    /** Content of the section */
    sectionContent: string;
    /** Full script context for better understanding */
    fullScriptContext?: string;
    /** Content category */
    category?: string;
    /** Target platform */
    platform?: 'tiktok' | 'reels' | 'shorts';
    /** Script title/topic */
    title?: string;
}

/**
 * Output from visual search specialist
 */
export interface VisualSearchOutput {
    /** Best primary search query */
    primaryQuery: string;
    /** Alternative queries for fallback */
    fallbackQueries: string[];
    /** Visual concepts identified */
    visualConcepts: string[];
    /** Recommended visual mood */
    visualMood: VisualMood;
    /** AI reasoning for query selection */
    reasoning: string;
    /** Whether AI was used or fallback */
    aiGenerated: boolean;
}

/**
 * System prompt for the Visual Search Specialist
 */
const SYSTEM_PROMPT = `# Visual Search Specialist

Sen, kısa video içerikleri (TikTok, Reels, Shorts) için en uygun stock fotoğraf ve videoları bulan dünya çapında uzman bir görsel arama uzmanısın.

## Görevin
Script bölümünü analiz et ve Pexels stock fotoğraf API'si için optimize edilmiş arama sorguları oluştur.

## Kritik Kurallar

### 1. BÖLÜM AMACINI ANLA
- **Hook:** Dikkat çekme, şok etme, merak uyandırma → Dramatik, çarpıcı görseller
- **Body:** Bilgi verme, açıklama, süreç anlatma → Açıklayıcı, profesyonel görseller  
- **CTA:** Aksiyon çağrısı, engagement → İnsan etkileşim görselleri

### 2. SOYUT → SOMUT DÖNÜŞÜMÜ
Soyut kavramları Pexels'de aranabilir somut görsellere dönüştür:
- "Veri sızıntısı" → "hacker laptop dark room code"
- "Gizlilik tehlikesi" → "surveillance camera security"
- "Şifre güvenliği" → "lock padlock digital protection"
- "FBI soruşturması" → "federal agent investigation office"
- "Teknoloji riski" → "warning alert computer screen"

### 3. PEXELS ARAMA OPTİMİZASYONU
- Somut isimler önce: "laptop hacker" ✓ (not "hacking laptop")
- İngilizce kullan (Pexels İngilizce çalışır)
- Atmosfer ekle: dramatic, dark, bright, professional, modern
- Format: Portrait görseller için kişi/dikey objeler kullan
- 3-5 kelime optimal

### 4. GÖRSEL ÇEKİCİLİK
Reels için göz alıcı görseller seç:
- Yüksek kontrast ve canlı renkler
- Temiz kompozisyon (metin eklemeye uygun)
- Dinamik veya dramatik sahneler

## Çıktı Formatı (JSON)
{
  "primaryQuery": "en etkili tek sorgu (3-5 kelime, İngilizce)",
  "fallbackQueries": ["alternatif 1", "alternatif 2", "genel backup"],
  "visualConcepts": ["konsept1", "konsept2", "konsept3"],
  "visualMood": "dramatic|calm|energetic|professional|dark|bright",
  "reasoning": "neden bu sorguları seçtiğin (kısa açıklama)"
}

## Örnekler

### Örnek 1
**Input:**
- sectionType: hook
- sectionContent: "Windows şifreniz artık FBI'ın elinde!"
- category: technology

**Output:**
{
  "primaryQuery": "fbi agent computer investigation dark",
  "fallbackQueries": ["hacker laptop dark room", "data breach warning screen", "cybersecurity threat alert"],
  "visualConcepts": ["federal investigation", "data breach", "cyber threat"],
  "visualMood": "dark",
  "reasoning": "Hook şok yaratmayı hedefliyor. FBI + veri güvenliği teması korku ve merak uyandırmalı."
}

### Örnek 2
**Input:**
- sectionType: body
- sectionContent: "Microsoft, yasal gereklilikler kapsamında kullanıcı verilerini paylaşabiliyor..."
- category: technology

**Output:**
{
  "primaryQuery": "corporate data center server room",
  "fallbackQueries": ["business meeting professional", "legal document signing", "technology office modern"],
  "visualConcepts": ["corporate data", "legal compliance", "enterprise technology"],
  "visualMood": "professional",
  "reasoning": "Body bilgi veriyor. Kurumsal ve ciddi ton gerekli, dramatik değil açıklayıcı."
}

### Örnek 3
**Input:**
- sectionType: cta
- sectionContent: "Yorumlarda düşüncelerini paylaş!"
- category: technology

**Output:**
{
  "primaryQuery": "person smartphone social media engagement",
  "fallbackQueries": ["hands typing phone", "young person commenting phone", "social interaction mobile"],
  "visualConcepts": ["social engagement", "user interaction", "mobile conversation"],
  "visualMood": "energetic",
  "reasoning": "CTA etkileşim istiyor. İnsan + telefon + aktif katılım görseli uygun."
}`;

/**
 * Fallback keyword extraction (when AI unavailable)
 */
function extractFallbackKeywords(input: VisualSearchInput): VisualSearchOutput {
    const content = input.sectionContent.toLowerCase();
    const keywords: string[] = [];

    // Extract meaningful words
    const words = content
        .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);

    // Take first few unique words
    const seen = new Set<string>();
    for (const word of words) {
        if (!seen.has(word) && keywords.length < 4) {
            seen.add(word);
            keywords.push(word);
        }
    }

    // Add category if available
    if (input.category) {
        keywords.push(input.category);
    }

    // Determine mood based on section type
    const moodMap: Record<SectionType, VisualMood> = {
        hook: 'dramatic',
        body: 'professional',
        cta: 'energetic',
    };

    const query = keywords.slice(0, 4).join(' ') || 'technology modern';

    return {
        primaryQuery: query,
        fallbackQueries: [
            input.category || 'technology',
            'modern abstract background',
        ],
        visualConcepts: keywords.slice(0, 3),
        visualMood: moodMap[input.sectionType] || 'professional',
        reasoning: 'Fallback extraction used (AI unavailable)',
        aiGenerated: false,
    };
}

/**
 * Parse AI response to structured output
 */
function parseAIResponse(response: string, input: VisualSearchInput): VisualSearchOutput {
    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and normalize
        const output: VisualSearchOutput = {
            primaryQuery: String(parsed.primaryQuery || '').trim() || extractFallbackKeywords(input).primaryQuery,
            fallbackQueries: Array.isArray(parsed.fallbackQueries)
                ? parsed.fallbackQueries.map((q: unknown) => String(q).trim()).filter(Boolean).slice(0, 3)
                : [],
            visualConcepts: Array.isArray(parsed.visualConcepts)
                ? parsed.visualConcepts.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 4)
                : [],
            visualMood: ['dramatic', 'calm', 'energetic', 'professional', 'dark', 'bright'].includes(parsed.visualMood)
                ? parsed.visualMood
                : 'professional',
            reasoning: String(parsed.reasoning || '').trim() || 'AI generated query',
            aiGenerated: true,
        };

        // Ensure we have fallbacks
        if (output.fallbackQueries.length === 0) {
            output.fallbackQueries = [
                input.category || 'technology',
                'modern abstract background',
            ];
        }

        return output;

    } catch (error) {
        logger.warn({ error, response: response.slice(0, 200) }, 'Failed to parse AI response, using fallback');
        return extractFallbackKeywords(input);
    }
}

/**
 * Visual Search Specialist Class
 * 
 * Uses Gemini AI to generate intelligent, context-aware search queries
 * for stock photo/video discovery.
 */
export class VisualSearchSpecialist {
    private gemini = getGeminiClient();

    /**
     * Check if AI is available
     */
    isConfigured(): boolean {
        return this.gemini.isConfigured();
    }

    /**
     * Generate optimized search queries for a script section
     * 
     * @param input - Section content and context
     * @returns Optimized search queries and metadata
     */
    async generateSearchQueries(input: VisualSearchInput): Promise<VisualSearchOutput> {
        // Validate input
        if (!input.sectionContent?.trim()) {
            logger.warn('Empty section content provided');
            return extractFallbackKeywords(input);
        }

        // Use fallback if AI not configured
        if (!this.isConfigured()) {
            logger.info('Gemini not configured, using fallback extraction');
            return extractFallbackKeywords(input);
        }

        try {
            // Build the prompt
            const userPrompt = this.buildPrompt(input);

            logger.debug({
                sectionType: input.sectionType,
                contentLength: input.sectionContent.length,
                category: input.category,
            }, 'Generating visual search queries');

            // Call Gemini
            const response = await this.gemini.generateContent(userPrompt, {
                temperature: 0.7, // Creative but focused
                systemInstruction: SYSTEM_PROMPT,
            });

            // Parse response
            const result = parseAIResponse(response, input);

            logger.info({
                sectionType: input.sectionType,
                primaryQuery: result.primaryQuery,
                fallbackCount: result.fallbackQueries.length,
                mood: result.visualMood,
            }, 'Visual search queries generated');

            return result;

        } catch (error) {
            if (error instanceof GeminiError) {
                logger.warn({ error: error.message }, 'Gemini error, using fallback');
            } else {
                logger.error({ error }, 'Unexpected error in visual search');
            }

            return extractFallbackKeywords(input);
        }
    }

    /**
     * Build the user prompt for Gemini
     */
    private buildPrompt(input: VisualSearchInput): string {
        const parts: string[] = [
            '## Görsel Arama İsteği',
            '',
            `**Section Type:** ${input.sectionType}`,
            `**Section Content:** ${input.sectionContent}`,
        ];

        if (input.title) {
            parts.push(`**Script Title:** ${input.title}`);
        }

        if (input.category) {
            parts.push(`**Category:** ${input.category}`);
        }

        if (input.platform) {
            parts.push(`**Platform:** ${input.platform}`);
        }

        if (input.fullScriptContext) {
            parts.push('', `**Full Script Context:** ${input.fullScriptContext.slice(0, 500)}`);
        }

        parts.push('', 'Lütfen yukarıdaki bölüm için optimize edilmiş görsel arama sorguları oluştur. JSON formatında yanıt ver.');

        return parts.join('\n');
    }

    /**
     * Generate queries for all sections of a script
     */
    async generateForAllSections(sections: {
        hook?: string;
        body?: string;
        cta?: string;
    }, context: {
        title?: string;
        category?: string;
        platform?: 'tiktok' | 'reels' | 'shorts';
    }): Promise<Map<SectionType, VisualSearchOutput>> {
        const results = new Map<SectionType, VisualSearchOutput>();
        const fullContext = [sections.hook, sections.body, sections.cta].filter(Boolean).join(' ');

        const sectionPromises: Promise<void>[] = [];

        for (const [type, content] of Object.entries(sections) as [SectionType, string | undefined][]) {
            if (content) {
                sectionPromises.push(
                    this.generateSearchQueries({
                        sectionType: type,
                        sectionContent: content,
                        fullScriptContext: fullContext,
                        title: context.title,
                        category: context.category,
                        platform: context.platform,
                    }).then(result => {
                        results.set(type, result);
                    })
                );
            }
        }

        await Promise.all(sectionPromises);

        return results;
    }
}

/**
 * Singleton instance
 */
let specialistInstance: VisualSearchSpecialist | null = null;

/**
 * Gets the singleton Visual Search Specialist
 */
export function getVisualSearchSpecialist(): VisualSearchSpecialist {
    if (!specialistInstance) {
        specialistInstance = new VisualSearchSpecialist();
    }
    return specialistInstance;
}

/**
 * Resets the Visual Search Specialist instance (for testing)
 */
export function resetVisualSearchSpecialist(): void {
    specialistInstance = null;
}
