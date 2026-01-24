/**
 * Platform-Specific Types for Multi-Platform AI Agent System
 *
 * Defines types for TikTok, Instagram Reels, and YouTube Shorts
 * content generation with platform-specific optimizations.
 *
 * @module shared/platformTypes
 */

import type { ContentCategory, TrendData } from './types.js';

/**
 * Supported short-form video platforms
 */
export type Platform = 'tiktok' | 'reels' | 'shorts';

/**
 * All available platforms as a constant array
 */
export const ALL_PLATFORMS: readonly Platform[] = ['tiktok', 'reels', 'shorts'] as const;

/**
 * Platform display names for UI
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
    tiktok: 'TikTok',
    reels: 'Instagram Reels',
    shorts: 'YouTube Shorts',
};

/**
 * Platform-specific algorithm focus areas
 */
export interface PlatformAlgorithmFocus {
    /** Primary metrics the algorithm prioritizes */
    primaryMetrics: string[];
    /** Optimal duration range in seconds */
    optimalDuration: {
        min: number;
        max: number;
        ideal: number;
    };
    /** Hook timing requirements */
    hookTiming: {
        criticalSeconds: number;
        description: string;
    };
    /** Content loop recommendation */
    loopStrategy: {
        recommended: boolean;
        description: string;
    };
    /** Platform-specific CTA guidance */
    ctaGuidance: string;
    /** Hashtag strategy */
    hashtagStrategy: {
        count: { min: number; max: number };
        style: string;
    };
}

/**
 * Platform-specific visual style configuration
 * Used for thumbnail generation, text overlays, and visual assets
 */
export interface VisualStyle {
    /** Overall aesthetic theme */
    aesthetic: 'bold' | 'minimal' | 'aesthetic' | 'meme' | 'professional';
    /** Text overlay styling */
    textStyles: {
        fontWeight: 'bold' | 'regular' | 'light';
        fontSize: 'large' | 'medium' | 'small';
        animation: 'pop' | 'fade' | 'slide' | 'none';
    };
    /** Color palette */
    colors: {
        primary: string;
        accent: string;
        text: string;
        background?: string;
    };
    /** Thumbnail-specific guidance */
    thumbnailGuidance: string;
}

/**
 * Platform-specific audio/sound recommendations
 * Used for music selection, voiceover style, and sound effects
 */
export interface AudioStyle {
    /** Preferred audio type for the platform */
    preferredType: 'viral_sound' | 'original' | 'voice_focused' | 'music_heavy';
    /** Voice-over style guidance */
    voiceStyle: 'energetic' | 'calm' | 'dramatic' | 'conversational';
    /** Background music intensity */
    musicIntensity: 'high' | 'medium' | 'low' | 'none';
    /** Platform-specific audio guidance */
    guidance: string;
}

/**
 * Platform Algorithm Expert Interface
 * 
 * Defines the contract for platform-specific intelligence.
 * This interface is implemented by all platform agents and provides
 * reusable algorithm knowledge across all output capabilities
 * (script, visual, audio, etc.)
 */
export interface PlatformAlgorithmExpert {
    /** Target platform */
    readonly platform: Platform;

    /** Get algorithm focus configuration */
    getAlgorithmFocus(): PlatformAlgorithmFocus;

    /** Get optimal duration range */
    getOptimalDuration(): { min: number; max: number; ideal: number };

    /** Get platform display label */
    getPlatformLabel(): string;

    /** Get visual style guide for the platform */
    getVisualStyle(): VisualStyle;

    /** Get audio recommendations for the platform */
    getAudioStyle(): AudioStyle;
}

/**
 * Algorithm focus configurations for each platform
 */
