import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { FUNCTIONS_REGION } from '../tenant/db';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Building2, Plus, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, CreditCard, Users2, Wallet, RefreshCw, Lock, Unlock } from 'lucide-react';

/**
 * Platform owner's screen: create the companies that use TransitFlow.
 *
 * Everything here runs through Cloud Functions with the Admin SDK — creating a
 * company means creating an auth account and writing custom claims, neither of
 * which a browser is allowed to do. The page only collects the details and
 * reports what happened.
 */

interface Tenant {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    modules: Partial<Record<ModuleKey, boolean>>;
    cards: number | null;
    staff: number | null;
    revenueThisMonth: number;
    paymentsThisMonth: number;
}

type ModuleKey = 'signals' | 'rentals' | 'notifications';

const MODULES: { key: ModuleKey; label: string }[] = [
    { key: 'signals', label: 'Сигнали' },
    { key: 'rentals', label: 'Наеми' },
    { key: 'notifications', label: 'Известия' },
];

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
    const { signedInEmail, isPlatformAdmin, refreshClaims, tenantId: ownCompany } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [month, setMonth] = useState('');
    const [loadingList, setLoadingList] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const [tenantId, setTenantId] = useState('');
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Size, activity and turnover per company, assembled server-side from counts
    // and the monthly rollups — never from the cards themselves.
    const loadOverview = React.useCallback(async () => {
        if (!isPlatformAdmin) return;
        setLoadingList(true);
        try {
            const res = await call('tenantOverview')({});
            const payload = res.data as { month: string; tenants: Tenant[] };
            setTenants(payload.tenants || []);
            setMonth(payload.month || '');
        } catch (e) {
            console.error('Overview unavailable:', e);
        } finally {
            setLoadingList(false);
        }
    }, [isPlatformAdmin]);

    useEffect(() => { loadOverview(); }, [loadOverview]);

    const call = (fnName: string) => httpsCallable(getFunctions(app, FUNCTIONS_REGION), fnName);

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

    const toggleModule = async (t: Tenant, key: ModuleKey) => {
        const next = !t.modules?.[key];
        // Optimistic: the switch answers immediately, and a failure puts it back.
        setTenants(list => list.map(x => x.id === t.id
            ? { ...x, modules: { ...x.modules, [key]: next } } : x));
        try {
            await call('setTenantModules')({ tenantId: t.id, modules: { [key]: next } });
        } catch (e) {
            setTenants(list => list.map(x => x.id === t.id
                ? { ...x, modules: { ...x.modules, [key]: !next } } : x));
            setError((e as { message?: string }).message || 'Промяната не беше записана.');
        }
    };

    const toggleActive = async (t: Tenant) => {
        const next = !t.active;
        if (!next && !window.confirm(
            `Да се спре ли достъпът на „${t.name}“?

` +
            'Служителите ѝ ще бъдат отписани веднага и няма да могат да променят нищо, ' +
            'докато не възстановите достъпа. Данните остават непокътнати.'
        )) return;

        const reason = next ? '' : (window.prompt('Причина (вижда се от фирмата):', 'Неплатен абонамент') || 'Неплатен абонамент');
        setBusy(true); setError(null); setDone(null);
        try {
            await call('setTenantActive')({ tenantId: t.id, active: next, reason });
            setTenants(list => list.map(x => x.id === t.id ? { ...x, active: next } : x));
            setDone(next ? `Достъпът на „${t.name}“ е възстановен.` : `Достъпът на „${t.name}“ е спрян.`);
        } catch (e) {
            setError((e as { message?: string }).message || 'Промяната не беше записана.');
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
            loadOverview();
        } catch (e) {
            setError((e as { message?: string }).message || 'Неуспешно създаване.');
        } finally {
            setBusy(false);
        }
    };

    // Belongs to a company, so this screen is not for them — it administers the
    // companies, it is not part of any one of them.
    if (ownCompany && !isPlatformAdmin) {
        return <Navigate to="/" replace />;
    }

    // Otherwise gated on being signed in rather than on having access, because
    // granting the owner their access is precisely what this screen does.
    if (!signedInEmail) {
        return <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Трябва да влезете.</div>;
    }

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
                <ShieldCheck size={26} color="var(--primary-color)" />
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Администраторски панел</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '2rem' }}>
                Фирмите, които използват TransitFlow — състояние, обем и платени модули.
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building2 size={20} color="var(--primary-color)" /> Фирми ({tenants.length})
                            </h2>
                            <button onClick={loadOverview} disabled={loadingList} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.45rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
                                color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                <RefreshCw size={14} className={loadingList ? 'spin' : undefined} /> Обнови
                            </button>
                        </div>

                        {tenants.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                                {loadingList ? 'Зареждане…' : 'Още няма създадени фирми.'}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                {tenants.map(t => (
                                    <div key={t.id} style={{
                                        padding: '1.1rem 1.2rem', borderRadius: '16px',
                                        background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.02rem' }}>{t.name}</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                                    {t.id}{t.createdAt ? ' \u00b7 от ' + new Date(t.createdAt).toLocaleDateString('bg-BG') : ''}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleActive(t)}
                                                disabled={busy}
                                                title={t.active ? 'Спри достъпа при неплатен абонамент' : 'Възстанови достъпа'}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                    fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em',
                                                    padding: '5px 12px', borderRadius: '20px', cursor: busy ? 'wait' : 'pointer',
                                                    background: t.active ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)',
                                                    border: `1px solid ${t.active ? 'rgba(0,230,118,0.4)' : 'rgba(255,82,82,0.45)'}`,
                                                    color: t.active ? '#00e676' : '#ff5252',
                                                }}
                                            >
                                                {t.active ? <Unlock size={12} /> : <Lock size={12} />}
                                                {t.active ? 'АКТИВНА' : 'СПРЯНА'}
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {[
                                                { icon: CreditCard, label: 'карти', value: t.cards ?? '—' },
                                                { icon: Users2, label: 'служители', value: t.staff ?? '—' },
                                                { icon: Wallet, label: 'оборот ' + month, value: t.revenueThisMonth.toFixed(2) + ' €' },
                                                { icon: CheckCircle2, label: 'плащания', value: t.paymentsThisMonth },
                                            ].map(({ icon: Icon, label: statLabel, value }) => (
                                                <div key={statLabel} style={{ padding: '0.6rem 0.75rem', borderRadius: '11px', background: 'rgba(255,255,255,0.03)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                                        <Icon size={12} /> {statLabel}
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                                Платени модули:
                                            </span>
                                            {MODULES.map(({ key, label: moduleLabel }) => {
                                                const on = t.modules?.[key] === true;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => toggleModule(t, key)}
                                                        aria-pressed={on}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                            padding: '0.35rem 0.8rem', borderRadius: '50px', cursor: 'pointer',
                                                            fontSize: '0.78rem', fontWeight: 700,
                                                            background: on ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
                                                            border: '1px solid ' + (on ? 'rgba(0,230,118,0.4)' : 'var(--surface-border)'),
                                                            color: on ? '#00e676' : 'var(--text-secondary)',
                                                            transition: 'all .15s ease',
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: '7px', height: '7px', borderRadius: '50%',
                                                            background: on ? '#00e676' : 'var(--text-secondary)',
                                                        }} />
                                                        {moduleLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
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
