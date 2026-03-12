import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    try {
        const { count } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'ADMIN');

        const now = new Date().toISOString();
        const { data: tokenRow } = await supabaseAdmin
            .from('admin_setup_tokens')
            .select('token, expires_at, used')
            .eq('used', false)
            .gt('expires_at', now)
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return NextResponse.json({
            hasAdmin: (count ?? 0) > 0,
            setupLinkActive: Boolean(tokenRow),
            expiresAt: tokenRow?.expires_at ?? null,
        });
    } catch (error) {
        console.error('[admin-status] failed', error);
        return NextResponse.json({ error: 'Unable to determine admin status' }, { status: 500 });
    }
}
