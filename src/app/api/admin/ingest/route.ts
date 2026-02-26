import { NextResponse } from 'next/server';
import { contentIngestionService } from '@/content-ingestion/content-ingestion.service';

// Basic admin protection using a mock header since we don't have proper auth tokens yet
export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');

    // In a real app, you'd decode the JWT and check user.role === 'ADMIN'
    // For now, we simulate an admin guard
    if (authHeader !== 'Bearer admin-secret-key') {
        return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    try {
        await contentIngestionService.ingestAll();
        return NextResponse.json({ message: 'Content ingestion triggered successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
    }
}
