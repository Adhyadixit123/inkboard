import { NextResponse } from 'next/server';
import { postRepository } from '@/lib/postRepository';
import type { Post, Tag, User } from '@/types';
import { MOCK_USERS } from '@/lib/mockData';
import crypto from 'crypto';

export const runtime = 'nodejs';

type CreatePostBody = {
    title: string;
    subtitle?: string;
    content: string;
    cover_image_url: string;
    cover_aspect_ratio?: Post['cover_aspect_ratio'];
    tags: string[];
};

function toTag(name: string): Tag {
    const clean = name.toLowerCase().trim();
    return { id: clean, name: clean, post_count: 1 };
}

function computeReadTimeMinutes(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

function getDemoAuthor(): User {
    return MOCK_USERS[2] ?? MOCK_USERS[0];
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CreatePostBody>;

        if (!body.title || !body.content || !body.cover_image_url || !Array.isArray(body.tags) || body.tags.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const author = getDemoAuthor();
        const id = `user-${crypto.randomUUID()}`;

        const post: Post = {
            id,
            author_id: author.id,
            author,
            title: body.title,
            subtitle: body.subtitle || '',
            content: body.content,
            cover_image_url: body.cover_image_url,
            cover_aspect_ratio: body.cover_aspect_ratio || '4:3',
            status: 'PUBLISHED',
            read_time_minutes: computeReadTimeMinutes(body.content),
            engagement_score: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            is_trending: false,
            is_liked: false,
            tags: body.tags.map(toTag),
            created_at: now,
            published_at: now,
        };

        await postRepository.upsertMany([post]);

        return NextResponse.json({ post });
    } catch {
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
