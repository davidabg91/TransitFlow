import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onSnapshot, query } from '../tenant/db';
import { collection as fsCollection } from 'firebase/firestore';
import app, { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';

/**
 * Platform owner's screen: create the companies that use TransitFlow.
 *
 * Everything here runs through Cloud Functions with the Admin SDK — creating a
 * company means creating an auth account and writing custom claims, neither of
 * which a browser is allowed to do. The page only collects the details and
 * reports what happened.
 */

const REGION = 'europe-west3';

interface Tenant {
    id: string;
    name?: string;
    createdAt?: string;
    cardUrlPrefix?: string;
    active?: boolean;
}

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--surface-border)',
    borderRadius: '20px',
    padding: '1.75rem',
};

const label: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
};

const input: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid var(--surface-border)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
};

const PlatformAdmin: React.FC = () => {
    const { signedInEmail, isPlatformAdmin, refreshClaims } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const [tenantId, setTenantId] = useState('');
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // The company registry sits outside any company, so it is read directly
    // rather than through the tenant-scoped helpers.
    useEffect(() => {
        if (!isPlatformAdmin) return;
        const unsub = onSnapshot(
            query(fsCollection(db, 'tenants')),
            snap => setTenants(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tenant, 'id'>) }))),
            err => console.error('Tenant list unavailable:', err)
        );
        return () => unsub();
    }, [isPlatformAdmin]);

    const call = (fnName: string) => httpsCallable(getFunctions(app, REGION), fnName);

    const runBootstrap = async () => {
        setBusy(true); setError(null); setDone(null);
        try {
            await call('bootstrapPlatformAdmin')({});
            await refreshClaims();
            setDone('Платформата е инициализирана. Вече можете да създавате фирми.');
        } catch (e) {
            setError((e as { message?: string }).message || 'Неуспешна инициализация.');
        } finally {
            setBusy(false);
        }
    };

    const createTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true); setError(null); setDone(null);
        try {
            await call('provisionTenant')({
                tenantId: tenantId.trim().toLowerCase(),
                name: name.trim(),
                adminEmail: adminEmail.trim(),
                adminPassword,
            });
            setDone(`Фирма „${name}“ е създадена. Администраторът може да влезе с ${adminEmail}.`);
            setTenantId(''); setName(''); setAdminEmail(''); setAdminPassword('');
        } catch (e) {
            setError((e as { message?: string }).message || 'Неуспешно създаване.');
        } finally {
            setBusy(false);
        }
    };

    // Gated on being signed in, not on having access — the whole point of this
    // screen is to grant the owner rights they do not have yet.
    if (!signedInEmail) {
        return <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Трябва да влезете.</div>;
    }

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
                <ShieldCheck size={26} color="var(--primary-color)" />
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Платформа</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '2rem' }}>
                Управление на фирмите, които използват TransitFlow.
            </p>

            {error && (
                <div style={{ ...card, borderColor: 'rgba(255,82,82,0.35)', background: 'rgba(255,82,82,0.08)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertTriangle size={20} color="#ff5252" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.92rem' }}>{error}</div>
                </div>
            )}
            {done && (
                <div style={{ ...card, borderColor: 'rgba(0,230,118,0.35)', background: 'rgba(0,230,118,0.08)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={20} color="#00e676" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.92rem' }}>{done}</div>
                </div>
            )}

            {!isPlatformAdmin ? (
                <div style={card}>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>Първоначална инициализация</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                        Този акаунт още няма право да създава фирми. Инициализацията се прави веднъж и
                        е достъпна само за акаунта, записан като собственик на платформата. След първата
                        създадена фирма тя се заключва завинаги.
                    </p>
                    <button
                        onClick={runBootstrap}
                        disabled={busy}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            marginTop: '1rem', padding: '0.8rem 1.5rem', borderRadius: '12px',
                            background: 'var(--primary-color)', color: '#00252a', border: 'none',
                            fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {busy ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />}
                        Инициализирай платформата
                    </button>
                </div>
            ) : (
                <>
                    <form onSubmit={createTenant} style={{ ...card, marginBottom: '2rem' }}>
                        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={20} color="var(--primary-color)" /> Нова фирма
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.1rem' }}>
                            <div>
                                <label style={label}>Име на фирмата</label>
                                <input style={input} value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Автотранспорт Плевен" required />
                            </div>
                            <div>
                                <label style={label}>Идентификатор</label>
                                <input style={input} value={tenantId} onChange={e => setTenantId(e.target.value)}
                                    placeholder="pleven-bus" pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" required />
                            </div>
                            <div>
                                <label style={label}>Имейл на администратора</label>
                                <input style={input} type="email" value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)} placeholder="admin@firma.bg" required />
                            </div>
                            <div>
                                <label style={label}>Парола (мин. 8 знака)</label>
                                <input style={input} type="password" value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)} minLength={8} required />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '1.1rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,171,0,0.08)', border: '1px solid rgba(255,171,0,0.25)' }}>
                            <CreditCard size={18} color="#ffab00" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                                Идентификаторът влиза в адреса, записан върху физическите карти
                                (<code>/t/{tenantId || 'фирма'}/client/…</code>) и <strong>не може да се смени</strong>,
                                след като са раздадени карти.
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={busy}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                marginTop: '1.25rem', padding: '0.85rem 1.6rem', borderRadius: '12px',
                                background: 'var(--primary-color)', color: '#00252a', border: 'none',
                                fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {busy ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                            Създай фирма
                        </button>
                    </form>

                    <div style={card}>
                        <h2 style={{ margin: '0 0 1.1rem', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={20} color="var(--primary-color)" /> Фирми ({tenants.length})
                        </h2>
                        {tenants.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                                Още няма създадени фирми.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {tenants.map(t => (
                                    <div key={t.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        gap: '1rem', flexWrap: 'wrap',
                                        padding: '0.85rem 1rem', borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{t.name || t.id}</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.id}</div>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
                                            padding: '3px 9px', borderRadius: '20px',
                                            background: t.active === false ? 'rgba(255,82,82,0.15)' : 'rgba(0,230,118,0.15)',
                                            color: t.active === false ? '#ff5252' : '#00e676',
                                        }}>
                                            {t.active === false ? 'СПРЯНА' : 'АКТИВНА'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default PlatformAdmin;
