import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const TOKEN_TTL_MINUTES = 15;

export async function POST() {
    try {
        const { count } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'ADMIN');

        if ((count ?? 0) > 0) {
            return NextResponse.json({ error: 'Admin already exists' }, { status: 409 });
        }

        const now = new Date();
        const nowIso = now.toISOString();

        const { data: existingToken } = await supabaseAdmin
            .from('admin_setup_tokens')
            .select('token, expires_at')
            .eq('used', false)
            .gt('expires_at', nowIso)
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingToken) {
            return NextResponse.json({
                token: existingToken.token,
                expiresAt: existingToken.expires_at,
            });
        }

        const token = randomUUID().replace(/-/g, '');
        const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

        await supabaseAdmin
            .from('admin_setup_tokens')
            .insert({ token, expires_at: expiresAt });

        return NextResponse.json({ token, expiresAt });
    } catch (error) {
        console.error('[admin-setup-link] failed', error);
        return NextResponse.json({ error: 'Unable to create setup link' }, { status: 500 });
    }
}
