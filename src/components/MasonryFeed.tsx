'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { MOCK_POSTS, MOCK_INTERESTS } from '@/lib/mockData';
import type { Post } from '@/types';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const INTERESTS_STRIP = MOCK_INTERESTS.slice(0, 12);

// ─── Stable column buckets ────────────────────────────────────────────────────
// We render N separate column divs and assign each post to a column by its
// index modulo N. This means new posts only append to the bottom of their
// target column — existing cards NEVER move/reflow when more posts load.
function useColumnCount(): number {
    const [cols, setCols] = useState(4);
    useEffect(() => {
        function update() {
            const w = window.innerWidth;
            if (w < 640) setCols(2);
            else if (w < 1024) setCols(3);
            else if (w < 1440) setCols(4);
            else setCols(5);
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return cols;
}

function MasonryColumns({ posts }: { posts: Post[] }) {
    const numCols = useColumnCount();

    // Build column arrays — each post goes to col = index % numCols
    const columns = useMemo(() => {
        const cols: Post[][] = Array.from({ length: numCols }, () => []);
        posts.forEach((post, i) => cols[i % numCols].push(post));
        return cols;
    }, [posts, numCols]);

    return (
        <div className="masonry-columns-container">
            {columns.map((colPosts, colIdx) => (
                <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                    {colPosts.map((post, rowIdx) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            index={colIdx + rowIdx * numCols}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Feed Inner ───────────────────────────────────────────────────────────────
function FeedInner({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const searchParams = useSearchParams();
    const currentTopic = searchParams.get('topic') || 'Top News';

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [activeInterest, setActiveInterest] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Initial load from Edge Function
    useEffect(() => {
        setLoading(true);
        setPosts([]);
        fetch(`/api/feed?topic=${encodeURIComponent(currentTopic)}&page=1`)
            .then(res => res.json())
            .then(data => {
                setPosts(data.posts || []);
                setHasMore(data.hasMore);
                setPage(2);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [currentTopic]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!loaderRef.current || loading) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { rootMargin: '4000px' }
        );
        observer.observe(loaderRef.current);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, hasMore, loadingMore, posts]);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        fetch(`/api/feed?topic=${encodeURIComponent(currentTopic)}&page=${page}`)
            .then(res => res.json())
            .then(data => {
                if (data.posts && data.posts.length > 0) {
                    setPosts(prev => {
                        const ids = new Set(prev.map(p => p.id));
                        const fresh = data.posts.filter((p: Post) => !ids.has(p.id));
                        return [...prev, ...fresh];
                    });
                    setPage(p => p + 1);
                } else {
                    setHasMore(false);
                }
                setLoadingMore(false);
            })
            .catch(() => setLoadingMore(false));
    };

    const displayPosts = activeInterest
        ? posts.filter(p => p.tags.some(t => t.name === activeInterest.toLowerCase()) || p.author.bio?.toLowerCase().includes(activeInterest.toLowerCase()))
        : posts;

    const trendingPosts = displayPosts.filter(p => p.is_trending).slice(0, 6);

    return (
        <>
            {/* Interests Strip (authenticated users) */}
            {isLoggedIn && (
                <div className="interests-strip">
                    <button
                        className={`interest-pill ${!activeInterest ? 'active' : ''}`}
                        onClick={() => setActiveInterest(null)}
                    >
                        ✨ For You
                    </button>
                    {INTERESTS_STRIP.map(interest => (
                        <button
                            key={interest.id}
                            className={`interest-pill ${activeInterest === interest.name ? 'active' : ''}`}
                            onClick={() => setActiveInterest(activeInterest === interest.name ? null : interest.name)}
                        >
                            {interest.icon} {interest.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Trending Strip (authenticated users) */}
            {isLoggedIn && !activeInterest && (
                <div style={{ padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <Flame size={18} style={{ color: 'var(--color-trending)' }} />
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '18px' }}>
                            Trending Today
                        </h2>
                    </div>
                    <div className="trending-strip">
                        {trendingPosts.map(post => (
                            <Link key={post.id} href={`/post/${post.id}`} style={{ textDecoration: 'none' }}>
                                <div className="trending-card">
                                    <div style={{ height: '110px', overflow: 'hidden' }}>
                                        <img src={post.cover_image_url} alt={post.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ padding: '10px 12px 12px' }}>
                                        <p style={{
                                            fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '13px',
                                            lineHeight: '1.3', color: 'var(--color-primary)',
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {post.title}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '5px' }}>
                                            {post.author.display_name}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Section Label */}
            <div style={{ padding: '24px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>
                    {activeInterest ? `#${activeInterest}` : isLoggedIn ? 'Your Feed' : 'Discover'}
                </h2>
                {displayPosts.length > 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                        {displayPosts.length} stories
                    </span>
                )}
            </div>

            {/* Masonry Grid — explicit column buckets so new cards never displace old ones */}
            {loading ? (
                <div className="masonry-grid" style={{ paddingTop: 0 }}>
                    {Array.from({ length: 8 }).map((_, i) => <PostCardSkeleton key={i} index={i} />)}
                </div>
            ) : (
                <MasonryColumns posts={displayPosts} />
            )}

            {/* Load More Skeletons — appended BELOW existing content, not replacing it */}
            {loadingMore && (
                <div style={{ display: 'flex', gap: '16px', padding: '16px 16px 0', alignItems: 'flex-start' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ flex: 1 }}>
                            <PostCardSkeleton index={i} />
                        </div>
                    ))}
                </div>
            )}

            {/* IntersectionObserver Sentinel */}
            {!loading && hasMore && (
                <div ref={loaderRef} style={{ height: '40px' }} />
            )}

            {/* End of feed */}
            {(!hasMore && !loading) && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: '14px' }}>
                    <p>✨ You've seen all the stories for now. Refresh for more.</p>
                </div>
            )}
        </>
    );
}

export function MasonryFeed(props: { isLoggedIn?: boolean }) {
    return (
        <Suspense fallback={
            <div className="masonry-grid" style={{ paddingTop: 0 }}>
                {Array.from({ length: 12 }).map((_, i) => <PostCardSkeleton key={i} index={i} />)}
            </div>
        }>
            <FeedInner {...props} />
        </Suspense>
    );
}
