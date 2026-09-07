import React, { useEffect, useState, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Smartphone, BatteryFull, Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import app, { auth } from '../firebase';
import { FUNCTIONS_REGION } from '../tenant/db';
import { readDeviceState, type Reading } from '../tenant/devices';
import logo from '../assets/logo_main.png';

/**
 * The terminal's own screen.
 *
 * A terminal is a device on a bus, not a person, so it cannot be given a
 * username and a password — there would be nobody to keep them. It signs in
 * anonymously instead and proves which company it belongs to once, with a
 * six-digit code somebody reads off the admin panel. After that the account on
 * the device is the company's, and stays that way.
 *
 * Once enrolled this is where the terminal sits: a standby screen saying what it
 * is and that it is connected. Nobody has to watch it — the panel is where
 * anyone looks — but a driver glancing at it should be able to tell in one
 * second whether the thing is working.
 */

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const DeviceEnroll: React.FC = () => {
    const { currentUser, loading, refreshClaims } = useAuth();
    const enrolled = currentUser?.role === 'device';

    const [code, setCode] = useState('');
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reading, setReading] = useState<Reading | null>(null);
    const [offline, setOffline] = useState(isOffline());

    // Anonymous sign-in gives the device an account for the company to be
    // attached to. Nothing can be read with it until a code is accepted.
    useEffect(() => {
        if (loading || auth.currentUser) return;
        signInAnonymously(auth).catch(err => {
            console.error('Anonymous sign-in failed:', err);
            setError('Устройството не може да се свърже. Проверете интернета.');
        });
    }, [loading]);

    // Its own state, for the standby screen. The panel gets this too, over the
    // heartbeat; this is only so the screen in the bus says something true.
    useEffect(() => {
        if (!enrolled) return;
        const tick = () => { readDeviceState().then(setReading).catch(() => { /* nothing to show */ }); };
        tick();
        const timer = setInterval(tick, 60000);
        return () => clearInterval(timer);
    }, [enrolled]);

    useEffect(() => {
        const sync = () => setOffline(isOffline());
        window.addEventListener('online', sync);
        window.addEventListener('offline', sync);
        return () => {
            window.removeEventListener('online', sync);
            window.removeEventListener('offline', sync);
        };
    }, []);

    const enroll = useCallback(async () => {
        const digits = code.replace(/\D/g, '');
        if (digits.length !== 6) { setError('Кодът е шест цифри.'); return; }
        setBusy(true);
        setError(null);
        try {
            const state = await readDeviceState();
            const fn = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'enrollDevice');
            await fn({
                code: digits,
                label: label.trim(),
                model: state.model,
                platform: state.platform,
                appVersion: (window as unknown as { __TF_VERSION__?: string }).__TF_VERSION__ || '',
            });
            // The claim is new. Nothing else will pick it up — the auth listener
            // ran back when this account was anonymous and belonged to nobody.
            await refreshClaims();
            setCode('');
        } catch (e) {
            setError((e as { message?: string }).message || 'Кодът не беше приет.');
        } finally {
            setBusy(false);
        }
    }, [code, label, refreshClaims]);

    const shell: React.CSSProperties = {
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem', gap: '1.5rem', textAlign: 'center',
    };

    if (loading) {
        return (
            <div style={shell}>
                <Loader2 size={34} style={{ color: 'var(--text-secondary)', animation: 'tfd-spin 1s linear infinite' }} />
            </div>
        );
    }

    // ── Enrolled: the standby screen ────────────────────────────────────────
    if (enrolled) {
        const battery = reading?.battery;
        return (
            <div style={shell}>
                <img src={logo} alt="TransitFlow" style={{ height: '56px', opacity: 0.9 }} />

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                    padding: '0.6rem 1.3rem', borderRadius: '50px',
                    background: offline ? 'rgba(255,82,82,0.12)' : 'rgba(0,200,83,0.12)',
                    border: `1px solid ${offline ? 'rgba(255,82,82,0.4)' : 'rgba(0,200,83,0.4)'}`,
                    color: offline ? '#ff5252' : '#00c853', fontWeight: 800, letterSpacing: '0.05em',
                }}>
                    {offline ? <WifiOff size={17} /> : <Wifi size={17} />}
                    {offline ? 'БЕЗ ВРЪЗКА' : 'СВЪРЗАН'}
                </div>

                <div style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '30rem' }}>
                    Устройството е зачислено и готово за работа.
                    {offline && <><br />Работи и без интернет. Ще се обади, щом има връзка.</>}
                </div>

                {battery !== null && battery !== undefined && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        color: battery <= 20 && !reading?.charging ? '#ff5252' : 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                    }}>
                        <BatteryFull size={18} />
                        {battery}%{reading?.charging ? ' ⚡' : ''}
                    </div>
                )}

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.65, marginTop: '1rem' }}>
                    Поднесете карта към четеца.
                </div>
            </div>
        );
    }

    // ── Not enrolled: the code ──────────────────────────────────────────────
    return (
        <div style={shell}>
            <img src={logo} alt="TransitFlow" style={{ height: '56px', opacity: 0.9 }} />

            <div>
                <h1 style={{
                    margin: 0, fontSize: '1.5rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                }}>
                    <Smartphone size={24} /> Зачисляване
                </h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '26rem', margin: '0.75rem auto 0' }}>
                    Въведете кода от админ панела на фирмата. Прави се веднъж —
                    след това устройството помни.
                </p>
            </div>

            <input
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') enroll(); }}
                inputMode="numeric"
                autoFocus
                placeholder="000000"
                aria-label="Код за зачисляване"
                style={{
                    width: '100%', maxWidth: '18rem', padding: '1rem',
                    fontSize: '2.4rem', fontWeight: 900, letterSpacing: '0.32em',
                    textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                    background: 'rgba(0,0,0,0.28)', color: '#fff',
                    border: `1px solid ${error ? 'rgba(255,82,82,0.5)' : 'var(--surface-border)'}`,
                    borderRadius: '16px', outline: 'none', boxSizing: 'border-box',
                }}
            />

            <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Име на устройството (напр. Автобус 4)"
                aria-label="Име на устройството"
                style={{
                    width: '100%', maxWidth: '22rem', padding: '0.8rem 1rem',
                    background: 'rgba(0,0,0,0.22)', color: '#fff', textAlign: 'center',
                    border: '1px solid var(--surface-border)', borderRadius: '12px',
                    outline: 'none', boxSizing: 'border-box',
                }}
            />

            {error && (
                <div style={{ color: '#ff5252', fontWeight: 700, maxWidth: '24rem', lineHeight: 1.5 }}>
                    {error}
                </div>
            )}

            <button
                onClick={enroll}
                disabled={busy || code.length !== 6}
                style={{
                    width: '100%', maxWidth: '22rem', padding: '1rem',
                    fontSize: '1.05rem', fontWeight: 800, borderRadius: '14px',
                    border: '1px solid rgba(124,77,255,0.45)',
                    background: 'rgba(124,77,255,0.16)', color: '#b39dff',
                    cursor: busy || code.length !== 6 ? 'default' : 'pointer',
                    opacity: busy || code.length !== 6 ? 0.5 : 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                }}
            >
                {busy
                    ? <><Loader2 size={19} style={{ animation: 'tfd-spin 1s linear infinite' }} /> Зачисляване…</>
                    : <><CheckCircle2 size={19} /> Зачисли устройството</>}
            </button>

            <style>{`
                @keyframes tfd-spin { to { transform: rotate(360deg); } }
                @media (prefers-reduced-motion: reduce) {
                    [style*="tfd-spin"] { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

export default DeviceEnroll;
