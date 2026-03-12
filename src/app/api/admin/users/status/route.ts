import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { invalidateAdminConsoleCache } from '@/lib/admin/consoleCache'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (adminError || adminProfile?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, status, reason } = body

    if (!userId || !status || !['ACTIVE', 'BANNED', 'SHADOW_BANNED', 'DEACTIVATED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    try {
        const { data, error } = await supabaseAdmin.rpc('admin_set_user_status', {
            p_user_id: userId,
            p_status: status,
            p_reason: reason,
            p_admin_id: user.id,
        })

        if (error) throw error

        invalidateAdminConsoleCache()

        return NextResponse.json({
            success: true,
            result: Array.isArray(data) ? data[0] : data,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update user status'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