export const PLATFORM_ALGORITHM_FOCUS: Record<Platform, PlatformAlgorithmFocus> = {
    tiktok: {
        primaryMetrics: ['watch_time', 'completion_rate', 'shares', 'comments'],
        optimalDuration: { min: 15, max: 30, ideal: 21 },
        hookTiming: {
            criticalSeconds: 1,
            description: 'Stop the scroll in first 1 second',
        },
        loopStrategy: {
            recommended: true,
            description: 'Design content to seamlessly loop for rewatches',
        },
        ctaGuidance: 'Use pattern interrupts, ask questions to trigger comments',
        hashtagStrategy: {
            count: { min: 3, max: 5 },
            style: 'Mix trending + niche hashtags',
        },
    },
    reels: {
        primaryMetrics: ['initial_engagement', 'shares', 'saves', 'reach'],
        optimalDuration: { min: 15, max: 90, ideal: 30 },
        hookTiming: {
            criticalSeconds: 3,
            description: 'Aesthetic hook in first 3 seconds, grid-friendly cover',
        },
        loopStrategy: {
            recommended: true,
            description: 'Create save-worthy, rewatchable content',
        },
        ctaGuidance: 'Focus on shareability - "Send this to someone who..."',
        hashtagStrategy: {
            count: { min: 5, max: 10 },
            style: 'Mix discovery + branded hashtags, use in caption',
        },
    },
    shorts: {
        primaryMetrics: ['viewed_vs_swiped', 'retention_rate', 'subscribe_clicks'],
        optimalDuration: { min: 15, max: 60, ideal: 30 },
        hookTiming: {
            criticalSeconds: 3,
            description: 'Prevent swipe-away in first 3 seconds, aim for 70%+ viewed rate',
        },
        loopStrategy: {
            recommended: true,
            description: 'Target 100%+ retention through seamless loops',
        },
        ctaGuidance: 'Include subscribe prompt, leverage YouTube ecosystem',
        hashtagStrategy: {
            count: { min: 3, max: 5 },
            style: 'YouTube SEO focused, include in description',
        },
    },
};

/**
 * Script section with word count metadata
 */
export interface ScriptSection {
    /** Section content */
    content: string;
    /** Word count */
    wordCount: number;
    /** Estimated duration in seconds (2.5 words/sec) */
    estimatedSeconds: number;
}

/**
 * Platform-specific generated script
 */
export interface PlatformScript {
    /** Target platform */
    platform: Platform;
    /** Full script text */
    script: string;
    /** Suggested video title */
    title: string;
    /** Platform-optimized hashtags */
    hashtags: string[];
    /** Estimated total duration in seconds */
    estimatedDurationSeconds: number;
    /** Script sections breakdown */
    sections: {
        hook?: ScriptSection;
        body: ScriptSection;
        cta?: ScriptSection;
    };
    /** Platform-specific optimizations applied */
    optimizations: string[];
    /** Generation metadata */
    metadata: {
        generatedAt: string;
        trendId: string;
        category: ContentCategory;
        agentVersion: string;
    };
    /** Optional warnings about script generation (e.g., truncation, incomplete sections) */
    warnings?: string[];
}

/**
 * Multi-platform generation result
 */
export interface MultiPlatformResult {
    /** Source trend data */
    trend: TrendData;
    /** Results per platform */
    results: {
        tiktok?: PlatformScriptResult;
        reels?: PlatformScriptResult;
        shorts?: PlatformScriptResult;
    };
    /** Overall generation metadata */
    metadata: {
        requestedAt: string;
        completedAt: string;
        totalDurationMs: number;
        successCount: number;
        failureCount: number;
    };
}

/**
 * Individual platform script result (success or failure)
 */
export type PlatformScriptResult =
    | { success: true; script: PlatformScript }
    | { success: false; error: string; retryable: boolean };

/**
 * Multi-platform script generation options
 */
export interface MultiPlatformOptions {
    /** Target platforms (defaults to all) */
    platforms?: Platform[];
    /** Target duration in seconds */
    durationSeconds?: number;
    /** Content tone */
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    /** Script language */
    language?: 'en' | 'tr';
    /** Include hook section */
    includeHook?: boolean;
    /** Include CTA section */
    includeCta?: boolean;
}

/**
 * Default multi-platform options
 */
export const DEFAULT_MULTI_PLATFORM_OPTIONS: Required<MultiPlatformOptions> = {
    platforms: [...ALL_PLATFORMS],
    durationSeconds: 30,
    tone: 'casual',
    language: 'tr',
    includeHook: true,
    includeCta: true,
};

/**
 * Platform icon identifiers for UI
 */
export const PLATFORM_ICONS: Record<Platform, string> = {
    tiktok: 'music-2',
    reels: 'instagram',
    shorts: 'youtube',
};

/**
 * Platform brand colors for UI theming
 */
export const PLATFORM_COLORS: Record<Platform, { primary: string; secondary: string }> = {
    tiktok: { primary: '#000000', secondary: '#FF0050' },
    reels: { primary: '#E4405F', secondary: '#833AB4' },
    shorts: { primary: '#FF0000', secondary: '#282828' },
};

// ============================================================================
// ALGORITHM EDUCATION SYSTEM TYPES
// ============================================================================

