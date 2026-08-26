import React, { useEffect, useState } from 'react';
import {
    Settings as SettingsIcon, Route as RouteIcon, Plus, Trash2, Save,
    CalendarRange, MapPin, X, Check, AlertTriangle, Loader2, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, deleteDoc, setDoc } from '../tenant/db';
import { db } from '../firebase';
import {
    ALL_PERIODS, DEFAULT_CARD_TYPES, emptyRoute, useCompanySettings, useRoutes,
    type PeriodId, type RouteDef,
} from '../tenant/settings';

/**
 * Where a company describes itself: the lines it runs, the stops along them,
 * what a subscription costs, and which subscriptions it sells at all.
 *
 * All of this used to be one operator's routes and fares, compiled into the
 * app. Moving it here is what lets a second company exist.
 *
 * The page is no longer admin-only. A password used to be whatever it was set
 * to on the day the account was made — there was no screen for changing one, so
 * a moderator handed a password on paper kept it for good. That screen is here,
 * and everyone can reach it; what an admin sees underneath it is the company.
 */

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--surface-border)',
    borderRadius: '20px',
    padding: '1.5rem',
};

const input: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem', borderRadius: '11px',
    background: 'rgba(0,0,0,0.28)', border: '1px solid var(--surface-border)',
    color: '#fff', fontSize: '0.95rem', outline: 'none',
};

const label: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem',
};

