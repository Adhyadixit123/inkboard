import { MailPlus, MoreVertical, Search, X } from 'lucide-react';

const conversations = [
  {
    id: '1',
    title: 'Pinterest India',
    subtitle: 'Sent a Pin',
    time: '4y',
    avatar: 'https://i.pinimg.com/140x140_RS/fd/d2/98/fdd2982c1256e0ce15fae785c7eec669.jpg',
    unread: true,
  },
];

const suggested = [
  { id: 's1', title: '4sure group', handle: '@joelwandjii', avatar: 'https://i.pinimg.com/140x140_RS/b6/8b/76/b68b76b74b533baeafef330b846b5e55.jpg' },
  { id: 's2', title: 'Cardlwise', handle: '@cardlwise', avatar: '' },
  { id: 's3', title: 'Invite your friends', handle: 'Connect to start chatting', avatar: '', invite: true },
];

export const runtime = 'nodejs';

export default function MessagesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'grid', gridTemplateColumns: '360px 1fr' }}>
      {/* Left Inbox */}
      <div style={{ borderRight: '1px solid #e5e5e5', background: '#fff', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Messages</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', padding: '8px' }} aria-label="More options">
              <MoreVertical size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', padding: '8px' }} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <button className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#fbe9ef', display: 'grid', placeItems: 'center' }}>
              <MailPlus size={18} color="#c00" />
            </div>
            <span style={{ fontWeight: 700 }}>New message</span>
          </button>
        </div>

        <div style={{ padding: '0 16px 8px', color: '#888', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Messages</div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', padding: '0 8px 16px' }}>
          {conversations.map((c) => (
            <div key={c.id} style={{ padding: '6px 8px' }}>
              <button
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  background: c.unread ? '#fef2f2' : 'transparent',
                  border: c.unread ? '1px solid #f5d5d5' : '1px solid transparent',
                  justifyContent: 'flex-start',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={c.avatar} alt={c.title} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                  {c.unread && <span style={{ position: 'absolute', top: -2, left: -2, width: 8, height: 8, borderRadius: '50%', background: '#c00' }} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: '#777' }}>{c.subtitle}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#777' }}>{c.time}</div>
              </button>
            </div>
          ))}

          <div style={{ padding: '12px 8px 6px', color: '#888', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Suggested</div>
          {suggested.map((s) => (
            <div key={s.id} style={{ padding: '6px 8px' }}>
              <button
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  border: '1px solid transparent',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#eee', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontWeight: 700, color: '#777' }}>{s.title.charAt(0)}</span>
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: '#777' }}>{s.handle}</div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane */}
      <div style={{ padding: '24px', background: '#f8f8f8', minHeight: '100vh' }}>
        <div style={{
          maxWidth: '840px',
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #ededed',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="input"
                placeholder="Search your Pins"
                style={{ width: '100%', borderRadius: '28px', padding: '12px 16px', background: '#fff', border: '1px solid #e0e0e0' }}
              />
              <Search size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#777' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 800, margin: 0 }}>Your saved ideas</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Pins', 'Boards', 'Collages'].map((tab) => (
                <button key={tab} style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '20px',
                  padding: '10px 18px',
                  background: tab === 'Boards' ? '#111' : '#fff',
                  color: tab === 'Boards' ? '#fff' : '#333',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}>{tab}</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '10px 14px', border: '1px solid #e0e0e0' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.87 8H24V6h-4.13a4 4 0 0 0-7.74 0H0v2h12.13a4 4 0 0 0 7.74 0M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-6.13 9a4 4 0 0 0-7.74 0H0v2h4.13a4 4 0 0 0 7.74 0H24v-2zM10 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0" fill="#111"/></svg>
              Group
            </button>
            <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '10px 16px', marginLeft: 'auto' }}>
              Create
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <img src="https://s.pinimg.com/gestalt/illustrations/v1/ill.pinboard.spot.light.svg" alt="Organize" style={{ width: 220, margin: '0 auto 12px' }} />
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Organize your ideas</div>
            <p style={{ color: '#666', fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.6 }}>
              Pins are sparks of inspiration. Boards are where they live. Create boards to organize your Pins your way.
            </p>
            <button className="btn btn-primary" style={{ borderRadius: '20px', padding: '12px 18px', fontWeight: 700 }}>
              Create a board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
