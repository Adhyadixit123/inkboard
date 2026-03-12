import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type MessageRow = {
    id: string
    business_request_id: string
    sender_user_id: string
    sender_role: 'ADMIN' | 'USER'
    body: string
    created_at: string
    read_at?: string | null
}

async function requireAdmin() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) {
        return { error: NextResponse.json({ error: error.message }, { status: 500 }), user: null }
    }

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null }
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, role, display_name, username, email')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        return { error: NextResponse.json({ error: profileError.message }, { status: 500 }), user: null }
    }

    if (!profile || String(profile.role).toUpperCase() !== 'ADMIN') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null }
    }

    return { error: null, user: profile }
}

export async function GET(req: NextRequest) {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const businessRequestId = req.nextUrl.searchParams.get('businessRequestId')
    if (!businessRequestId) {
        return NextResponse.json({ error: 'businessRequestId is required' }, { status: 400 })
    }

    const { data: businessRequest, error: requestError } = await supabaseAdmin
        .from('business_requests')
        .select('id, user_id, business_name, status, users:users!business_requests_user_id_fkey(display_name, email, username)')
        .eq('id', businessRequestId)
        .maybeSingle()

    if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    if (!businessRequest) {
        return NextResponse.json({ error: 'Business request not found' }, { status: 404 })
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
        .from('business_request_messages')
        .select('id, business_request_id, sender_user_id, sender_role, body, created_at, read_at')
        .eq('business_request_id', businessRequestId)
        .order('created_at', { ascending: true })

    if (messagesError) {
        return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    return NextResponse.json({
        request: businessRequest,
        messages: (messages ?? []) as MessageRow[],
    })
}

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (auth.error || !auth.user) return auth.error

    const body = await req.json().catch(() => null)
    const businessRequestId = body?.businessRequestId
    const message = body?.message?.trim()

    if (!businessRequestId || !message) {
        return NextResponse.json({ error: 'businessRequestId and message are required' }, { status: 400 })
    }

    const { data: businessRequest, error: requestError } = await supabaseAdmin
        .from('business_requests')
        .select('id, user_id')
        .eq('id', businessRequestId)
        .maybeSingle()

    if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    if (!businessRequest) {
        return NextResponse.json({ error: 'Business request not found' }, { status: 404 })
    }

    const { data, error: insertError } = await supabaseAdmin
        .from('business_request_messages')
        .insert({
            business_request_id: businessRequestId,
            sender_user_id: auth.user.id,
            sender_role: 'ADMIN',
            body: message,
        })
        .select('id, business_request_id, sender_user_id, sender_role, body, created_at, read_at')
        .maybeSingle()

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
}
