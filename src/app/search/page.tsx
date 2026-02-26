'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { MOCK_POSTS, MOCK_USERS, MOCK_TAGS } from '@/lib/mockData';
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';

function SearchResults() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') ?? '';
    const [query, setQuery] = useState(q);
    const [activeType, setActiveType] = useState<'posts' | 'authors' | 'tags'>('posts');

    const matchedPosts = MOCK_POSTS.filter(p =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(q.toLowerCase()) ||
        p.tags.some(t => t.name.includes(q.toLowerCase()))
    );

    const matchedUsers = MOCK_USERS.filter(u =>
        u.username.toLowerCase().includes(q.toLowerCase()) ||
        u.display_name.toLowerCase().includes(q.toLowerCase())
    );

    const matchedTags = MOCK_TAGS.filter(t => t.name.includes(q.toLowerCase()));

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    };

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '32px 24px' }}>
            {/* Search Box */}
            <div style={{ maxWidth: '640px', margin: '0 auto 36px' }}>
                <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                    <input
                        className="input"
                        style={{ paddingLeft: '48px', fontSize: '16px', borderRadius: '30px', paddingTop: '14px', paddingBottom: '14px' }}
                        placeholder="Search posts, authors, tags…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                </form>
            </div>

            {q && (
                <>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
                            Results for "<span style={{ color: 'var(--color-accent)' }}>{q}</span>"
                        </h1>
                        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
                            {matchedPosts.length} posts · {matchedUsers.length} authors · {matchedTags.length} tags
                        </p>

                        {/* Type Filter Tabs */}
                        <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid var(--color-border)', marginBottom: '28px' }}>
                            {(['posts', 'authors', 'tags'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setActiveType(type)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '10px 20px',
                                        fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
                                        color: activeType === type ? 'var(--color-accent)' : 'var(--color-muted)',
                                        borderBottom: `2px solid ${activeType === type ? 'var(--color-accent)' : 'transparent'}`,
                                        marginBottom: '-2px', transition: 'all 150ms', textTransform: 'capitalize',
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Posts */}
                        {activeType === 'posts' && (
                            matchedPosts.length > 0 ? (
                                <div className="masonry-grid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                                    {matchedPosts.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '48px 0' }}>No posts found.</p>
                            )
                        )}

                        {/* Authors */}
                        {activeType === 'authors' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {matchedUsers.length > 0 ? matchedUsers.map(user => (
                                    <Link key={user.id} href={`/u/${user.username}`} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            background: 'var(--color-surface)', borderRadius: '12px', padding: '16px 20px',
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            boxShadow: 'var(--shadow-card)', transition: 'var(--transition-card)',
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                            onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                                            <img src={user.avatar_url} alt={user.display_name} className="avatar" style={{ width: '56px', height: '56px' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)' }}>{user.display_name}</div>
                                                <div style={{ color: 'var(--color-muted)', fontSize: '13px' }}>@{user.username}</div>
                                                {user.bio && <div style={{ fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px', opacity: 0.7 }}>{user.bio.slice(0, 80)}…</div>}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>{user.follower_count.toLocaleString()}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>followers</div>
                                            </div>
                                        </div>
                                    </Link>
                                )) : (
                                    <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '48px 0' }}>No authors found.</p>
                                )}
                            </div>
                        )}

                        {/* Tags */}
                        {activeType === 'tags' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {matchedTags.length > 0 ? matchedTags.map(tag => (
                                    <Link key={tag.id} href={`/tag/${tag.name}`} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            background: 'var(--color-surface)', borderRadius: '12px', padding: '16px 24px',
                                            boxShadow: 'var(--shadow-card)', transition: 'var(--transition-card)',
                                            display: 'flex', flexDirection: 'column', gap: '4px',
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                            onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700, color: 'var(--color-accent)' }}>#{tag.name}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{tag.post_count.toLocaleString()} posts</span>
                                        </div>
                                    </Link>
                                )) : (
                                    <p style={{ color: 'var(--color-muted)', padding: '48px 0' }}>No tags found.</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* No query state */}
            {!q && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-muted)' }}>
                    <Search size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p style={{ fontSize: '16px', fontFamily: 'var(--font-ui)' }}>Search for posts, authors, or tags</p>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-muted)' }}>Loading…</div>}>
            <SearchResults />
        </Suspense>
    );
}
