function formatToday() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export const runtime = 'nodejs';

import Link from 'next/link';
import { postRepository } from '@/lib/postRepository';

export default async function ExplorePage() {
  const posts = await postRepository.getAll();
  const valid = posts
    .filter(p => p.status === 'PUBLISHED' && p.content && p.content.trim().length > 0)
    .slice(0, 12);
  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      <div style={{ maxWidth: '1380px', width: '90%', margin: '0 auto', padding: '24px 0 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>{formatToday()}</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '6px 0 0', color: '#111' }}>Stay Inspired</h1>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
            justifyItems: 'center',
          }}
        >
          {valid.map((card) => (
            <Link
              key={card.id}
              href={`/post/${card.id}`}
              style={{
                width: '100%',
                maxWidth: '420px',
                borderRadius: '22px',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '4 / 5',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                textDecoration: 'none',
              }}
            >
              <img
                src={card.cover_image_url || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80'}
                alt={card.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '18px',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{card.subtitle || card.tags?.[0]?.name || card.source?.toUpperCase() || 'Featured'}</div>
                <div style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.25 }}>{card.title}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', color: '#555' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '18px 20px', borderRadius: '18px', background: '#fff', border: '1px solid #e5e5e5' }}>
            <span style={{ fontWeight: 700 }}>That’s all for today!</span>
            <span style={{ color: '#777' }}>Come back tomorrow for more inspiration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
