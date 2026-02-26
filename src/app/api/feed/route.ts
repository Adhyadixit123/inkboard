import { NextResponse } from 'next/server';
import { contentIngestionService } from '@/content-ingestion/content-ingestion.service';
import { postRepository } from '@/lib/postRepository';

export const runtime = 'nodejs'; // Use nodejs because axios / hashing might break on edge unnecessarily

// A simple in-memory flag to ensure we only auto-ingest once on first load during dev
let hasAutoIngested = false;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 30;

    // Auto-ingest on the very first feed request during dev.
    // Runs asynchronously so it doesn't hang the feed request.
    if (!hasAutoIngested) {
        hasAutoIngested = true;
        contentIngestionService.ingestAll().catch(err => {
            console.error('Initial auto-ingestion failed', err);
        });
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;

    const allPosts = await postRepository.getAll();

    // Only serve posts that can open a real detail page
    const validPosts = allPosts.filter(p => {
        if (p.status !== 'PUBLISHED') return false;
        if (p.source === 'guardian') return false;
        if (p.id.includes('/')) return false;
        if (!p.content || p.content.trim().length === 0) return false;
        return true;
    });

    // Serve directly from the mocked / in-memory DB
    let pagedPosts = validPosts.slice(start, end);

    // Loop feeds to keep it endless in dev environment
    if (pagedPosts.length === 0 && validPosts.length > 0) {
        pagedPosts = validPosts.slice(0, perPage).map(p => ({ ...p, id: p.id + '-cycle-' + page }));
    }

    return NextResponse.json({
        posts: pagedPosts,
        hasMore: true
    });
}
