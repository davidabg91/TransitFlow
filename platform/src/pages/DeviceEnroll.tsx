import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Smartphone, BatteryFull, Wifi, WifiOff, Loader2, CheckCircle2, RefreshCw, ArrowUp } from 'lucide-react';
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

/**
 * That this device has been enrolled — the one thing it must not forget.
 *
 * The code is typed once, by whoever set the terminal up, and after that the
 * driver is on his own. If the app ever came back to the code screen he could
 * not work until somebody in the office was reached, so the screen asks only
 * when this has never been written. Everything else — no signal, a slow start,
 * a token that needs renewing — is a wait, not a question.
 */
const ENROLLED_KEY = 'tf_device_enrolled';

const wasEnrolled = () => {
    try { return localStorage.getItem(ENROLLED_KEY) === '1'; } catch { return false; }
};

const DeviceEnroll: React.FC = () => {
    const { currentUser, loading, refreshClaims } = useAuth();
    const enrolled = currentUser?.role === 'device';

    const [code, setCode] = useState('');
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reading, setReading] = useState<Reading | null>(null);
    const [offline, setOffline] = useState(isOffline());
    const [everEnrolled, setEverEnrolled] = useState(wasEnrolled);
    // The way back, for the one case that is not a wait: a device the company
    // has removed, or one being moved to another company. Deliberately awkward.
    const [askAgain, setAskAgain] = useState(false);

    useEffect(() => {
        if (!enrolled) return;
        try { localStorage.setItem(ENROLLED_KEY, '1'); } catch { /* blocked */ }
        setEverEnrolled(true);
    }, [enrolled]);

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
            try { localStorage.setItem(ENROLLED_KEY, '1'); } catch { /* blocked */ }
            setEverEnrolled(true);
            setAskAgain(false);
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

    const spinner = (
        <Loader2 size={34} style={{ color: 'var(--text-secondary)', animation: 'tfd-spin 1s linear infinite' }} />
    );

    if (loading) {
        return <div style={shell}>{spinner}<Keyframes /></div>;
    }

    // Enrolled once, but not confirmed yet — no signal, or a token being
    // renewed. A wait, and it says so. It never asks for the code again on its
    // own: that is what would strand a driver at the start of a shift.
    if (everEnrolled && !enrolled && !askAgain) {
        return (
            <div style={shell}>
                <img src={logo} alt="TransitFlow" style={{ height: '48px', opacity: 0.85 }} />
                {spinner}
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '28rem' }}>
                    Свързване със системата…
                    <br />
                    Устройството вече е зачислено. Няма нужда от код.
                </div>
                <button
                    onClick={() => setAskAgain(true)}
                    style={{
                        marginTop: '2rem', background: 'none', border: 'none',
                        color: 'var(--text-secondary)', opacity: 0.45, fontSize: '0.75rem',
                        textDecoration: 'underline', cursor: 'pointer',
                    }}
                >
                    Зачисли към друга фирма
                </button>
                <Keyframes />
            </div>
        );
    }

    // ── Enrolled: what a passenger sees ────────────────────────────────────
    if (enrolled) {
        const battery = reading?.battery;
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center',
                padding: '1.5rem 1.25rem 1.25rem', boxSizing: 'border-box',
            }}>
                {/* The reader is behind the top edge of the device, so this is
                    what the screen is for: pointing at it. The arrow sits as
                    high as it can and moves towards the thing it means. */}
                <ArrowUp size={64} strokeWidth={2.5} color="#20C0DA" style={{ animation: 'tfd-rise 1.8s ease-in-out infinite' }} />

                <h1 style={{
                    margin: '1.75rem 0 0', fontSize: 'clamp(1.5rem, 7vw, 2.1rem)',
                    fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.01em',
                }}>
                    Допрете картата<br />отгоре
                </h1>

                <ContactlessMark />

                <p style={{
                    margin: '1.1rem 0 0', maxWidth: '22rem',
                    fontSize: 'clamp(0.95rem, 4vw, 1.1rem)', lineHeight: 1.55,
                    color: 'rgba(255,255,255,0.62)',
                }}>
                    В най-горния край на устройството, при този знак.
                </p>

                {/* Whose bus this is. Below the instruction, because a passenger
                    needs to know what to do before they need to know who from. */}
                <img
                    src={logo}
                    alt="TransitFlow"
                    style={{ width: 'min(190px, 52vw)', height: 'auto', marginTop: '2.25rem', opacity: 0.85 }}
                />

                {/* Pushed to the bottom and kept quiet: this is the driver's
                    business, and a passenger has no use for it. */}
                <div style={{ flex: 1 }} />
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.9rem', flexWrap: 'wrap', paddingTop: '1rem', width: '100%',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {offline ? <WifiOff size={13} /> : <Wifi size={13} />}
                        {offline ? 'без връзка' : 'свързан'}
                    </span>
                    {battery !== null && battery !== undefined && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            fontVariantNumeric: 'tabular-nums',
                            color: battery <= 20 && !reading?.charging ? '#ff5252' : undefined,
                        }}>
                            <BatteryFull size={13} />
                            {battery}%{reading?.charging ? ' ⚡' : ''}
                        </span>
                    )}
                </div>

                <Keyframes />
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

            <Link
                to="/login"
                style={{
                    marginTop: '1.5rem', color: 'var(--text-secondary)', opacity: 0.4,
                    fontSize: '0.75rem', textDecoration: 'underline',
                }}
            >
                Вход за служител
            </Link>

            {askAgain && (
                <button
                    onClick={() => setAskAgain(false)}
                    style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        opacity: 0.55, fontSize: '0.8rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    }}
                >
                    <RefreshCw size={13} /> Назад
                </button>
            )}

            <Keyframes />
        </div>
    );
};

/**
 * The contactless mark, drawn rather than photographed.
 *
 * The same four arcs that are moulded into the top of the terminal. A passenger
 * who has never used the system reads the symbol on the case and the symbol on
 * the screen as one instruction, which is the whole point of putting it here —
 * words alone would have to be read, and in a moving bus they will not be.
 */
const ContactlessMark = () => (
    <svg width="118" height="118" viewBox="0 0 22 32" fill="none" aria-hidden="true"
         style={{ marginTop: '1.25rem' }}>
        {[
            'M 5.68 13.03 A 4.0 4.0 0 0 1 5.68 18.97',
            'M 8.75 9.61 A 8.6 8.6 0 0 1 8.75 22.39',
            'M 11.83 6.19 A 13.2 13.2 0 0 1 11.83 25.81',
            'M 14.91 2.77 A 17.8 17.8 0 0 1 14.91 29.23',
        ].map((d, i) => (
            <path
                key={d}
                d={d}
                stroke="#20C0DA"
                strokeWidth="2.4"
                strokeLinecap="round"
                style={{ animation: `tfd-wave 1.8s ease-in-out ${i * 0.16}s infinite` }}
            />
        ))}
    </svg>
);

const Keyframes = () => (
    <style>{`
        @keyframes tfd-spin { to { transform: rotate(360deg); } }
        @keyframes tfd-rise { 0%, 100% { transform: translateY(4px); } 50% { transform: translateY(-6px); } }
        @keyframes tfd-wave { 0%, 100% { opacity: 0.25; } 45% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
            [style*="tfd-spin"], [style*="tfd-rise"], [style*="tfd-wave"] { animation: none !important; }
        }
    `}</style>
);

export default DeviceEnroll;
