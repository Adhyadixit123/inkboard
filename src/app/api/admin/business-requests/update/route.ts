import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateAdminConsoleCache } from '@/lib/admin/consoleCache'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, userId, status } = await req.json()
    if (!id || !userId || !status) {
        return NextResponse.json({ error: 'id, userId and status are required' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.from('business_requests').update({ status }).eq('id', id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (String(status).toUpperCase() === 'APPROVED') {
        await supabaseAdmin.from('users').update({ is_business: true }).eq('id', userId)
    }

    invalidateAdminConsoleCache()

    return NextResponse.json({ success: true })
}
