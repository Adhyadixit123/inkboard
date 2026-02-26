import { MOCK_USERS, MOCK_POSTS } from '@/lib/mockData';
import { postRepository } from '@/lib/postRepository';
import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export function generateStaticParams() {
    return MOCK_USERS.map(u => ({ username: u.username }));
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    const user = MOCK_USERS.find(u => u.username === username);
    if (!user) return { title: 'User Not Found | Inkboard' };
    return {
        title: `${user.display_name} (@${user.username}) | Inkboard`,
        description: user.bio,
        openGraph: { images: [user.avatar_url ?? ''] },
    };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const user = MOCK_USERS.find(u => u.username === username) ?? MOCK_USERS[0];
    const allPosts = await postRepository.getAll();
    const posts = allPosts.filter(p => p.author_id === user.id && p.status === 'PUBLISHED' && !p.source);
    const likedPosts = MOCK_POSTS.filter(p => p.is_liked).slice(0, 6);
    return <ProfileClient user={user} posts={posts} likedPosts={likedPosts} />;
}
