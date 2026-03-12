import { supabaseAdmin } from '@/lib/supabase/admin';

export type AdminSetupTokenRow = {
    token: string;
    expires_at: string;
    used: boolean;
    used_at?: string | null;
};

export async function hasAdminUser() {
    const { count, error } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN');

    if (error) throw error;
    return (count ?? 0) > 0;
}

export async function getActiveSetupToken(token?: string) {
    const nowIso = new Date().toISOString();

    if (token) {
        const { data, error } = await supabaseAdmin
            .from('admin_setup_tokens')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', nowIso)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data as AdminSetupTokenRow | null;
    }

    const { data, error } = await supabaseAdmin
        .from('admin_setup_tokens')
        .select('*')
        .eq('used', false)
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return (data ?? null) as AdminSetupTokenRow | null;
}

export async function markTokenUsed(token: string) {
    await supabaseAdmin
        .from('admin_setup_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);
}

export async function generateUniqueUsername(seed: string) {
    const base = (seed || 'admin')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 20) || 'admin';

    let username = base;
    let suffix = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('username', username)
            .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
            return username;
        }

        username = `${base}-${suffix}`;
        suffix += 1;
    }
}
