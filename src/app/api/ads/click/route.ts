import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function getClientIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || null
    }
    return req.headers.get('x-real-ip') || null
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const body = await req.json().catch(() => null)
    const adId = body?.adId
    const location = typeof body?.location === 'string' ? body.location : null
    const deviceType = typeof body?.deviceType === 'string' ? body.deviceType : null
    const osFamily = typeof body?.osFamily === 'string' ? body.osFamily : null
    const feedSessionId = body?.feedSessionId || null

    if (!adId) {
        return NextResponse.json({ error: 'adId is required' }, { status: 400 })
    }

    // Try V2 auction-based click tracking first
    const { data, error } = await supabaseAdmin.rpc('record_ad_click_v2', {
        p_ad_id: adId,
        p_user_id: user?.id ?? null,
        p_ip_address: getClientIp(req),
        p_location: location,
        p_device_type: deviceType,
        p_os_family: osFamily,
    })

    if (error) {
        // Fallback to V1 if V2 doesn't exist yet
        console.warn('[click] V2 failed, trying V1:', error.message)
        const { data: v1Data, error: v1Error } = await supabaseAdmin.rpc('record_ad_click', {
            p_ad_id: adId,
            p_user_id: user?.id ?? null,
            p_ip_address: getClientIp(req),
            p_location: location,
            p_device_type: deviceType,
            p_os_family: osFamily,
        })
        
        if (v1Error) {
            return NextResponse.json({ error: v1Error.message }, { status: 500 })
        }
        
        const result = Array.isArray(v1Data) ? v1Data[0] : v1Data
        return NextResponse.json({
            success: true,
            result,
            version: 'v1-fallback'
        })
    }

    const result = Array.isArray(data) ? data[0] : data

    // Log click for auction analytics if feed session provided
    if (feedSessionId) {
        try {
            await supabaseAdmin
                .from('ad_targeting_matches')
                .insert({
                    ad_id: adId,
                    user_id: user?.id ?? null,
                    match_type: 'CLICK_THROUGH',
                    match_score: 1.0,
                    bid_multiplier_applied: 1.0
                })
        } catch {
            // Non-critical, ignore errors
        }
    }

    return NextResponse.json({
        success: true,
        result,
        version: 'v2-auction'
    })
}
