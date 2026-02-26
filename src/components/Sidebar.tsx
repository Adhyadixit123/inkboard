'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Plus, Bell, MessageCircle, Settings, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Sidebar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const navItems = [
        { href: '/', icon: <Home size={24} />, label: 'Home', public: true },
        { href: '/explore', icon: <Compass size={24} />, label: 'Explore', public: true },
        { href: '/compose', icon: <Plus size={24} />, label: 'Create', public: false },
        { href: '/notifications', icon: <Bell size={24} />, label: 'Notifications', public: false },
        { href: '/messages', icon: <MessageCircle size={24} />, label: 'Messages', public: false },
        { href: '/profile', icon: <User size={24} />, label: 'Profile', public: false },
    ];

    const displayItems = navItems.filter(item => item.public || isLoggedIn);

    return (
        <aside
            style={{
                width: '72px',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0 24px 0',
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                zIndex: 50,
            }}
        >
            {/* Logo */}
            <Link
                href="/"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-accent)',
                    color: 'white',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 800,
                    fontSize: '24px',
                    textDecoration: 'none',
                    marginBottom: '24px',
                    transition: 'opacity 200ms',
                }}
            >
                I
            </Link>

            {/* Navigation Icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {displayItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isActive ? 'var(--color-surface)' : 'var(--color-muted)',
                                background: isActive ? 'var(--color-primary)' : 'transparent',
                                transition: 'all 200ms',
                                textDecoration: 'none',
                            }}
                            className={isActive ? '' : 'hover-bg-muted'}
                        >
                            {/* Workaround for lucide icons inheriting color properly */}
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.icon}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <Link
                href="/settings"
                title="Settings"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-muted)',
                    transition: 'all 200ms',
                    textDecoration: 'none',
                }}
                className="hover-bg-muted"
            >
                <Settings size={24} />
            </Link>
        </aside>
    );
}
