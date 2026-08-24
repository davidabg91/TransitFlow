import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
    PlusCircle, Users, PiggyBank, ShieldCheck, Bell, AlertTriangle,
    ExternalLink, LifeBuoy, Settings, Clock, Nfc, Search, UserPlus, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDoc, tenantDoc } from '../tenant/db';
import { db } from '../firebase';
import { resolveCardInput } from '../data/cardsMapping';

/**
 * What staff see when they open the system.
 *
 * The card lookup leads, because it is what the desk does all day: a card comes
 * across the counter and somebody needs the profile behind it. Everything else
 * is a shortcut underneath.
 *
 * Deliberately not a dashboard — the numbers live in the panels, and repeating
 * them here would mean reading the whole company's data to draw a landing page.
 */

interface Shortcut {
    to: string;
    icon: React.ElementType;
    title: string;
    accent: string;
    roles: string[];
}

const SHORTCUTS: Shortcut[] = [
    { to: '/admin?tab=register', icon: PlusCircle, title: 'Издай карта', accent: '#00c853', roles: ['admin', 'moderator'] },
    { to: '/admin?tab=clients', icon: Users, title: 'Клиенти', accent: '#00ADB5', roles: ['admin', 'moderator'] },
    { to: '/admin?tab=finances', icon: PiggyBank, title: 'Финанси', accent: '#ff9800', roles: ['admin', 'moderator'] },
    { to: '/admin?tab=unpaid', icon: AlertTriangle, title: 'Без абонамент', accent: '#ff5252', roles: ['admin'] },
    { to: '/inspections', icon: ShieldCheck, title: 'Проверки', accent: '#00b0ff', roles: ['admin', 'inspector'] },
    { to: '/admin?tab=notifications', icon: Bell, title: 'Известия', accent: '#ff4081', roles: ['admin'] },
    { to: '/admin?tab=nfc', icon: ExternalLink, title: 'NFC кодове', accent: '#a78bfa', roles: ['admin'] },
    { to: '/system-admin', icon: Settings, title: 'Системен панел', accent: '#f87171', roles: ['admin'] },
    { to: '/help', icon: LifeBuoy, title: 'Помощ', accent: '#94a3b8', roles: ['admin', 'moderator', 'inspector'] },
];

const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Добра нощ';
    if (h < 12) return 'Добро утро';
    if (h < 18) return 'Добър ден';
    return 'Добър вечер';
};

const ROLE_LABEL: Record<string, string> = {
    admin: 'администратор',
    moderator: 'модератор',
    inspector: 'контрольор',
};

