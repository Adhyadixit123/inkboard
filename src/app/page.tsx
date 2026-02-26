import { MasonryFeed } from '@/components/MasonryFeed';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inkboard — Discover Writing You Love',
  description: 'Discover beautifully written stories, essays, and blog posts from Europe\'s most talented writers on Inkboard.',
};

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div style={{ paddingTop: '24px' }}>
      {/* Feed */}
      <MasonryFeed isLoggedIn={!!session} />
    </div>
  );
}
