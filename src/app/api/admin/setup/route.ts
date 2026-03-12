import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueUsername, getActiveSetupToken, hasAdminUser, markTokenUsed } from '@/lib/admin/setup';

export async function POST(req: Request) {
    try {
        const { token, email, password, displayName } = await req.json();

        if (!token || !email || !password) {
            return NextResponse.json({ error: 'token, email and password are required' }, { status: 400 });
        }

        if (await hasAdminUser()) {
            return NextResponse.json({ error: 'Admin already exists' }, { status: 409 });
        }

        const tokenRow = await getActiveSetupToken(token);
        if (!tokenRow) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 410 });
        }

        const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                display_name: displayName || 'Administrator',
            },
        });

        if (createError || !data?.user) {
            console.error('[admin-setup] createUser failed', createError);
            return NextResponse.json({ error: 'Unable to create admin user' }, { status: 500 });
        }

        const username = await generateUniqueUsername(email.split('@')[0] || 'admin');

        const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
                id: data.user.id,
                email,
                username,
                display_name: displayName || data.user.user_metadata?.display_name || 'Administrator',
                role: 'ADMIN',
                is_verified: true,
                is_business: false,
                created_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error('[admin-setup] insert into users failed', insertError);
            return NextResponse.json({ error: 'Unable to persist admin profile' }, { status: 500 });
        }

        await markTokenUsed(token);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin-setup] unexpected error', error);
        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
    }
}
