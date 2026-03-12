import { redirect } from 'next/navigation';
import { AdminSetupClient } from '../AdminSetupClient';
import { getActiveSetupToken, hasAdminUser } from '@/lib/admin/setup';
import { InvalidSetupMessage } from './InvalidSetupMessage';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminSetupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    // searchParams is a promise in RSC entrypoints; await it before use.
    const resolvedParams = await searchParams;
    const rawToken = resolvedParams?.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    if (!token) {
        return <InvalidSetupMessage message="Missing token. Ask the team to generate a new admin setup link." />;
    }

    if (await hasAdminUser()) {
        redirect('/admin');
    }

    const tokenRow = await getActiveSetupToken(token);
    if (!tokenRow) {
        return <InvalidSetupMessage message="This link is invalid, expired, or already used. Generate a fresh link from the login page." />;
    }

    return <AdminSetupClient token={tokenRow.token} expiresAt={tokenRow.expires_at} />;
}
