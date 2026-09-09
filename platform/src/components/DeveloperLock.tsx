import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldAlert, X } from 'lucide-react';

/**
 * Keeps the card-making screen shut until somebody types the word for it.
 *
 * The screen behind this issues the codes that get written onto blank cards and
 * can throw the whole issued batch away. Both are one click, both are correct
 * behaviour, and neither can be undone: a card already in a passenger's pocket
 * carries a link that the system no longer knows. Nobody at the company has any
 * reason to open it — the cards arrive already made — so the only thing an open
 * door can produce here is an accident.
 *
 * What this is, exactly: a guard against a wrong click, by the small number of
 * people who are administrators. It is not a defence against somebody who means
 * harm, and it must not be mistaken for one — the page runs on their computer,
 * so anything it knows, they can read. The defence against a person who means
 * harm is elsewhere and is real: every one of those operations is a Cloud
 * Function that checks the caller is an administrator of that company before it
 * does anything, and refuses regardless of what the screen allowed.
 *
 * The word itself is not in this file. Only the fingerprint of it is, because
 * the repository is public and a password written out in a public repository is
 * published, whatever the screen it guards. The fingerprint cannot be turned
 * back into the word, and the comparison happens the same either way.
 */

/** SHA-256 of the phrase. Changing the phrase means changing this line. */
const PHRASE_DIGEST = '6c4aea6830d31893c1d43038c2914d6ca17da282763d91c7506394a7ec481822';

/**
 * Unlocked for as long as this tab is open, and no longer.
 *
 * Long enough to do an afternoon of cards without being asked again; short
 * enough that a computer left open at a counter is shut when somebody closes
 * the browser.
 */
const SESSION_KEY = 'tf_dev_unlocked';

export const developerUnlocked = (): boolean => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
};

const remember = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private window */ }
};

const digest = async (text: string): Promise<string> => {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
};

interface Props {
    onUnlock: () => void;
    onCancel: () => void;
}

const DeveloperLock: React.FC<Props> = ({ onUnlock, onCancel }) => {
    const [phrase, setPhrase] = useState('');
    const [wrong, setWrong] = useState(false);
    const [busy, setBusy] = useState(false);
    const field = useRef<HTMLInputElement>(null);

    useEffect(() => { field.current?.focus(); }, []);

    useEffect(() => {
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [onCancel]);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (busy || !phrase) return;
        setBusy(true);
        try {
            if (await digest(phrase) === PHRASE_DIGEST) {
                remember();
                onUnlock();
                return;
            }
            setWrong(true);
            setPhrase('');
            field.current?.focus();
        } catch {
            // crypto.subtle is only there on a secure origin. Rather than let
            // the door stand open, it stays shut and says why.
            setWrong(true);
        } finally {
            setBusy(false);
        }
    };

    const label: React.CSSProperties = {
        display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem',
        color: 'var(--text-secondary)',
    };

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, zIndex: 4000,
                background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.25rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: '30rem', background: 'var(--surface-color, #14161c)',
                    border: '1px solid var(--surface-border)', borderRadius: '20px',
                    padding: '1.75rem', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <ShieldAlert size={22} color="#ff9800" />
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                            Само за разработчика
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        aria-label="Затвори"
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', display: 'flex', padding: '0.2rem',
                        }}
                    ><X size={20} /></button>
                </div>

                <p style={{ margin: '1rem 0 0', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                    Оттук се произвеждат картите: издават се кодовете, които после се
                    записват върху празните карти, и оттук същите тези кодове могат да
                    бъдат заличени.
                </p>
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                    Едно натискане тук може да обезсили <strong style={{ color: '#ff9800' }}>всички
                    вече раздадени карти</strong> — те остават с код, който системата вече не
                    познава, и трябва да бъдат записани наново една по една. Това не се връща назад.
                </p>
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                    За работата на гишето не е нужно. Картите пристигат готови.
                </p>

                <form onSubmit={submit} style={{ marginTop: '1.4rem' }}>
                    <label style={label} htmlFor="tf-dev-phrase">Парола на разработчика</label>
                    <input
                        id="tf-dev-phrase"
                        ref={field}
                        type="password"
                        autoComplete="off"
                        value={phrase}
                        onChange={e => { setPhrase(e.target.value); setWrong(false); }}
                        // Typed and then Enter is how a password gets entered, and
                        // a form's own Enter does not always reach here.
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                        style={{
                            width: '100%', padding: '0.85rem', borderRadius: '12px',
                            background: 'rgba(0,0,0,0.25)', color: '#fff', outline: 'none',
                            border: `1px solid ${wrong ? '#ff5252' : 'var(--surface-border)'}`,
                            fontSize: '1rem', letterSpacing: '0.08em',
                        }}
                    />
                    {wrong && (
                        <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#ff5252' }}>
                            Не е тази парола.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.3rem' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                flex: 1, padding: '0.85rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.06)', color: '#fff',
                                border: '1px solid var(--surface-border)', fontWeight: 700,
                                fontSize: '0.9rem', cursor: 'pointer',
                            }}
                        >Назад</button>
                        <button
                            type="submit"
                            disabled={busy || !phrase}
                            style={{
                                flex: 1, padding: '0.85rem', borderRadius: '12px',
                                background: phrase ? 'var(--accent-color, #00ADB5)' : 'rgba(255,255,255,0.06)',
                                color: phrase ? '#fff' : 'var(--text-secondary)',
                                border: 'none', fontWeight: 800, fontSize: '0.9rem',
                                cursor: busy || !phrase ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            }}
                        ><KeyRound size={17} /> Отключи</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeveloperLock;
