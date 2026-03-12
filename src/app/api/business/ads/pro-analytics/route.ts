import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Pro plan keyword recommendations by category
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'FASHION_BEAUTY': ['skincare', 'makeup', 'outfit', 'style', 'trends', 'accessories', 'beauty', 'fashion', 'cosmetics', 'hair'],
    'TECH': ['gadgets', 'tech', 'software', 'apps', 'digital', 'AI', 'automation', 'productivity', 'tools', 'innovation'],
    'FINANCE_INSURANCE': ['investing', 'savings', 'budget', 'financial', 'wealth', 'trading', 'crypto', 'retirement', 'insurance', 'planning'],
    'FOOD': ['recipes', 'cooking', 'healthy', 'restaurant', 'dining', 'organic', 'vegan', 'meal prep', 'kitchen', 'foodie'],
    'TRAVEL': ['destinations', 'vacation', 'hotels', 'flights', 'adventure', 'tourism', 'backpacking', 'luxury travel', 'road trip', 'explore'],
    'HOME': ['decor', 'furniture', 'DIY', 'renovation', 'organization', 'minimalist', 'interior', 'garden', 'home improvement', 'design'],
    'SPORTS': ['fitness', 'workout', 'training', 'athletics', 'gym', 'wellness', 'nutrition', 'sports', 'exercise', 'health'],
    'ENTERTAINMENT': ['movies', 'music', 'streaming', 'gaming', 'events', 'concerts', 'shows', 'entertainment', 'pop culture', 'celebrity'],
    'GENERAL': ['lifestyle', 'tips', 'hacks', 'ideas', 'inspiration', 'trends', 'community', 'culture', 'living', 'modern']
}

