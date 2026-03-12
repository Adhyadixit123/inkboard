import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateAdminConsoleCache } from '@/lib/admin/consoleCache'

export const runtime = 'nodejs'

function sanitizeUrl(url?: string | null) {
    if (!url) return null
    try {
        const parsed = new URL(url)
        return parsed.origin + parsed.pathname
    } catch {
        return null
    }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const businessName = body?.businessName?.trim()
    const websiteUrl = body?.websiteUrl?.trim()
    const description = body?.description?.trim()

    if (!businessName || !description) {
        return NextResponse.json({ error: 'Business name and description are required' }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('is_business')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.is_business) {
        return NextResponse.json({ message: 'You already have business access' })
    }

    const { data: latest } = await supabaseAdmin
        .from('business_requests')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (latest && String(latest.status).toUpperCase() === 'PENDING') {
        return NextResponse.json({ message: 'Your existing request is still under review' }, { status: 200 })
    }

    const { error: insertError } = await supabaseAdmin.from('business_requests').insert({
        user_id: user.id,
        business_name: businessName,
        website_url: sanitizeUrl(websiteUrl) ?? websiteUrl ?? null,
        description,
        status: 'PENDING',
    })

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    invalidateAdminConsoleCache()

    return NextResponse.json({ message: 'Request submitted. Our team will review it shortly.' })
}
