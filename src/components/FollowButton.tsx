'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserMinus, Users } from 'lucide-react';

interface FollowButtonProps {
    targetUserId: string;
    initialIsFollowing?: boolean;
    showCounts?: boolean;
    followerCount?: number;
    followingCount?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'button' | 'text';
}

export default function FollowButton({
    targetUserId,
    initialIsFollowing = false,
    showCounts = false,
    followerCount = 0,
    followingCount = 0,
    size = 'md',
    variant = 'button'
}: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const [counts, setCounts] = useState({ followers: followerCount, following: followingCount });
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Check follow status on mount
    useEffect(() => {
        const checkFollowStatus = async () => {
            try {
                const res = await fetch(`/api/follows/check?userId=${targetUserId}`);
                const data = await res.json();
                if (data.success) {
                    setIsFollowing(data.isFollowing);
                    setCounts({
                        followers: data.followerCount || followerCount,
                        following: data.followingCount || followingCount
                    });
                }
            } catch (err) {
                console.error('Failed to check follow status:', err);
            }
        };
        checkFollowStatus();
    }, [targetUserId, followerCount, followingCount]);

    const handleFollow = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIdToFollow: targetUserId })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIsFollowing(true);
                setCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
                router.refresh();
            } else {
                setError(data.error || 'Failed to follow user');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, [targetUserId, isLoading, router]);

    const handleUnfollow = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/follows?userId=${targetUserId}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIsFollowing(false);
                setCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
                router.refresh();
            } else {
                setError(data.error || 'Failed to unfollow user');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, [targetUserId, isLoading, router]);

    const sizeClasses = {
        sm: { button: 'px-3 py-1.5 text-xs', icon: 14 },
        md: { button: 'px-4 py-2 text-sm', icon: 16 },
        lg: { button: 'px-6 py-3 text-base', icon: 18 }
    };

    if (variant === 'text') {
        return (
            <button
                onClick={isFollowing ? handleUnfollow : handleFollow}
                disabled={isLoading}
                className={`font-medium transition-colors ${
                    isFollowing
                        ? 'text-gray-600 hover:text-red-600'
                        : 'text-blue-600 hover:text-blue-700'
                } disabled:opacity-50`}
            >
                {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={isFollowing ? handleUnfollow : handleFollow}
                disabled={isLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all ${
                    isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        : 'bg-black text-white hover:bg-gray-800'
                } ${sizeClasses[size].button} disabled:opacity-50`}
            >
                {isLoading ? (
                    <span className="animate-spin">⏳</span>
                ) : isFollowing ? (
                    <>
                        <UserMinus size={sizeClasses[size].icon} />
                        Following
                    </>
                ) : (
                    <>
                        <UserPlus size={sizeClasses[size].icon} />
                        Follow
                    </>
                )}
            </button>

            {showCounts && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span className="font-semibold">{counts.followers.toLocaleString()}</span>
                        <span>followers</span>
                    </div>
                    <div>
                        <span className="font-semibold">{counts.following.toLocaleString()}</span>
                        <span className="ml-1">following</span>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
