import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Follow a user
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userIdToFollow } = body

    if (!userIdToFollow) {
        return NextResponse.json({ error: 'userIdToFollow is required' }, { status: 400 })
    }

    if (user.id === userIdToFollow) {
        return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    try {
        // Check if already following
        const { data: existing } = await supabaseAdmin
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userIdToFollow)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
        }

        // Create follow relationship
        const { error: followError } = await supabaseAdmin
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: userIdToFollow
            })

        if (followError) throw followError

        // Update follower counts using database function
        await supabaseAdmin.rpc('update_follower_counts', {
            p_follower_id: user.id,
            p_following_id: userIdToFollow
        })

        return NextResponse.json({
            success: true,
            message: 'Following user',
            isFollowing: true
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to follow user'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Unfollow a user
export async function DELETE(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userIdToUnfollow = searchParams.get('userId')

    if (!userIdToUnfollow) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    try {
        // Delete follow relationship
        const { error: deleteError } = await supabaseAdmin
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userIdToUnfollow)

        if (deleteError) throw deleteError

        // Update follower counts
        await supabaseAdmin.rpc('update_follower_counts_on_unfollow', {
            p_follower_id: user.id,
            p_following_id: userIdToUnfollow
        })

        return NextResponse.json({
            success: true,
            message: 'Unfollowed user',
            isFollowing: false
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to unfollow user'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