// High-performing keyword patterns by industry
const HIGH_PERFORMING_PATTERNS: Record<string, string[]> = {
    'FASHION_BEAUTY': ['how to style', 'makeup tutorial', 'skincare routine', 'outfit ideas', 'beauty tips'],
    'TECH': ['best apps', 'productivity hack', 'tech review', 'how to automate', 'software comparison'],
    'FINANCE_INSURANCE': ['how to save', 'investment tips', 'financial freedom', 'budget guide', 'wealth building'],
    'FOOD': ['easy recipe', 'healthy meal', 'quick dinner', 'meal prep', 'cooking tips'],
    'TRAVEL': ['travel guide', 'hidden gems', 'budget travel', 'best hotels', 'travel tips'],
    'HOME': ['DIY project', 'room makeover', 'organizing tips', 'home decor', 'renovation ideas'],
    'SPORTS': ['workout routine', 'fitness tips', 'training plan', 'gym motivation', 'nutrition guide'],
    'ENTERTAINMENT': ['best movies', 'binge worthy', 'must watch', 'entertainment news', 'review'],
    'GENERAL': ['life hack', 'how to', 'tips and tricks', 'best of', 'ultimate guide']
}

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Pro plan status
    const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('plan_tier, plan_expires_at')
        .eq('id', user.id)
        .single()

    const isPro = userProfile?.plan_tier === 'PRO' || userProfile?.plan_tier === 'ENTERPRISE'
    const planExpired = userProfile?.plan_expires_at && new Date(userProfile.plan_expires_at) < new Date()

    const { searchParams } = new URL(req.url)
    const adId = searchParams.get('adId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    try {
        // Get user's ads
        const { data: userAds } = await supabaseAdmin
            .from('ads')
            .select('id, title, description, target_tags, category, status, clicks_count, views_count, saves_count, shares_count, comments_count, engagement_rate, quality_score, max_cpc')
            .eq('user_id', user.id)

        const adIds = adId ? [adId] : (userAds?.map(a => a.id) || [])

        if (adIds.length === 0) {
            return NextResponse.json({
                success: true,
                isPro,
                planExpired,
                canUpgrade: !isPro || planExpired,
                ads: [],
                insights: null
            })
        }

        const end = new Date()
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

        // Get keyword performance data
        const { data: keywordData } = await supabaseAdmin
            .from('ad_keyword_performance')
            .select('keyword, category, impressions, clicks, ctr, avg_cpc, date')
            .in('ad_id', adIds)
            .gte('date', start.toISOString().split('T')[0])
            .order('ctr', { ascending: false })

        // Get engagement data
        const { data: engagementData } = await supabaseAdmin
            .from('ad_engagements')
            .select('engagement_type, metadata, created_at')
            .in('ad_id', adIds)
            .gte('created_at', start.toISOString())

        // Get auction data for competitive insights
        const { data: auctionData } = await supabaseAdmin
            .from('ad_auction_results')
            .select('quality_score, ad_rank, position_achieved, actual_cpc_charged, effective_bid')
            .in('ad_id', adIds)
            .gte('auction_timestamp', start.toISOString())
            .eq('won_auction', true)

        // Process keyword insights
        const keywordMap = new Map()
        keywordData?.forEach(k => {
            if (!keywordMap.has(k.keyword)) {
                keywordMap.set(k.keyword, {
                    keyword: k.keyword,
                    category: k.category,
                    totalImpressions: 0,
                    totalClicks: 0,
                    totalCtr: 0,
                    avgCpc: 0,
                    appearances: 0
                })
            }
            const entry = keywordMap.get(k.keyword)
            entry.totalImpressions += k.impressions || 0
            entry.totalClicks += k.clicks || 0
            entry.totalCtr += k.ctr || 0
            entry.avgCpc = (entry.avgCpc * entry.appearances + (k.avg_cpc || 0)) / (entry.appearances + 1)
            entry.appearances++
        })

        const topKeywords = Array.from(keywordMap.values())
            .sort((a, b) => (b.totalCtr / b.appearances) - (a.totalCtr / a.appearances))
            .slice(0, 20)
            .map(k => ({
                ...k,
                effectiveCtr: (k.totalCtr / k.appearances).toFixed(2)
            }))

        // Process engagement metrics
        const engagementStats = {
            saves: 0,
            shares: 0,
            comments: 0,
            likes: 0,
            pins: 0,
            total: 0
        }

        engagementData?.forEach(e => {
            const type = e.engagement_type.toLowerCase()
            if (type in engagementStats) {
                engagementStats[type as keyof typeof engagementStats]++
            }
            engagementStats.total++
        })

        // Calculate click-to-impression ratio insights
        const ctrInsights = {
            overallCTR: '0.00',
            ctrTrend: 'stable',
            ctrByPosition: {} as Record<number, { clicks: number; impressions: number }>,
            bestPerformingTags: [] as string[],
            underperformingTags: [] as string[]
        }

        if (userAds && userAds.length > 0) {
            const totalClicks = userAds.reduce((s, a) => s + (a.clicks_count || 0), 0)
            const totalViews = userAds.reduce((s, a) => s + (a.views_count || 0), 0)
            ctrInsights.overallCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00'

            // Analyze by ad tags
            const tagPerformance = new Map()
            userAds.forEach(ad => {
                const adCtr = (ad.views_count || 0) > 0 ? ((ad.clicks_count || 0) / ad.views_count) * 100 : 0
                ad.target_tags?.forEach((tag: string) => {
                    if (!tagPerformance.has(tag)) {
                        tagPerformance.set(tag, { ctr: 0, count: 0 })
                    }
                    const t = tagPerformance.get(tag)
                    t.ctr += adCtr
                    t.count++
                })
            })

            const tagAnalysis = Array.from(tagPerformance.entries())
                .map(([tag, data]) => ({ tag, avgCtr: data.ctr / data.count }))
                .sort((a, b) => b.avgCtr - a.avgCtr)

            ctrInsights.bestPerformingTags = tagAnalysis.slice(0, 5).map(t => t.tag)
            ctrInsights.underperformingTags = tagAnalysis.slice(-5).map(t => t.tag)
        }

        // CTR by auction position
        auctionData?.forEach(a => {
            if (a.position_achieved) {
                const pos = a.position_achieved
                if (!ctrInsights.ctrByPosition[pos]) {
                    ctrInsights.ctrByPosition[pos] = { clicks: 0, impressions: 0 }
                }
                // Approximate from auction data
                ctrInsights.ctrByPosition[pos].clicks += 1
                ctrInsights.ctrByPosition[pos].impressions += 1
            }
        })

        // Generate keyword recommendations based on category
        const userCategories = [...new Set(userAds?.map(a => a.category) || [])]
        const recommendedKeywords: string[] = []
        
        userCategories.forEach(cat => {
            const catKey = cat as keyof typeof CATEGORY_KEYWORDS
            const patterns = HIGH_PERFORMING_PATTERNS[catKey] || HIGH_PERFORMING_PATTERNS.GENERAL
            const baseKeywords = CATEGORY_KEYWORDS[catKey] || CATEGORY_KEYWORDS.GENERAL
            
            // Combine patterns with base keywords for suggestions
            patterns.forEach(pattern => {
                baseKeywords.slice(0, 3).forEach(kw => {
                    recommendedKeywords.push(`${pattern} ${kw}`)
                })
            })
        })

        // Remove duplicates and already-used keywords
        const usedKeywords = new Set(topKeywords.map(k => k.keyword.toLowerCase()))
        const uniqueRecommendations = [...new Set(recommendedKeywords)]
            .filter(k => !usedKeywords.has(k.toLowerCase()))
            .slice(0, 15)

        // Calculate Pro insights
        const proInsights = {
            keywordOpportunities: uniqueRecommendations,
            competitiveBenchmark: {
                avgQualityScore: auctionData && auctionData.length > 0
                    ? (auctionData.reduce((s, a) => s + (a.quality_score || 5), 0) / auctionData.length).toFixed(1)
                    : '5.0',
                avgCPCRange: auctionData && auctionData.length > 0
                    ? {
                        min: Math.min(...auctionData.map(a => a.actual_cpc_charged || 0.1)).toFixed(2),
                        max: Math.max(...auctionData.map(a => a.actual_cpc_charged || 0.1)).toFixed(2)
                    }
                    : { min: '0.10', max: '0.50' },
                avgAdRank: auctionData && auctionData.length > 0
                    ? (auctionData.reduce((s, a) => s + (a.ad_rank || 0), 0) / auctionData.length).toFixed(0)
                    : '0'
            },
            engagementBenchmarks: {
                engagementRate: engagementStats.total > 0 
                    ? ((engagementStats.saves + engagementStats.shares + engagementStats.comments) / engagementStats.total * 100).toFixed(1)
                    : '0.0',
                savesPerClick: userAds && userAds.reduce((s, a) => s + (a.clicks_count || 0), 0) > 0
                    ? (engagementStats.saves / userAds.reduce((s, a) => s + (a.clicks_count || 0), 0)).toFixed(2)
                    : '0.00',
                shareRate: engagementStats.total > 0
                    ? ((engagementStats.shares / engagementStats.total) * 100).toFixed(1)
                    : '0.0'
            }
        }

        return NextResponse.json({
            success: true,
            isPro,
            planExpired,
            canUpgrade: !isPro || planExpired,
            ads: userAds || [],
            insights: {
                topKeywords,
                engagementStats,
                ctrInsights,
                proInsights: isPro && !planExpired ? proInsights : null,
                preview: !isPro || planExpired ? {
                    keywordCount: topKeywords.length,
                    topKeyword: topKeywords[0],
                    engagementPreview: engagementStats.total > 0,
                    message: 'Upgrade to Pro for full keyword insights, engagement analytics, and CTR optimization recommendations'
                } : null
            }
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
