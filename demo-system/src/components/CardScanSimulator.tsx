import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs, db } from '../firebase';
import { Nfc, X, CreditCard, ChevronUp } from 'lucide-react';
import { CARDS_MAPPING } from '../data/cardsMapping';

/**
 * Demo-only stand-in for the NFC reader.
 *
 * On the real myPOS Smart terminal a physical card tap is delivered by the
 * native `DaryScanner` plugin, which the app turns into a `dary-nfc-scan`
 * window event. The browser has no reader, so this panel fires the identical
 * event — everything downstream (TransitView, anti-passback, clone detection,
 * travel logging, quick renewal) runs the production code path untouched.
 */

interface DemoCard {
    id: string;
    name: string;
    route: string;
    cardType?: string;
    expiryDate?: string;
    isCanceled?: boolean;
    nfcUid?: string;
    cardNumber?: string;
}

type Scenario = {
    key: string;
    label: string;
    hint: string;
    color: string;
    pick: (cards: DemoCard[]) => { id: string; uid?: string; counter?: number } | null;
};

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isActive = (c: DemoCard) => !c.isCanceled && !!c.expiryDate && c.expiryDate >= currentMonth();
const isExpired = (c: DemoCard) => !c.isCanceled && (!c.expiryDate || c.expiryDate < currentMonth());

const SCENARIOS: Scenario[] = [
    {
        key: 'valid',
        label: 'Валидна карта',
        hint: 'Платен абонамент за текущия месец — зелен екран, пътуването се записва.',
        color: '#00e676',
        pick: cards => {
            const c = cards.find(isActive);
            return c ? { id: c.id, uid: c.nfcUid, counter: Date.now() % 100000 } : null;
        },
    },
    {
        key: 'expired',
        label: 'Изтекъл абонамент',
        hint: 'Картата е валидна физически, но без платен месец — червен екран и бърза заверка.',
        color: '#ff5252',
        pick: cards => {
            const c = cards.find(isExpired);
            return c ? { id: c.id, uid: c.nfcUid, counter: Date.now() % 100000 } : null;
        },
    },
    {
        key: 'canceled',
        label: 'Анулирана карта',
        hint: 'Загубена/подменена карта — системата отказва пътуването.',
        color: '#ff9100',
        pick: cards => {
            const c = cards.find(x => x.isCanceled);
            return c ? { id: c.id, uid: c.nfcUid, counter: Date.now() % 100000 } : null;
        },
    },
    {
        key: 'clone',
        label: 'Клонирана карта',
        hint: 'Същият номер, различен физически чип — вдига сигнал за дублирана карта.',
        color: '#ff1744',
        pick: cards => {
            const c = cards.find(isActive);
            return c ? { id: c.id, uid: '04DEADBEEF', counter: 1 } : null;
        },
    },
    {
        key: 'passback',
        label: 'Повторно сканиране',
        hint: 'Същата карта веднага след предишно пътуване — anti-passback защита.',
        color: '#ffab00',
        pick: cards => {
            const c = cards.find(isActive);
            return c ? { id: c.id, uid: c.nfcUid, counter: 1 } : null;
        },
    },
    {
        key: 'unknown',
        label: 'Нерегистрирана карта',
        hint: 'Празен носител от доставената партида — отваря регистрация на нов абонат или прехвърляне от загубена карта.',
        color: '#00b0ff',
        pick: cards => {
            // Must be a code that exists in the delivered card batch but is not
            // yet assigned — otherwise the app (correctly) refuses to activate it.
            const taken = new Set(cards.map(c => c.id));
            const free = Object.keys(CARDS_MAPPING).find(code => !taken.has(code));
            return free ? { id: free, uid: `04${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0')}` } : null;
        },
    },
];

const fireScan = (id: string, uid?: string, counter?: number) => {
    window.dispatchEvent(new CustomEvent('dary-nfc-scan', {
        detail: { id, physicalUid: uid, nfcCounter: counter },
    }));
};

const CardScanSimulator: React.FC = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [cards, setCards] = useState<DemoCard[]>([]);
    const [search, setSearch] = useState('');

    // The client profile page has its own scan flow; the login screen is a
    // dead end for a tap. Keep the simulator out of both.
    const hidden = location.pathname.startsWith('/login');

    useEffect(() => {
        if (!open || cards.length) return;
        getDocs(collection(db, 'clients')).then(snap => {
            setCards(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DemoCard, 'id'>) })));
        });
    }, [open, cards.length]);

    const matches = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return cards.slice(0, 8);
        return cards
            .filter(c => c.name?.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.cardNumber || '').includes(q))
            .slice(0, 8);
    }, [cards, search]);

    if (hidden) return null;

    return (
        <>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Симулатор на NFC сканиране"
                style={{
                    position: 'fixed', right: '16px', bottom: '16px', zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 18px', borderRadius: '50px', border: '1px solid rgba(0,173,181,0.45)',
                    background: 'linear-gradient(135deg, #00ADB5, #007f85)', color: '#fff',
                    fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                }}
            >
                {open ? <X size={18} /> : <Nfc size={18} />}
                {open ? 'Затвори' : 'Сканирай карта'}
            </button>

            {open && (
                <div
                    style={{
                        position: 'fixed', right: '16px', bottom: '76px', zIndex: 2000,
                        width: 'min(94vw, 380px)', maxHeight: '72vh', overflowY: 'auto',
                        background: '#161b22', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px', padding: '1.1rem', color: '#fff',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                        <Nfc size={18} color="#00ADB5" />
                        <strong style={{ fontSize: '0.95rem' }}>Симулатор на NFC четец</strong>
                    </div>
                    <p style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                        В реалната система картата се допира до бордовия терминал. Тук изберете сценарий —
                        системата реагира точно както при истинско сканиране.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {SCENARIOS.map(s => (
                            <button
                                key={s.key}
                                onClick={() => {
                                    const target = s.pick(cards);
                                    if (!target) return;
                                    fireScan(target.id, target.uid, target.counter);
                                    setOpen(false);
                                }}
                                style={{
                                    textAlign: 'left', padding: '0.7rem 0.85rem', borderRadius: '12px',
                                    background: `${s.color}12`, border: `1px solid ${s.color}40`,
                                    color: '#fff', cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: s.color }}>{s.label}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>{s.hint}</div>
                            </button>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                            <CreditCard size={14} /> ИЛИ ИЗБЕРЕТЕ КОНКРЕТНА КАРТА
                        </div>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Търсене по име или номер…"
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px',
                                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
                                color: '#fff', outline: 'none', fontSize: '0.85rem', marginBottom: '0.6rem',
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {matches.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { fireScan(c.id, c.nfcUid, Date.now() % 100000); setOpen(false); }}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
                                        padding: '0.55rem 0.7rem', borderRadius: '10px', textAlign: 'left',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                                        color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                    <span style={{
                                        flexShrink: 0, fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '20px',
                                        background: c.isCanceled ? 'rgba(255,145,0,0.15)' : isActive(c) ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)',
                                        color: c.isCanceled ? '#ff9100' : isActive(c) ? '#00e676' : '#ff5252',
                                    }}>
                                        {c.isCanceled ? 'АНУЛИРАНА' : isActive(c) ? 'ВАЛИДНА' : 'ИЗТЕКЛА'}
                                    </span>
                                </button>
                            ))}
                            {matches.length === 0 && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>Няма съвпадения.</div>
                            )}
                        </div>
                        {!search && cards.length > 8 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                <ChevronUp size={12} /> още {cards.length - 8} карти — използвайте търсенето
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default CardScanSimulator;