const Settings: React.FC = () => {
    const { currentUser, tenantId, changePassword } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const { routes, loading: routesLoading } = useRoutes();
    const settings = useCompanySettings();

    const [periods, setPeriods] = useState<PeriodId[]>([]);
    const [cardTypes, setCardTypes] = useState<string[]>([]);
    const [savingSettings, setSavingSettings] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    const [editing, setEditing] = useState<RouteDef | null>(null);
    const [savingRoute, setSavingRoute] = useState(false);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (settings.loading) return;
        setPeriods(settings.periods);
        setCardTypes(settings.cardTypes);
    }, [settings.loading, settings.periods, settings.cardTypes]);

    /**
     * Checked here rather than left to Firebase, so the three ways this goes
     * wrong are all named on the spot: the old password mistyped, the two new
     * ones not matching, and a "new" password that is the old one again.
     */
    const changeOwnPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 6) {
            setMessage({ text: 'Новата парола трябва да е поне 6 знака.', ok: false });
            return;
        }
        if (newPassword !== repeatPassword) {
            setMessage({ text: 'Двете нови пароли не съвпадат.', ok: false });
            return;
        }
        if (newPassword === oldPassword) {
            setMessage({ text: 'Новата парола е същата като сегашната.', ok: false });
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword(oldPassword, newPassword);
            setOldPassword(''); setNewPassword(''); setRepeatPassword('');
            setMessage({ text: 'Паролата е сменена. Следващия път влизате с новата.', ok: true });
        } catch (err) {
            const code = (err as { code?: string }).code;
            setMessage({
                text: code === 'auth/wrong-password' || code === 'auth/invalid-credential'
                        ? 'Сегашната парола не е вярна.'
                    : code === 'auth/weak-password' ? 'Новата парола е твърде проста.'
                    : code === 'auth/too-many-requests'
                        ? 'Твърде много опити подред. Изчакайте няколко минути.'
                    : 'Паролата не беше сменена.',
                ok: false,
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const togglePeriod = (id: PeriodId) => {
        setPeriods(list => list.includes(id) ? list.filter(p => p !== id) : [...list, id]);
    };

    const saveSettings = async () => {
        if (periods.length === 0) {
            setMessage({ text: 'Оставете поне един вид абонамент.', ok: false });
            return;
        }
        setSavingSettings(true);
        setMessage(null);
        try {
            await setDoc(doc(db, 'settings', 'general'), { periods, cardTypes }, { merge: true });
            setMessage({ text: 'Настройките са запазени.', ok: true });
        } catch (e) {
            setMessage({ text: (e as { message?: string }).message || 'Неуспешен запис.', ok: false });
        } finally {
            setSavingSettings(false);
        }
    };

    const saveRoute = async () => {
        if (!editing) return;
        if (!editing.name.trim()) {
            setMessage({ text: 'Линията трябва да има име.', ok: false });
            return;
        }
        setSavingRoute(true);
        setMessage(null);
        try {
            const id = editing.id || editing.name.trim();
            const { id: _drop, ...body } = editing;
            void _drop;
            await setDoc(doc(db, 'routes', id), { ...body, name: editing.name.trim() });
            setMessage({ text: `Линия „${editing.name.trim()}“ е записана.`, ok: true });
            setEditing(null);
        } catch (e) {
            setMessage({ text: (e as { message?: string }).message || 'Неуспешен запис.', ok: false });
        } finally {
            setSavingRoute(false);
        }
    };

    const removeRoute = async (r: RouteDef) => {
        if (!window.confirm(
            `Да се изтрие ли линия „${r.name}“?\n\n` +
            'Картите, издадени по нея, остават — но линията ще изчезне от списъците и от отчетите по линии.'
        )) return;
        try {
            await deleteDoc(doc(db, 'routes', r.id));
        } catch (e) {
            setMessage({ text: (e as { message?: string }).message || 'Неуспешно изтриване.', ok: false });
        }
    };

    const setPrice = (cardType: string, period: PeriodId, raw: string) => {
        if (!editing) return;
        const value = raw.trim() === '' ? undefined : Number(raw);
        setEditing({
            ...editing,
            prices: {
                ...editing.prices,
                [cardType]: {
                    ...(editing.prices[cardType] || {}),
                    [period]: Number.isFinite(value as number) ? value : undefined,
                },
            },
        });
    };

    // Date-to-date has no fixed length, so it gets no column of its own — it is
    // priced from the month, which is therefore shown whenever it is offered.
    const activePeriods = (() => {
        const named = ALL_PERIODS.filter(p => periods.includes(p.id) && p.id !== 'custom');
        if (!periods.includes('custom') || named.some(p => p.id === 'month')) return named;
        const month = ALL_PERIODS.find(p => p.id === 'month');
        return month ? [month, ...named] : named;
    })();

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem 4rem', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <SettingsIcon size={24} color="var(--primary-color)" />
                <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900 }}>Настройки</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '2rem' }}>
                {isAdmin
                    ? 'Вашият достъп, линиите, които обслужвате, и абонаментите, които предлагате.'
                    : 'Вашият достъп до системата.'}
            </p>

            {message && (
                <div style={{
                    ...card, marginBottom: '1.5rem', display: 'flex', gap: '0.7rem', alignItems: 'flex-start',
                    borderColor: message.ok ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.35)',
                    background: message.ok ? 'rgba(0,230,118,0.07)' : 'rgba(255,82,82,0.07)',
                }}>
                    {message.ok ? <Check size={18} color="#00e676" /> : <AlertTriangle size={18} color="#ff5252" />}
                    <span style={{ fontSize: '0.92rem' }}>{message.text}</span>
                </div>
            )}

            {/* ── The account's own password ────────────────────────────── */}
            <section style={{ ...card, marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <KeyRound size={19} color="var(--primary-color)" /> Моята парола
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0 }}>
                    Влизате като <strong style={{ color: '#fff' }}>{(currentUser?.username || '').split('@')[0]}</strong>.
                    Смяната важи веднага и никой друг не вижда новата парола — нито
                    администраторът, нито ние.
                </p>

                <form onSubmit={changeOwnPassword}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label style={label}>Сегашна парола</label>
                            <input
                                style={input} type="password" autoComplete="current-password"
                                value={oldPassword} onChange={e => setOldPassword(e.target.value)} required
                            />
                        </div>
                        <div>
                            <label style={label}>Нова парола</label>
                            <input
                                style={input} type="password" autoComplete="new-password" minLength={6}
                                value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                            />
                        </div>
                        <div>
                            <label style={label}>Повторете новата</label>
                            <input
                                style={input} type="password" autoComplete="new-password" minLength={6}
                                value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={savingPassword}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.4rem',
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                            background: 'var(--primary-color)', color: '#00252a',
                            fontWeight: 800, cursor: savingPassword ? 'wait' : 'pointer',
                        }}
                    >
                        {savingPassword ? <Loader2 size={16} /> : <KeyRound size={16} />} Смени паролата
                    </button>
                </form>
            </section>

            {isAdmin && (<>
            {/* ── Subscriptions offered ─────────────────────────────────── */}
            <section style={{ ...card, marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarRange size={19} color="var(--primary-color)" /> Видове абонамент
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0 }}>
                    Кои периоди предлагате на пътниците. Само отметнатите се появяват при
                    издаване и подновяване на карта.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
                    {ALL_PERIODS.map(p => {
                        const on = periods.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                onClick={() => togglePeriod(p.id)}
                                aria-pressed={on}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.1rem', borderRadius: '50px', cursor: 'pointer',
                                    fontSize: '0.9rem', fontWeight: 700,
                                    background: on ? 'rgba(0,173,181,0.14)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${on ? 'rgba(0,173,181,0.45)' : 'var(--surface-border)'}`,
                                    color: on ? 'var(--primary-color)' : 'var(--text-secondary)',
                                }}
                            >
                                <span style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: on ? 'var(--primary-color)' : 'var(--text-secondary)',
                                }} />
                                {p.label}
                                {p.days && <span style={{ opacity: 0.6, fontWeight: 500 }}>· {p.days} дни</span>}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.4rem',
                        padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                        background: 'var(--primary-color)', color: '#00252a',
                        fontWeight: 800, cursor: savingSettings ? 'wait' : 'pointer',
                    }}
                >
                    {savingSettings ? <Loader2 size={16} /> : <Save size={16} />} Запази
                </button>
            </section>

            {/* ── Lines ─────────────────────────────────────────────────── */}
            <section style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RouteIcon size={19} color="var(--primary-color)" /> Линии ({routes.length})
                    </h2>
                    <button
                        onClick={() => setEditing({ id: '', ...emptyRoute() })}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.6rem 1.1rem', borderRadius: '11px', cursor: 'pointer',
                            background: 'rgba(0,200,83,0.12)', border: '1px solid rgba(0,200,83,0.35)',
                            color: '#00c853', fontWeight: 700, fontSize: '0.88rem',
                        }}
                    >
                        <Plus size={15} /> Нова линия
                    </button>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0 }}>
                    За всяка линия въведете спирките по нея и цената на абонамент за всеки
                    вид карта и период.
                </p>

                {routesLoading ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Зареждане…</p>
                ) : routes.length === 0 ? (
                    <div style={{
                        marginTop: '1rem', padding: '2rem', borderRadius: '16px', textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--surface-border)',
                    }}>
                        <MapPin size={26} color="var(--text-secondary)" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                            Още няма въведени линии. Докато няма, картите не могат да се
                            остойностят автоматично.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                        {routes.map(r => (
                            <div key={r.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                gap: '1rem', flexWrap: 'wrap',
                                padding: '0.9rem 1.1rem', borderRadius: '13px',
                                background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {r.stops?.length ? r.stops.join(' → ') : 'без въведени спирки'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setEditing(r)} style={{
                                        padding: '0.45rem 0.9rem', borderRadius: '9px', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--surface-border)',
                                        color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                                    }}>Промени</button>
                                    <button onClick={() => removeRoute(r)} title="Изтрий" style={{
                                        padding: '0.45rem 0.7rem', borderRadius: '9px', cursor: 'pointer',
                                        background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
                                        color: '#ff5252',
                                    }}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Line editor ───────────────────────────────────────────── */}
            {editing && (
                <div
                    onClick={() => setEditing(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'center', padding: '1rem', overflowY: 'auto',
                    }}
                >
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '760px', margin: '3vh 0', padding: '1.75rem',
                        background: '#161b22', border: '1px solid var(--surface-border)',
                        borderRadius: '22px', color: '#fff',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                                {editing.id ? 'Промяна на линия' : 'Нова линия'}
                            </h3>
                            <button onClick={() => setEditing(null)} style={{
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                            }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={label}>Име на линията</label>
                                <input
                                    style={input}
                                    value={editing.name}
                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                    placeholder="Плевен – Тръстеник"
                                />
                            </div>
                            <div>
                                <label style={label}>Единичен билет (€)</label>
                                <input
                                    style={input}
                                    type="number"
                                    step="0.01"
                                    value={editing.singleTicket ?? ''}
                                    onChange={e => setEditing({
                                        ...editing,
                                        singleTicket: e.target.value === '' ? null : Number(e.target.value),
                                    })}
                                    placeholder="2.00"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={label}>Спирки по линията</label>
                            <input
                                style={input}
                                value={(editing.stops || []).join(', ')}
                                onChange={e => setEditing({
                                    ...editing,
                                    stops: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                                })}
                                placeholder="Плевен, Опанец, Долна Митрополия, Тръстеник"
                            />
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                Разделени със запетая, в реда на движение.
                            </div>
                        </div>

                        <label style={label}>Цени на абонамент (€)</label>
                        {periods.includes('custom') && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 0.7rem', lineHeight: 1.6 }}>
                                Абонамент „от дата до дата" няма своя колона — той е с
                                различна дължина всеки път, затова се таксува по цената за месец.
                            </p>
                        )}
                        {activePeriods.length === 0 ? (
                            <p style={{ color: '#ffab00', fontSize: '0.88rem' }}>
                                Отметнете поне един период по-горе и го запазете, за да въвеждате цени.
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '13px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)', fontWeight: 700, whiteSpace: 'nowrap' }}>Вид карта</th>
                                            {activePeriods.map(p => (
                                                <th key={p.id} style={{ textAlign: 'left', padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.04)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    {p.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(cardTypes.length ? cardTypes : DEFAULT_CARD_TYPES).map(ct => (
                                            <tr key={ct}>
                                                <td style={{ padding: '0.5rem 0.9rem', borderTop: '1px solid var(--surface-border)', whiteSpace: 'nowrap' }}>{ct}</td>
                                                {activePeriods.map(p => (
                                                    <td key={p.id} style={{ padding: '0.4rem 0.6rem', borderTop: '1px solid var(--surface-border)' }}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editing.prices?.[ct]?.[p.id] ?? ''}
                                                            onChange={e => setPrice(ct, p.id, e.target.value)}
                                                            placeholder="—"
                                                            style={{ ...input, padding: '0.45rem 0.6rem', width: '6.5rem' }}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.6rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={saveRoute}
                                disabled={savingRoute}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.8rem 1.6rem', borderRadius: '12px', border: 'none',
                                    background: 'var(--primary-color)', color: '#00252a',
                                    fontWeight: 800, cursor: savingRoute ? 'wait' : 'pointer',
                                }}
                            >
                                {savingRoute ? <Loader2 size={16} /> : <Save size={16} />} Запази линията
                            </button>
                            <button onClick={() => setEditing(null)} style={{
                                padding: '0.8rem 1.4rem', borderRadius: '12px', cursor: 'pointer',
                                background: 'transparent', border: '1px solid var(--surface-border)',
                                color: 'var(--text-secondary)', fontWeight: 700,
                            }}>Отказ</button>
                        </div>
                    </div>
                </div>
            )}
            </>)}

            {!tenantId && (
                <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>Няма избрана фирма.</p>
            )}
        </div>
    );
};

export default Settings;
