export function InvalidSetupMessage({ message }: { message: string }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '24px' }}>
            <div style={{ maxWidth: '420px', width: '100%', background: 'var(--color-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-card)', padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>⛔</div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', marginBottom: '8px' }}>Setup link not available</h1>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
            </div>
        </div>
    );
}