const Home: React.FC = () => {
    const { currentUser, tenantId, isPlatformAdmin } = useAuth();
    const navigate = useNavigate();
    const [company, setCompany] = useState('');
    const [now, setNow] = useState(new Date());
    const [cardInput, setCardInput] = useState('');
    const [lookupError, setLookupError] = useState<string | null>(null);
    const scanFieldRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!tenantId) return;
        getDoc(tenantDoc(db, tenantId))
            .then(snap => setCompany(String(snap.data()?.name || '')))
            .catch(() => { /* the header already covers a missing name */ });
    }, [tenantId]);

    // The desk reader announces a tap on this event, so a card held to the reader
    // opens its profile without anybody touching the keyboard.
    useEffect(() => {
        const onScan = (e: Event) => {
            const detail = (e as CustomEvent<{ id?: string; url?: string }>).detail || {};
            const code = resolveCardInput(String(detail.url || detail.id || ''));
            if (code) navigate(`/client/${code}`);
        };
        window.addEventListener('dary-nfc-scan', onScan);
        return () => window.removeEventListener('dary-nfc-scan', onScan);
    }, [navigate]);

    const role = currentUser?.role || '';
    const visible = useMemo(() => SHORTCUTS.filter(s => s.roles.includes(role)), [role]);
    const person = (currentUser?.username || '').split('@')[0];

    // After the hooks, never before: an early return above them would change how
    // many run between renders.
    if (isPlatformAdmin) return <Navigate to="/platform" replace />;

    const lookup = (e: React.FormEvent) => {
        e.preventDefault();
        const code = resolveCardInput(cardInput);
        if (!code) {
            setLookupError('Няма карта с този номер. Проверете и опитайте отново.');
            scanFieldRef.current?.focus();
            return;
        }
        setLookupError(null);
        navigate(`/client/${code}`);
    };

    return (
        <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem', color: '#fff' }}>

            {/* ── Masthead ───────────────────────────────────────────────── */}
            <header style={{ marginBottom: '2.25rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    marginBottom: '1rem', color: 'var(--text-secondary)',
                    fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                    <Clock size={13} />
                    {now.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}
                    {now.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <h1 style={{
                    margin: '0 0 0.7rem',
                    fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                    fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 0.98,
                    textWrap: 'balance',
                }}>
                    {greeting()}{person ? ', ' : ''}
                    {person && (
                        <span style={{
                            background: 'linear-gradient(100deg, var(--primary-color), #7dd3fc)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>{person}</span>
                    )}
                </h1>

                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
                    {company ? <><strong style={{ color: '#fff' }}>{company}</strong>{' · '}</> : null}
                    {ROLE_LABEL[role] ? `влезли сте като ${ROLE_LABEL[role]}` : 'влезли сте в системата'}
                </p>
            </header>

            {/* ── Card lookup: what the desk actually does all day ───────── */}
            <section style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: '26px', padding: 'clamp(1.5rem, 3vw, 2.25rem)',
                marginBottom: '2.5rem',
                background: 'linear-gradient(135deg, rgba(0,173,181,0.13), rgba(0,173,181,0.03) 55%, transparent)',
                border: '1px solid rgba(0,173,181,0.28)',
            }}>
                <div style={{
                    position: 'absolute', right: '-60px', top: '-60px', width: '260px', height: '260px',
                    background: 'radial-gradient(circle, rgba(0,173,181,0.18), transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                    <Nfc size={22} color="var(--primary-color)" />
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 850, letterSpacing: '-0.01em' }}>
                        Проверка на карта
                    </h2>
                </div>

                <p style={{
                    position: 'relative', margin: '0 0 1.35rem', maxWidth: '58ch',
                    color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6,
                }}>
                    Допрете картата до четеца или въведете номера ѝ. Ако картата е издадена, ще
                    се отвори профилът на притежателя; ако е нова — ще предложи да я активирате.
                </p>

                <form onSubmit={lookup} style={{ position: 'relative', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 0 }}>
                        <Search
                            size={18}
                            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
                        />
                        <input
                            ref={scanFieldRef}
                            value={cardInput}
                            onChange={e => { setCardInput(e.target.value); setLookupError(null); }}
                            placeholder="Номер на карта или код"
                            autoComplete="off"
                            aria-label="Номер на карта"
                            style={{
                                width: '100%', padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '14px', fontSize: '1.05rem',
                                background: 'rgba(0,0,0,0.32)', color: '#fff',
                                border: `1px solid ${lookupError ? '#ff5252' : 'var(--surface-border)'}`,
                                outline: 'none', fontVariantNumeric: 'tabular-nums',
                            }}
                        />
                    </div>

                    <button type="submit" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '1rem 1.75rem', borderRadius: '14px', border: 'none', cursor: 'pointer',
                        background: 'var(--primary-color)', color: '#00252a',
                        fontWeight: 850, fontSize: '1rem', whiteSpace: 'nowrap',
                    }}>
                        Отвори профил <ArrowRight size={17} />
                    </button>

                    {(role === 'admin' || role === 'moderator') && (
                        <Link to="/admin?tab=register" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '1rem 1.5rem', borderRadius: '14px', textDecoration: 'none',
                            background: 'rgba(255,255,255,0.05)', color: '#fff',
                            border: '1px solid var(--surface-border)',
                            fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap',
                        }}>
                            <UserPlus size={17} /> Нов клиент
                        </Link>
                    )}
                </form>

                {lookupError && (
                    <p style={{ position: 'relative', margin: '0.85rem 0 0', color: '#ff5252', fontSize: '0.88rem', fontWeight: 600 }}>
                        {lookupError}
                    </p>
                )}
            </section>

            {/* ── Shortcuts, laid out across ─────────────────────────────── */}
            <h2 style={{
                fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-secondary)',
                margin: '0 0 1rem',
            }}>
                Бърз достъп
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))',
                gap: '0.9rem',
            }}>
                {visible.map(({ to, icon: Icon, title, accent }) => (
                    <Link
                        key={to}
                        to={to}
                        className="home-tile"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.8rem',
                            padding: '1rem 1.1rem', borderRadius: '16px', textDecoration: 'none',
                            background: 'rgba(255,255,255,0.032)',
                            border: '1px solid var(--surface-border)',
                            color: '#fff', minWidth: 0,
                            transition: 'transform .16s ease, border-color .16s ease, background .16s ease',
                        }}
                    >
                        <span style={{
                            flexShrink: 0, width: '40px', height: '40px', borderRadius: '12px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: `${accent}1f`, border: `1px solid ${accent}3d`, color: accent,
                        }}>
                            <Icon size={19} />
                        </span>
                        <span style={{
                            fontWeight: 700, fontSize: '0.94rem', lineHeight: 1.25,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {title}
                        </span>
                    </Link>
                ))}
            </div>

            <style>{`
                .home-tile:hover {
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.06);
                }
                .home-tile:focus-visible {
                    outline: 2px solid var(--primary-color);
                    outline-offset: 3px;
                }
                @media (prefers-reduced-motion: reduce) {
                    .home-tile { transition: none; }
                    .home-tile:hover { transform: none; }
                }
            `}</style>
        </div>
    );
};

export default Home;
