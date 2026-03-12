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

async function requireUser() {
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
        .select('id, display_name, username, email')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        return { error: NextResponse.json({ error: profileError.message }, { status: 500 }), user: null }
    }

    return { error: null, user: profile ?? { id: user.id } }
}

export async function GET(req: NextRequest) {
    const auth = await requireUser()
    if (auth.error || !auth.user) return auth.error

    const requestedId = req.nextUrl.searchParams.get('businessRequestId')

    const businessRequestLookup = requestedId
        ? supabaseAdmin
            .from('business_requests')
            .select('id, user_id, business_name, status, reviewer_note, reviewed_by')
            .eq('id', requestedId)
            .eq('user_id', auth.user.id)
            .maybeSingle()
        : supabaseAdmin
            .from('business_requests')
            .select('id, user_id, business_name, status, reviewer_note, reviewed_by')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

    const { data: businessRequest, error: requestError } = await businessRequestLookup

    if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    if (!businessRequest) {
        return NextResponse.json({ request: null, messages: [] })
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
        .from('business_request_messages')
        .select('id, business_request_id, sender_user_id, sender_role, body, created_at, read_at')
        .eq('business_request_id', businessRequest.id)
        .order('created_at', { ascending: true })

    if (messagesError) {
        return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    await supabaseAdmin
        .from('business_request_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('business_request_id', businessRequest.id)
        .eq('sender_role', 'ADMIN')
        .is('read_at', null)

    return NextResponse.json({
        request: businessRequest,
        messages: (messages ?? []) as MessageRow[],
    })
}

export async function POST(req: Request) {
    const auth = await requireUser()
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
        .eq('user_id', auth.user.id)
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
            sender_role: 'USER',
            body: message,
        })
        .select('id, business_request_id, sender_user_id, sender_role, body, created_at, read_at')
        .maybeSingle()

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
}