/**
 * Detailed algorithm metric explanation for educational purposes
 */
export interface AlgorithmMetricDetail {
    /** Metric name in Turkish */
    nameTr: string;
    /** Metric name in English */
    nameEn: string;
    /** Short summary of what this metric measures */
    summary: string;
    /** Weight of this metric in the algorithm (0-100, should sum to 100) */
    weight: number;
    /** How this metric is calculated */
    calculation: string;
    /** Visual icon/emoji for this metric */
    icon: string;
    /** What you SHOULD do to optimize this metric */
    doList: string[];
    /** What you should NOT do (anti-patterns) */
    dontList: string[];
}

/**
 * Detailed explanation for each optimization applied to the script
 */
export interface OptimizationExplanation {
    /** Short optimization name (matches script.optimizations array) */
    name: string;
    /** Detailed explanation of this optimization technique */
    explanation: string;
    /** Why this optimization matters for the algorithm */
    whyItMatters: string;
    /** Good vs bad example comparison */
    example?: {
        good: string;
        bad: string;
    };
}

/**
 * Comprehensive educational content for a platform's algorithm
 */
export interface PlatformEducation {
    /** Platform identifier */
    platform: Platform;
    /** The core principle that drives this platform's algorithm */
    corePrinciple: string;
    /** Detailed breakdown of algorithm metrics with weights */
    metrics: AlgorithmMetricDetail[];
    /** Explanations for all optimization techniques */
    optimizationExplanations: OptimizationExplanation[];
    /** Pro tips from experienced creators */
    proTips: string[];
    /** Critical first seconds timing */
    hookTiming: {
        seconds: number;
        explanation: string;
    };
    /** Further learning resources (optional) */
    resources?: { title: string; url: string }[];
}

/**
 * Comprehensive educational content for each platform
 */
