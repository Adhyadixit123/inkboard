import { MOCK_POSTS } from '@/lib/mockData';
import { postRepository } from '@/lib/postRepository';
import { ProfileClient } from '../u/[username]/ProfileClient';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export default async function SelfProfilePage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    
    if (!session?.user) {
        return <div>Please log in to view your profile</div>;
    }
    
    // Fetch current user from Supabase
    const { data: user } = await supabase
        .from('users')
        .select('id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_verified, is_business, created_at')
        .eq('id', session.user.id)
        .single();
    
    if (!user) {
        // User doesn't exist in database yet - create a basic profile
        const email = session.user.email || 'unknown@example.com';
        const username = email.split('@')[0];
        
        return (
            <ProfileClient 
                user={{
                    id: session.user.id,
                    username,
                    display_name: username,
                    bio: '',
                    avatar_url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`,
                    follower_count: 0,
                    following_count: 0,
                    created_at: new Date().toISOString()
                }} 
                posts={[]} 
                likedPosts={[]} 
                isOwnProfile={true}
            />
        );
    }
    
    const allPosts = await postRepository.getAll();
    const posts = allPosts.filter(p => p.author_id === user.id && p.status === 'PUBLISHED' && !p.source);
    
    return (
        <ProfileClient 
            user={user} 
            posts={posts} 
            likedPosts={MOCK_POSTS.filter(p => p.is_liked).slice(0, 6)} 
            isOwnProfile={true}
        />
    );
}
