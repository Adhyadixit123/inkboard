'use client';

export function PostCardSkeleton({ index = 0 }: { index?: number }) {
    const heights = ['260px', '340px', '200px', '420px', '280px', '300px'];

    return (
        <div className="masonry-item">
            <div className="skeleton-card">
                <div
                    className="skeleton"
                    style={{ height: heights[index % heights.length], width: '100%' }}
                />
                <div style={{ padding: '14px 16px' }}>
                    {/* Author row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                        <div className="skeleton" style={{ height: '12px', width: '100px' }} />
                    </div>
                    {/* Title */}
                    <div className="skeleton" style={{ height: '16px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '12px' }} />
                    {/* Excerpt */}
                    <div className="skeleton" style={{ height: '12px', marginBottom: '6px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '65%' }} />
                    {/* Tags */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <div className="skeleton" style={{ height: '22px', width: '70px', borderRadius: '20px' }} />
                        <div className="skeleton" style={{ height: '22px', width: '60px', borderRadius: '20px' }} />
                    </div>
                </div>
                {/* Engagement */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
                    <div className="skeleton" style={{ height: '14px', width: '40px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '40px' }} />
                </div>
            </div>
        </div>
    );
}