export const PLATFORM_EDUCATION: Record<Platform, PlatformEducation> = {
    tiktok: {
        platform: 'tiktok',
        corePrinciple: 'TikTok algoritması tek bir soruya cevap arar: "Bu video izleyiciyi ekranda ne kadar süre tutar?"',
        hookTiming: {
            seconds: 1,
            explanation: 'TikTok\'ta karar anı 1 saniyedir. İlk saniyede dikkat çekmezseniz, kullanıcı kaydırır ve algoritma videonuzu öldürür.',
        },
        metrics: [
            {
                nameTr: 'İzlenme Süresi',
                nameEn: 'Watch Time',
                summary: 'Kullanıcıların videonuzu izlediği toplam süre - TikTok\'un #1 sinyali',
                weight: 40,
                calculation: 'Toplam İzlenme = Video Süresi × İzlenme Sayısı × Ortalama İzlenme Yüzdesi',
                icon: '⏱️',
                doList: [
                    'İlk saniyede "scroll durdurucu" bir hook kullanın',
                    'Her 2-3 saniyede "pattern interrupt" ekleyin (zoom, metin, ses değişimi)',
                    'Sonunda başa dönen loop tasarımı yapın',
                    'Merak boşluğu oluşturup sona kadar tutun',
                ],
                dontList: [
                    'Yavaş giriş yapmayın - "Merhaba arkadaşlar..." öldürür',
                    'Logo veya intro animasyonu kullanmayın',
                    '"Bugün size anlatacağım..." gibi açılışlar yapmayın',
                    'Önemli bilgiyi başta verip gerisini sıkıcı bırakmayın',
                ],
            },
            {
                nameTr: 'Tamamlama Oranı',
                nameEn: 'Completion Rate',
                summary: 'Videonun yüzde kaçının izlendiği - %100+ hedefleyin (loop ile)',
                weight: 30,
                calculation: '% Tamamlama = (İzlenen Süre / Video Süresi) × 100',
                icon: '✅',
                doList: [
                    'Videoyu 15-30 saniye arasında tutun (21sn ideal)',
                    'Sonunda "wait for it" anı oluşturun',
                    'Başa döngü yapan bir son tasarlayın',
                    'Hikayeyi sonuna kadar merak uyandıracak şekilde kurgulayın',
                ],
                dontList: [
                    'Gereksiz uzatmayın - her saniye kazanılmalı',
                    'Sonucu başta söyleyip geri kalanını dolgu yapmayın',
                    '60 saniyenin üzerine çıkmayın (yeni başlayanlar için)',
                    'Anti-klimaks sonlar yapmayın',
                ],
            },
            {
                nameTr: 'Tekrar İzleme Oranı',
                nameEn: 'Loop Rate',
                summary: 'Videonun kaç kez tekrar izlendiği - viral potansiyelin anahtarı',
                weight: 15,
                calculation: 'Loop Rate = Toplam İzlenmeler / Unique İzleyiciler',
                icon: '🔄',
                doList: [
                    'Video sonunu başla uyumlu yapın (seamless loop)',
                    '"Tekrar izlemem lazım" dedirten detaylar gizleyin',
                    'Hızlı bilgi akışı kullanın - tek seferde kavranmasın',
                    'Easter egg veya gizli detaylar ekleyin',
                ],
                dontList: [
                    'Belirgin bitiş yapmayın - "İşte bu kadar" demeyin',
                    'Tüm bilgiyi açıkça vermeyin - merak bırakın',
                    'Fade out veya kapanış animasyonları kullanmayın',
                    'Sondaki CTA\'yı çok uzun tutmayın',
                ],
            },
            {
                nameTr: 'Etkileşim',
                nameEn: 'Engagement',
                summary: 'Beğeni, yorum, paylaşım ve kaydetme - viral yayılımın motoru',
                weight: 15,
                calculation: 'Engagement Rate = (Beğeni + Yorum + Paylaşım + Kayıt) / Görüntülenme × 100',
                icon: '💬',
                doList: [
                    'Yorum çağrısı yapın: "Sen ne düşünüyorsun?"',
                    'Tartışmalı (ama güvenli) fikirler paylaşın',
                    'Cevap gerektiren sorular sorun',
                    'Duet/Stitch\'e uygun içerik yapın',
                ],
                dontList: [
                    '"Beğen ve takip et" diye yalvarmayın',
                    'Yorum bölümünü görmezden gelmeyin',
                    'Çok güvenli/sıkıcı içerik yapmayın',
                    'Tek yönlü konuşmayın - etkileşim isteyin',
                ],
            },
        ],
        optimizationExplanations: [
            {
                name: 'TikTok FYP algorithm optimization',
                explanation: 'For You Page (FYP), TikTok\'un ana keşif sayfasıdır. İçeriğiniz buraya düşerse milyonlara ulaşabilir. Algoritma, izlenme süresi ve etkileşime göre içeriği değerlendirir.',
                whyItMatters: 'FYP\'ye düşmezseniz sadece takipçileriniz görür. FYP = viral potansiyel.',
                example: {
                    good: 'İlk saniyede dikkat çeken, %100+ tamamlama oranı hedefleyen içerik',
                    bad: 'Yavaş başlayan, izleyiciyi kaybeden standart video',
                },
            },
            {
                name: '1-second hook engineering',
                explanation: 'TikTok kullanıcıları ortalama 0.8 saniyede kaydırma kararı verir. Bu sürede dikkat çekmelisiniz: şok edici görsel, cesur iddia veya merak uyandıran soru.',
                whyItMatters: 'Hook başarısız = video ölü. Algoritma ilk saniye davranışına bakar ve düşük performans gören videolara şans vermez.',
                example: {
                    good: '"Bu bilgiyi bilmiyorsan ayda 1000₺ kaybediyorsun"',
                    bad: '"Merhaba arkadaşlar, bugün sizinle paylaşmak istediğim bir konu var"',
                },
            },
            {
                name: 'Pattern interrupt markers every 2-3s',
                explanation: 'İnsan beyni 2-3 saniyede sıkılmaya başlar. Bu noktada zoom, metin, ses değişimi veya konu geçişi ile dikkati yeniden yakalamalısınız.',
                whyItMatters: 'Pattern interrupt olmadan izleyici zihnen "check out" eder ve kaydırır. Sürekli dopamin akışı = sürekli izleme.',
                example: {
                    good: '[ZOOM IN] + [TEXT: "İşte kritik nokta"] + [SES DEĞİŞİMİ]',
                    bad: 'Monoton bir şekilde 30 saniye konuşmak',
                },
            },
            {
                name: 'Loop-friendly ending design',
                explanation: 'Video sonunun başa akıcı bir şekilde bağlanması. İzleyici farkında olmadan videoyu tekrar izlemeye başlar.',
                whyItMatters: 'Her loop = ekstra izlenme süresi = algoritma boost. %100+ retention mümkün.',
                example: {
                    good: 'Son cümle başa bağlanıyor: "...ve işte bu yüzden [BAŞA DÖN] bu bilgiyi..."',
                    bad: '"Bu kadar! Takip etmeyi unutmayın. Görüşürüz!"',
                },
            },
            {
                name: 'Comment-bait CTA strategy',
                explanation: 'Direkt takip istemek yerine, yorum yapmaya teşvik eden sorular veya tartışmalı fikirler kullanın.',
                whyItMatters: 'Yorumlar = güçlü etkileşim sinyali. Ayrıca yorumlarda geçirilen süre de video performansına eklenir.',
                example: {
                    good: '"Siz olsanız hangisini seçerdiniz? Yorumlarda tartışalım"',
                    bad: '"Beğen, yorum yap, takip et!"',
                },
            },
            {
                name: 'Stop-the-scroll hook formula',
                explanation: 'Scroll\'u durduran hook formülleri: POV, Story time, Unpopular opinion, "Kimse anlatmıyor ama..."',
                whyItMatters: 'Bu formüller TikTok\'ta evrensel olarak çalışır çünkü merak boşluğu oluşturur.',
            },
            {
                name: 'Engagement-driving CTA',
                explanation: 'İzleyiciyi aktif bir şekilde içeriğe dahil eden çağrılar.',
                whyItMatters: 'Pasif izleyici yerine aktif katılımcı = daha güçlü algoritma sinyali.',
            },
            {
                name: 'Optimized for short-form (15-30s sweet spot)',
                explanation: '21 saniye TikTok\'un "altın süresi"dir. Bu sürede hem hikaye anlatabilir hem de yüksek tamamlama oranı alabilirsiniz.',
                whyItMatters: 'Çok kısa = yeterli bilgi yok. Çok uzun = tamamlama oranı düşer.',
            },
        ],
        proTips: [
            '📊 İlk 30-60 dakikadaki performans videonun kaderini belirler - bu sürede paylaşım yapın',
            '⏱️ 21 saniyelik videolar en yüksek tamamlama oranına sahip - bu süreyi hedefleyin',
            '🎵 Trending sesler kullanmak keşfedilebilirliği %300\'e kadar artırır',
            '📝 Video açıklamalarına anahtar kelimeler ekleyin - TikTok SEO artık çok önemli',
            '🔄 Aynı içeriği farklı hook\'larla test edin - hangisi tutarsa onu ölçeklendirin',
            '👀 İlk 3 videodan biri tutmazsa vazgeçmeyin - algoritma öğrenme süreci gerektirir',
        ],
    },
    reels: {
        platform: 'reels',
        corePrinciple: 'Instagram Reels algoritması "paylaşılabilirlik" üzerine kuruludur: "Bu içeriği arkadaşıma DM\'den göndermek ister miyim?"',
        hookTiming: {
            seconds: 3,
            explanation: 'Reels\'de ilk 3 saniye kritiktir. Estetik açılış + merak uyandırma kombinasyonu gerekir. Instagram kullanıcıları görselliğe daha duyarlıdır.',
        },
        metrics: [
            {
                nameTr: 'Paylaşımlar',
                nameEn: 'Shares',
                summary: 'DM paylaşımları - Reels algoritmasının #1 sinyali',
                weight: 35,
                calculation: 'Share Rate = DM Paylaşımları / Görüntülenme × 100',
                icon: '📤',
                doList: [
                    '"Bunu şu arkadaşına gönder..." formatını kullanın',
                    'Relatable, "bu tam ben" dedirten anlar yaratın',
                    'Arkadaş gruplarına hitap eden içerik yapın',
                    'Şakalı veya içeriden espri içeren içerik üretin',
                ],
                dontList: [
                    'Çok kişisel/niş içerik yapmayın - paylaşılmaz',
                    'Sadece kendinize hitap eden içerik üretmeyin',
                    'Paylaşılması utandırıcı içerik yapmayın',
                    'Çok uzun veya karmaşık içerik - özet paylaşılır',
                ],
            },
            {
                nameTr: 'Kaydetmeler',
                nameEn: 'Saves',
                summary: 'İçeriğin kaydedilmesi - yüksek değerli içerik göstergesi',
                weight: 30,
                calculation: 'Save Rate = Kaydetmeler / Görüntülenme × 100',
                icon: '🔖',
                doList: [
                    'Listeler yapın: "5 şey yapmalısın", "3 hata yapıyorsun"',
                    'Referans olarak kullanılabilir içerik üretin',
                    'Adım adım rehberler hazırlayın',
                    '"Bunu kaydet" çağrısı yapın',
                ],
                dontList: [
                    'Tek seferlik, tekrar bakılmayacak içerik yapmayın',
                    'Değer vermeden eğlence odaklı gitmeyin',
                    'Kaydedilecek bir neden sunmayın',
                    'Bilgiyi çok hızlı geçmeyin - not alamazlar',
                ],
            },
            {
                nameTr: 'İlk Etkileşim',
                nameEn: 'Initial Engagement',
                summary: 'İlk 30 dakikadaki etkileşim - reach tavanını belirler',
                weight: 20,
                calculation: 'İlk 30dk Engagement = (Beğeni + Yorum + Paylaşım + Kayıt) ilk 30dk içinde',
                icon: '⚡',
                doList: [
                    'Paylaşım zamanlamasını optimize edin (hedef kitle aktifken)',
                    'Stories\'de Reel\'inizi tanıtın',
                    'Açılış saatinde yorumlara cevap verin',
                    'Takipçilerinize DM hatırlatma gönderin',
                ],
                dontList: [
                    'Gece yarısı paylaşım yapmayın',
                    'Paylaşıp unutmayın - ilk saatler kritik',
                    'Yorumları görmezden gelmeyin',
                    'Düşük etkileşimli saatlerde paylaşmayın',
                ],
            },
            {
                nameTr: 'Erişim',
                nameEn: 'Reach',
                summary: 'İçeriğin kaç unique kullanıcıya ulaştığı',
                weight: 15,
                calculation: 'Reach = Unique kullanıcı görüntülemeleri',
                icon: '👁️',
                doList: [
                    'Explore page için optimize edin (trending konular)',
                    'Hashtag stratejisi kullanın (5-10 arası)',
                    'Diğer içerik türleriyle çapraz tanıtım yapın',
                    'Collab özelliğini kullanın',
                ],
                dontList: [
                    '30+ hashtag spam yapmayın',
                    'İlgisiz trending hashtag kullanmayın',
                    'Sadece takipçilere güvenmeyin',
                    'Aynı hashtag setini her zaman kullanmayın',
                ],
            },
        ],
        optimizationExplanations: [
            {
                name: 'Instagram Reels algorithm optimization',
                explanation: 'Reels, Instagram\'ın en güçlü organik erişim aracıdır. Algoritma paylaşım ve kaydetmeye TikTok\'tan daha fazla ağırlık verir.',
                whyItMatters: 'Doğru optimize edilmiş bir Reel, takipçi sayınızın 10 katına ulaşabilir.',
            },
            {
                name: 'Shareability-focused content design',
                explanation: 'İçeriğinizi "arkadaşıma göndermem lazım" dedirtecek şekilde tasarlayın. Relatable anlar, insider esprileri, grup deneyimleri.',
                whyItMatters: 'DM paylaşımları Instagram\'ın en güçlü sosyal sinyali. Viral = paylaşılır.',
                example: {
                    good: '"Türk anneleri be like: *kesinlikle herkesin bildiği bir durum*"',
                    bad: 'Sadece kendi deneyiminizi anlatan kişisel içerik',
                },
            },
            {
                name: 'Grid-friendly cover frame suggestions',
                explanation: 'Instagram profil grid\'inde güzel görünecek kapak karesi önerisi. 9:16 ratio içinde merkezi, estetik bir frame.',
                whyItMatters: 'Profil ziyaretçileri grid\'e bakar. Düzensiz grid = takipsiz ayrılma.',
            },
            {
                name: 'Caption SEO optimization',
                explanation: 'Instagram artık anahtar kelime araması yapıyor. Açıklamada searchable terimler kullanın.',
                whyItMatters: 'Explore page\'de arama sonuçlarına düşmek = pasif keşif.',
            },
            {
                name: 'Save-worthy content structure',
                explanation: 'Liste, rehber, ipucu formatları kaydetmeye teşvik eder. "Bunu kaydet, lazım olacak" psikolojisi.',
                whyItMatters: 'Kaydetmeler = yüksek değer algısı = algoritma boost.',
            },
            {
                name: 'Aesthetic-first hook design',
                explanation: 'Görsel açıdan etkileyici açılış. Instagram estetiğine uygun renk paleti, ışıklandırma, kompozisyon.',
                whyItMatters: 'Instagram görsel bir platform. Estetik hook > şok hook.',
            },
            {
                name: 'Soft CTA with share/save prompts',
                explanation: 'Agresif takip çağrısı yerine yumuşak paylaşım/kaydetme önerileri.',
                whyItMatters: 'Instagram kitlesi daha sofistike. "Bunu kaydet" çalışır, "TAKİP ET!!!" çalışmaz.',
            },
        ],
        proTips: [
            '📸 Grid\'inizde Reels thumbnaillerinin nasıl göründüğüne dikkat edin - estetik bütünlük önemli',
            '📖 İlk caption satırı kritik - feed\'de görünen tek kısım bu, hook gibi yazın',
            '🔄 Reel\'inizi Stories\'de paylaşın - ilk 30 dakika için ekstra push',
            '💬 Yorumlara hızlı cevap verin - konuşma başlatır ve engagement artırır',
            '🏷️ 5-10 arası hashtag ideal - trending + niş karışımı kullanın',
            '⏰ Hedef kitlenizin en aktif olduğu saatte paylaşın - Analytics\'ten kontrol edin',
        ],
    },
    shorts: {
        platform: 'shorts',
        corePrinciple: 'YouTube Shorts algoritması "izleyiciyi elden kaçırmamak" üzerine kuruludur: "Bu kullanıcı swipe yapacak mı, yoksa sonuna kadar izleyecek mi?"',
        hookTiming: {
            seconds: 3,
            explanation: 'Shorts\'ta ilk 3 saniye kritik. View vs Swipe oranı algoritmanın temel metriği. Cesur iddia + değer vaadi kombinasyonu en etkili.',
        },
        metrics: [
            {
                nameTr: 'İzlendi vs Kaydırıldı',
                nameEn: 'Viewed vs Swiped',
                summary: 'Shorts\'un #1 metriği - izleyici kaydırdı mı yoksa izledi mi?',
                weight: 40,
                calculation: 'Viewed Rate = İzlemeler / (İzlemeler + Swipe Away) × 100 → Hedef: %70+',
                icon: '👆',
                doList: [
                    'İlk 3 saniyede güçlü değer vaadi verin',
                    'Cesur iddialarla başlayın - "BU bilgiyi bilmeniz LAZIM"',
                    'Görsel dikkat çekici açılış kullanın',
                    '"Sonuna kadar izle" dedirtecek merak oluşturun',
                ],
                dontList: [
                    'Yavaş yapılanma ile başlamayın',
                    'Kim olduğunuzu anlatarak zaman kaybetmeyin',
                    'Sıkıcı intro kullanmayın',
                    'Değeri sona saklamayın - ipucu verin',
                ],
            },
            {
                nameTr: 'Elde Tutma Oranı',
                nameEn: 'Retention Rate',
                summary: 'İzleyiciyi ne kadar süre tutabildiniz - %100+ ideal',
                weight: 30,
                calculation: 'Retention = Ortalama İzlenme Süresi / Video Süresi × 100',
                icon: '📈',
                doList: [
                    'Her 5 saniyede yeni bilgi/değer verin',
                    'Sonunda büyük reveal yapın - sona kadar tutun',
                    'Loop tasarımı ile %100+ hedefleyin',
                    'Tension ve release döngüsü kullanın',
                ],
                dontList: [
                    'Ortasında değer düşüşü yapmayın',
                    'Tekrarlayan içerik koymayın',
                    'Anti-klimaks sonlar yapmayın',
                    'Gereksiz uzatmayın',
                ],
            },
            {
                nameTr: 'Abone Tıklamaları',
                nameEn: 'Subscribe Clicks',
                summary: 'Shorts\'tan gelen abone - kanal büyümesi için güçlü sinyal',
                weight: 20,
                calculation: 'Subscribe Rate = Abone Tıklamaları / İzlemeler × 100',
                icon: '🔔',
                doList: [
                    'Doğal abone çağrısı yapın - "Daha fazlası için abone ol"',
                    'Kanal içeriğinize köprü kurun',
                    'Serilerin bir parçası olarak sunun',
                    '"Part 2 için abone ol" kullanın',
                ],
                dontList: [
                    'Her videoda agresif abone çağrısı yapmayın',
                    'Kanalınızla alakasız içerik yapmayın',
                    'Sadece viral peşinde koşmayın - kanal uyumu önemli',
                    'Abone değeri vermeden istemyin',
                ],
            },
            {
                nameTr: 'YouTube Arama',
                nameEn: 'YouTube Search',
                summary: 'Shorts da YouTube aramada çıkar - SEO önemli',
                weight: 10,
                calculation: 'Search Performance = Arama Görüntülemeleri / Toplam Görüntülemeler',
                icon: '🔍',
                doList: [
                    'Başlıkta anahtar kelime kullanın',
                    'Açıklamada searchable terimler ekleyin',
                    'Trending konulardan yararlanın',
                    'Hashtag stratejisi kullanın (#Shorts dahil)',
                ],
                dontList: [
                    'Clickbait başlık kullanmayın - YouTube cezalandırır',
                    'Alakasız anahtar kelime spam yapmayın',
                    'Açıklamayı boş bırakmayın',
                    'Kafa karıştırıcı başlıklar kullanmayın',
                ],
            },
        ],
        optimizationExplanations: [
            {
                name: 'YouTube Shorts algorithm optimization',
                explanation: 'Shorts, YouTube\'un kısa video formatıdır ve ayrı bir algoritma ile çalışır. Ana YouTube\'dan farklı olarak watch time yerine retention ve swipe oranına bakar.',
                whyItMatters: 'YouTube\'un 2 milyar kullanıcısına shorts üzerinden erişim - massive reach potansiyeli.',
            },
            {
                name: 'Anti-swipe hook engineering (3-second rule)',
                explanation: 'İlk 3 saniyede swipe\'ı önleyecek güçlü hook. Değer vaadi + merak kombinasyonu.',
                whyItMatters: 'Swipe = ölüm. %70+ viewed rate olmadan viral olmak imkansız.',
                example: {
                    good: '"3 saniye içinde sana 1000₺ kazandıracak bir şey söyleyeceğim"',
                    bad: '"Bugün sizlerle bir şey paylaşmak istiyorum"',
                },
            },
            {
                name: '100%+ retention architecture',
                explanation: 'Videonun %100\'ünün izlenmesini, hatta loop ile tekrar izlenmesini sağlayacak yapı.',
                whyItMatters: 'YouTube %100+ retention\'ı "bu içerik çok iyi" sinyali olarak okur.',
            },
            {
                name: 'YouTube SEO integration',
                explanation: 'Shorts da YouTube aramasında çıkar. Başlık ve açıklamada SEO optimize anahtar kelimeler.',
                whyItMatters: 'Pasif keşif - aylarca sonra bile arama trafiği alabilirsiniz.',
            },
            {
                name: 'Subscribe conversion optimization',
                explanation: 'Shorts izleyicisini kanala abone yapmak için doğal geçişler ve değer vaatleri.',
                whyItMatters: 'Shorts = kanal büyütme makinesi. Her viral short binlerce abone getirebilir.',
            },
            {
                name: 'Swipe-prevention hook formula',
                explanation: 'Cesur iddia + anında değer + görsel dikkat formülü.',
                whyItMatters: 'Swipe kararı 1-3 saniye içinde verilir. Hook formülü bu kararı etkiler.',
            },
            {
                name: 'YouTube ecosystem CTA (subscribe + channel)',
                explanation: 'Shorts\'tan ana kanala köprü kuran çağrılar. "Full video kanalımda" veya "Bu serinin devamı için abone ol".',
                whyItMatters: 'Shorts + Long-form sinerjisi = sürdürülebilir kanal büyümesi.',
            },
        ],
        proTips: [
            '📺 Shorts izleyicilerini ana kanal içeriğine yönlendirin - sinerji oluşturun',
            '🔄 28 günlük içerik döngüsü var - sürekli yeni içerik akışı önemli',
            '✅ %70+ viewed rate hedefleyin - bunun altı düşük performans sayılır',
            '🔔 Subscribe CTA\'ları TikTok/Reels\'den farklı - burada çalışır, kullanın',
            '📝 Açıklama ve başlıkta SEO yapın - Shorts da aranabilir',
            '🔗 Shorts, uzun video izlenmelerini de artırabilir - ekosistem düşünün',
        ],
    },
};

// ============================================================
// Phase 15: Concrete Type Aliases with PlatformScript
// ============================================================

import type {
    ScriptVariant as GenericScriptVariant,
    IterationRequest as GenericIterationRequest,
    IterationResult as GenericIterationResult,
} from './types.js';

/**
 * ScriptVariant with PlatformScript type
 */
export type ScriptVariantWithScript = GenericScriptVariant<PlatformScript>;

/**
 * IterationRequest with PlatformScript type
 */
export type IterationRequestWithScript = GenericIterationRequest<PlatformScript>;

/**
 * IterationResult with PlatformScript type
 */
export type IterationResultWithScript = GenericIterationResult<PlatformScript>;

