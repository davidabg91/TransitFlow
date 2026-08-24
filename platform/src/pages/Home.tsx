import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusCircle, Users, PiggyBank, ShieldCheck, Bell, AlertTriangle,
    ExternalLink, LifeBuoy, Settings, ArrowRight, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDoc, tenantDoc } from '../tenant/db';
import { db } from '../firebase';

/**
 * What staff see when they open the system.
 *
 * Deliberately not a dashboard: the numbers live in the panels, and duplicating
 * them here would mean reading the whole company's data just to render a
 * landing page. This is a way in — the handful of things somebody actually
 * starts their shift with, one click away, filtered to what their role can do.
 */

interface Shortcut {
    to: string;
    icon: React.ElementType;
    title: string;
    hint: string;
    accent: string;
    roles: string[];
}

const SHORTCUTS: Shortcut[] = [
    {
        to: '/admin?tab=register', icon: PlusCircle, accent: '#00c853',
        title: 'Издай карта',
        hint: 'Регистрирай нов абонат и запиши картата му',
        roles: ['admin', 'moderator'],
    },
    {
        to: '/admin?tab=clients', icon: Users, accent: 'var(--primary-color)',
        title: 'Клиенти',
        hint: 'Търсене, подновяване и управление на карти',
        roles: ['admin', 'moderator'],
    },
    {
        to: '/admin?tab=finances', icon: PiggyBank, accent: '#ff9800',
        title: 'Финанси',
        hint: 'Оборот, каса за деня и отчети',
        roles: ['admin', 'moderator'],
    },
    {
        to: '/admin?tab=unpaid', icon: AlertTriangle, accent: '#ff5252',
        title: 'Без абонамент',
        hint: 'Кой пътува без платен месец',
        roles: ['admin'],
    },
    {
        to: '/inspections', icon: ShieldCheck, accent: '#00b0ff',
        title: 'Проверки',
        hint: 'Контрол на пътници и протоколи',
        roles: ['admin', 'inspector'],
    },
    {
        to: '/admin?tab=notifications', icon: Bell, accent: '#ff4081',
        title: 'Известия',
        hint: 'Съобщения до пътниците по линии',
        roles: ['admin'],
    },
    {
        to: '/admin?tab=nfc', icon: ExternalLink, accent: 'var(--accent-color)',
        title: 'NFC кодове',
        hint: 'Генериране на линкове за нови карти',
        roles: ['admin'],
    },
    {
        to: '/system-admin', icon: Settings, accent: '#ff5252',
        title: 'Системен панел',
        hint: 'Потребители, одит и сигурност',
        roles: ['admin'],
    },
];

const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Добра нощ';
    if (h < 12) return 'Добро утро';
    if (h < 18) return 'Добър ден';
    return 'Добър вечер';
};

const ROLE_LABEL: Record<string, string> = {
    admin: 'Администратор',
    moderator: 'Модератор',
    inspector: 'Контрольор',
};

const Home: React.FC = () => {
    const { currentUser, tenantId } = useAuth();
    const [company, setCompany] = useState('');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!tenantId) return;
        getDoc(tenantDoc(db, tenantId))
            .then(snap => setCompany(String(snap.data()?.name || '')))
            .catch(() => { /* the header already handles a missing name */ });
    }, [tenantId]);

    const role = currentUser?.role || '';
    const visible = useMemo(() => SHORTCUTS.filter(s => s.roles.includes(role)), [role]);
    const person = (currentUser?.username || '').split('@')[0];

    return (
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2.5rem 1rem 4rem', color: '#fff' }}>

            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.35rem 0.9rem', borderRadius: '50px', marginBottom: '1rem',
                    background: 'rgba(0,173,181,0.1)', border: '1px solid rgba(0,173,181,0.25)',
                    color: 'var(--primary-color)', fontSize: '0.78rem', fontWeight: 800,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                    <Clock size={13} />
                    {now.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}
                    {now.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <h1 style={{
                    margin: '0 0 0.6rem', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1,
                }}>
                    {greeting()}{person ? `, ${person}` : ''}
                </h1>

                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6 }}>
                    {company ? <>Влезли сте в системата на <strong style={{ color: '#fff' }}>{company}</strong>.</> : 'Влезли сте в системата.'}
                    {ROLE_LABEL[role] && <> Вашата роля е <strong style={{ color: '#fff' }}>{ROLE_LABEL[role].toLowerCase()}</strong>.</>}
                </p>
            </header>

            <h2 style={{
                fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-secondary)',
                margin: '0 0 1rem',
            }}>
                Бърз достъп
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))',
                gap: '1rem',
            }}>
                {visible.map(({ to, icon: Icon, title, hint, accent }) => (
                    <Link
                        key={to}
                        to={to}
                        className="home-card"
                        style={{
                            display: 'flex', flexDirection: 'column', gap: '0.85rem',
                            padding: '1.4rem', borderRadius: '18px', textDecoration: 'none',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--surface-border)',
                            color: '#fff',
                            transition: 'transform .18s ease, border-color .18s ease, background .18s ease',
                        }}
                    >
                        <span style={{
                            width: '44px', height: '44px', borderRadius: '13px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)`,
                            color: accent,
                        }}>
                            <Icon size={21} />
                        </span>

                        <span>
                            <span style={{ display: 'block', fontWeight: 800, fontSize: '1.02rem', marginBottom: '0.2rem' }}>
                                {title}
                            </span>
                            <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {hint}
                            </span>
                        </span>

                        <span style={{
                            marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            color: accent, fontWeight: 700, fontSize: '0.82rem',
                        }}>
                            Отвори <ArrowRight size={14} />
                        </span>
                    </Link>
                ))}
            </div>

            <Link
                to="/help"
                className="home-card"
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.9rem',
                    marginTop: '1rem', padding: '1.1rem 1.4rem', borderRadius: '18px',
                    textDecoration: 'none', color: '#fff',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed var(--surface-border)',
                    transition: 'border-color .18s ease, background .18s ease',
                }}
            >
                <LifeBuoy size={20} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                    Не сте сигурни откъде да започнете? <strong style={{ color: '#fff' }}>Ръководството</strong> обяснява всяка стъпка.
                </span>
            </Link>

            <style>{`
                .home-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.18);
                    background: rgba(255,255,255,0.055);
                }
                .home-card:focus-visible {
                    outline: 2px solid var(--primary-color);
                    outline-offset: 3px;
                }
                @media (prefers-reduced-motion: reduce) {
                    .home-card { transition: none; }
                    .home-card:hover { transform: none; }
                }
            `}</style>
        </div>
    );
};

export default Home;
