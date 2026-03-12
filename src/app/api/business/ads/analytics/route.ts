import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const adId = searchParams.get('adId')
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    try {
        // Get user's ads
        const { data: userAds, error: adsError } = await supabaseAdmin
            .from('ads')
            .select('id, title, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (adsError) throw adsError

        const adIds = adId ? [adId] : (userAds?.map(a => a.id) || [])

        if (adIds.length === 0) {
            return NextResponse.json({
                success: true,
                ads: [],
                summary: null,
                timeSeries: [],
                geography: [],
                demographics: [],
                devices: [],
                interactions: []
            })
        }

        // Calculate date range
        const end = endDate ? new Date(endDate) : new Date()
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

        // Get summary stats
        const { data: summaryData } = await supabaseAdmin
            .from('ad_daily_analytics')
            .select('ad_id, views_count, clicks_count, spend, date')
            .in('ad_id', adIds)
            .gte('date', start.toISOString().split('T')[0])
            .lte('date', end.toISOString().split('T')[0])

        const summary = {
            totalImpressions: summaryData?.reduce((sum, d) => sum + (d.views_count || 0), 0) || 0,
            totalClicks: summaryData?.reduce((sum, d) => sum + (d.clicks_count || 0), 0) || 0,
            totalSpend: summaryData?.reduce((sum, d) => sum + parseFloat(d.spend || 0), 0) || 0,
            avgCtr: '0.00',
            avgCpc: '0.00'
        }

        summary.avgCtr = summary.totalImpressions > 0 
            ? ((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)
            : '0.00'
        
        summary.avgCpc = summary.totalClicks > 0 
            ? (summary.totalSpend / summary.totalClicks).toFixed(2)
            : '0.00'

        // Get time series data
        const timeSeriesMap = new Map()
        summaryData?.forEach(row => {
            const date = row.date
            if (!timeSeriesMap.has(date)) {
                timeSeriesMap.set(date, { date, impressions: 0, clicks: 0, spend: 0 })
            }
            const entry = timeSeriesMap.get(date)
            entry.impressions += row.views_count || 0
            entry.clicks += row.clicks_count || 0
            entry.spend += parseFloat(row.spend || 0)
        })

        const timeSeries = Array.from(timeSeriesMap.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Get interaction data for demographics and geography
        const { data: interactions } = await supabaseAdmin
            .from('ad_interactions')
            .select('interaction_type, location, os_family, device_type, created_at')
            .in('ad_id', adIds)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())

        // Process geographic data
        const geoMap = new Map()
        interactions?.forEach(i => {
            const location = i.location || 'Unknown'
            if (!geoMap.has(location)) {
                geoMap.set(location, { location, clicks: 0, impressions: 0 })
            }
            const entry = geoMap.get(location)
            if (i.interaction_type === 'CLICK') entry.clicks++
            else entry.impressions++
        })

        const geography = Array.from(geoMap.values())
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 20)

        // Process device data
        const deviceMap = new Map()
        interactions?.forEach(i => {
            const device = i.device_type || 'Unknown'
            const os = i.os_family || 'Unknown'
            const key = `${device} (${os})`
            if (!deviceMap.has(key)) {
                deviceMap.set(key, { device, os, clicks: 0, impressions: 0 })
            }
            const entry = deviceMap.get(key)
            if (i.interaction_type === 'CLICK') entry.clicks++
            else entry.impressions++
        })

        const devices = Array.from(deviceMap.values())
            .sort((a, b) => b.clicks - a.clicks)

        // Get auction data for additional insights
        const { data: auctionData } = await supabaseAdmin
            .from('ad_auction_results')
            .select('position_achieved, quality_score, actual_cpc_charged, auction_timestamp')
            .in('ad_id', adIds)
            .gte('auction_timestamp', start.toISOString())
            .lte('auction_timestamp', end.toISOString())
            .eq('won_auction', true)

        const auctionInsights = {
            avgPosition: (auctionData && auctionData.length > 0) 
                ? (auctionData.reduce((sum, a) => sum + (a.position_achieved || 0), 0) / auctionData.length).toFixed(1)
                : '0',
            avgQualityScore: (auctionData && auctionData.length > 0)
                ? (auctionData.reduce((sum, a) => sum + parseFloat(a.quality_score || 5), 0) / auctionData.length).toFixed(1)
                : '5.0',
            positionDistribution: {} as Record<number, number>
        }

        auctionData?.forEach(a => {
            const pos = a.position_achieved || 0
            auctionInsights.positionDistribution[pos] = (auctionInsights.positionDistribution[pos] || 0) + 1
        })

        // Get targeting match data for demographics
        const { data: targetingData } = await supabaseAdmin
            .from('ad_targeting_matches')
            .select('match_type, match_score')
            .in('ad_id', adIds)
            .gte('matched_at', start.toISOString())
            .lte('matched_at', end.toISOString())

        const targetingBreakdown = {} as Record<string, { count: number; avgScore: number }>
        targetingData?.forEach(t => {
            const type = t.match_type || 'BROAD'
            if (!targetingBreakdown[type]) {
                targetingBreakdown[type] = { count: 0, avgScore: 0 }
            }
            targetingBreakdown[type].count++
            targetingBreakdown[type].avgScore += t.match_score || 0
        })

        // Calculate averages
        Object.keys(targetingBreakdown).forEach(key => {
            const item = targetingBreakdown[key]
            item.avgScore = item.count > 0 ? item.avgScore / item.count : 0
        })

        return NextResponse.json({
            success: true,
            ads: userAds || [],
            summary,
            timeSeries,
            geography,
            devices,
            demographics: targetingBreakdown,
            auctionInsights,
            interactions: interactions || [],
            dateRange: { start: start.toISOString(), end: end.toISOString() }
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
        console.error('[business-analytics] error:', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
