import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CreditCard, ShieldCheck, FileSpreadsheet, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import app from '../firebase';
import { FUNCTIONS_REGION } from '../tenant/db';
import logo from '../assets/logo_main.png';

/**
 * Where the system starts for anyone who is not signed in.
 *
 * It is also where you land the moment you sign out, which is what it was not
 * built for: it used to be a form floating in the middle of an empty page, with
 * a "back to home" button that led to a protected route and bounced straight
 * back here. Signing out should look like arriving somewhere, not like being
 * dropped.
 *
 * Nothing here can name the company — the company is on the token, and there is
 * no token yet. So this is TransitFlow's door, deliberately: the operator's own
 * name and mark belong on the operator's documents, not on the lock.
 */

// Codes that represent a real failed sign-in attempt worth reporting.
const REPORTABLE_AUTH_CODES = [
    'auth/wrong-password',
    'auth/user-not-found',
    'auth/invalid-credential',
    'auth/too-many-requests',
];

const CAPABILITIES = [
    {
        icon: CreditCard,
        title: 'Карти и абонаменти',
        text: 'Издаване, подновяване и проследяване на всяка карта — с плащането зад нея.',
    },
    {
        icon: ShieldCheck,
        title: 'Проверки в движение',
        text: 'Контрольорът вижда веднага дали картата важи и кога е качването.',
    },
    {
        icon: FileSpreadsheet,
        title: 'Регистри и отчети',
        text: 'Готови за подпис и предаване, с логото и данните на фирмата.',
    },
];

const LoginPage: React.FC = () => {
    const { login, currentUser, isPlatformAdmin, signedInEmail } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            navigate(
                isPlatformAdmin ? '/platform' : currentUser.role === 'inspector' ? '/inspections' : '/admin',
                { replace: true }
            );
        } else if (signedInEmail) {
            // Signed in, but with no company and no platform rights yet. That is
            // the owner before the one-time bootstrap, so send them where they can
            // perform it rather than leaving them on a login form that succeeded.
            navigate('/platform', { replace: true });
        }
    }, [currentUser, isPlatformAdmin, signedInEmail, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(username.trim(), password);
            // the effect above routes by role once the claims land
        } catch (err: unknown) {
            console.error(err);
            const error = err as { code?: string };
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setError('Грешно потребителско име или парола.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Твърде много опити подред. Изчакайте няколко минути.');
            } else if (error.code === 'auth/network-request-failed') {
                setError('Няма връзка със сървъра. Проверете интернета.');
            } else {
                setError('Възникна грешка при вход. Моля, опитайте пак.');
            }

            // Report the failed attempt (fire-and-forget). The server enriches it
            // with IP/geolocation and alerts admins on repeated attempts.
            if (error.code && REPORTABLE_AUTH_CODES.includes(error.code)) {
                try {
                    const reportFailedLogin = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'reportFailedLogin');
                    reportFailedLogin({
                        email: username.trim(),
                        errorCode: error.code,
                        ua: navigator.userAgent,
                    }).catch(() => { /* ignore reporting errors */ });
                } catch { /* ignore */ }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tf-start">
            {/* A single soft light behind the page, so the dark is deliberate
                rather than flat. Purely decorative — never in the tab order. */}
            <div className="tf-start-glow" aria-hidden="true" />

            <main className="tf-start-inner">
                {/* ── What this is ─────────────────────────────────────── */}
                <section className="tf-start-pitch">
                    {/* The logo already spells the name — setting it again beside
                        the image just says everything twice. */}
                    <div className="tf-start-brand">
                        <img src={logo} alt="TransitFlow" className="tf-start-logo" />
                        <span className="tf-start-kicker">Card System</span>
                    </div>

                    <h1 className="tf-start-title">
                        Системата за<br />транспортни карти
                    </h1>
                    <p className="tf-start-lede">
                        Картите, абонаментите, проверките и отчетите на превозвача —
                        на едно място, от гишето до автобуса.
                    </p>

                    <ul className="tf-start-list">
                        {CAPABILITIES.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="tf-start-item">
                                <span className="tf-start-icon"><Icon size={18} /></span>
                                <div>
                                    <div className="tf-start-item-title">{title}</div>
                                    <div className="tf-start-item-text">{text}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ── The way in ───────────────────────────────────────── */}
                <section className="tf-start-panel">
                    <div className="tf-start-badge">Само за екипа на превозвача</div>
                    <h2 className="tf-start-panel-title">Вход в системата</h2>
                    <p className="tf-start-panel-sub">
                        Влезте с данните, които сте получили от администратора си.
                    </p>

                    <form onSubmit={handleSubmit} className="tf-start-form">
                        <div>
                            <label htmlFor="tf-user" className="tf-start-label">Потребителско име</label>
                            <input
                                id="tf-user"
                                type="text"
                                autoComplete="username"
                                placeholder="напр. ime.familia"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="tf-start-input"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="tf-pass" className="tf-start-label">Парола</label>
                            <input
                                id="tf-pass"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="tf-start-input"
                                required
                            />
                        </div>

                        {error && <div className="tf-start-error" role="alert">{error}</div>}

                        <button type="submit" disabled={loading} className="tf-start-submit">
                            {loading
                                ? <><Loader2 size={18} className="tf-spin" /> Влизане…</>
                                : <><LogIn size={18} /> Вход</>}
                        </button>
                    </form>

                    <p className="tf-start-help">
                        Забравена парола се възстановява от администратора на вашата фирма.
                    </p>
                </section>
            </main>

            <footer className="tf-start-foot">
                <span>© {new Date().getFullYear()} TransitFlow</span>
                <a href="https://transitflow.org/" target="_blank" rel="noopener noreferrer">transitflow.org</a>
            </footer>

            <style>{`
.tf-start {
    position: relative; min-height: 100vh; overflow: hidden;
    display: flex; flex-direction: column;
    background: var(--bg-color); color: #fff;
    padding: clamp(1.25rem, 4vw, 3rem);
}
.tf-start-glow {
    position: absolute; inset: -20% -10% auto -10%; height: 70vh; pointer-events: none;
    background:
        radial-gradient(48% 60% at 22% 8%, rgba(0,173,181,0.20), transparent 70%),
        radial-gradient(38% 55% at 82% 0%, rgba(255,82,82,0.12), transparent 70%);
}
.tf-start-inner {
    position: relative; flex: 1; width: 100%; max-width: 1140px; margin: 0 auto;
    display: grid; grid-template-columns: 1.05fr 0.95fr;
    align-items: center; gap: clamp(2rem, 5vw, 4.5rem);
}

/* ---- left ---- */
.tf-start-brand { display: flex; align-items: center; gap: 0.85rem; margin-bottom: clamp(1.5rem, 4vw, 2.5rem); }
.tf-start-logo { height: 46px; width: auto; object-fit: contain; }
.tf-start-kicker {
    padding-left: 0.85rem; border-left: 1px solid var(--surface-border);
    font-size: 0.64rem; font-weight: 800; letter-spacing: 0.24em;
    text-transform: uppercase; color: var(--primary-color); white-space: nowrap;
}
.tf-start-title {
    margin: 0 0 0.9rem; font-weight: 900; line-height: 1.04;
    letter-spacing: -0.035em; font-size: clamp(2rem, 4.6vw, 3.35rem);
}
.tf-start-lede {
    margin: 0 0 clamp(1.75rem, 4vw, 2.5rem); max-width: 34rem;
    color: var(--text-secondary); line-height: 1.65; font-size: clamp(0.95rem, 1.3vw, 1.05rem);
}
.tf-start-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.15rem; max-width: 32rem; }
.tf-start-item { display: flex; gap: 0.85rem; align-items: flex-start; }
.tf-start-icon {
    flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,173,181,0.12); border: 1px solid rgba(0,173,181,0.28);
    color: var(--primary-color);
}
.tf-start-item-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.15rem; }
.tf-start-item-text { color: var(--text-secondary); font-size: 0.87rem; line-height: 1.55; }

/* ---- right ---- */
.tf-start-panel {
    background: rgba(255,255,255,0.035);
    border: 1px solid var(--surface-border);
    border-radius: 22px; padding: clamp(1.5rem, 3vw, 2.25rem);
    box-shadow: 0 24px 60px rgba(0,0,0,0.38);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.tf-start-badge {
    display: inline-block; margin-bottom: 1.1rem; padding: 0.3rem 0.75rem;
    border-radius: 50px; font-size: 0.66rem; font-weight: 800;
    letter-spacing: 0.1em; text-transform: uppercase;
    background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); color: #ff5252;
}
.tf-start-panel-title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
.tf-start-panel-sub { margin: 0 0 1.6rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; }
.tf-start-form { display: flex; flex-direction: column; gap: 1.1rem; }
.tf-start-label {
    display: block; margin-bottom: 0.45rem; font-size: 0.72rem; font-weight: 800;
    letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary);
}
.tf-start-input {
    width: 100%; padding: 0.9rem 1.1rem; border-radius: 12px; font-size: 1rem; color: #fff;
    background: rgba(0,0,0,0.28); border: 1px solid var(--surface-border);
    outline: none; transition: border-color .15s ease, box-shadow .15s ease;
}
.tf-start-input::placeholder { color: rgba(255,255,255,0.32); }
.tf-start-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(0,173,181,0.18);
}
.tf-start-error {
    padding: 0.8rem 1rem; border-radius: 11px; font-size: 0.88rem; line-height: 1.5;
    background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.28); color: #ff8a80;
}
.tf-start-submit {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.55rem;
    width: 100%; padding: 0.95rem 1rem; margin-top: 0.2rem;
    border: none; border-radius: 12px; font-size: 1rem; font-weight: 800;
    background: var(--primary-color); color: #00252a; cursor: pointer;
    box-shadow: 0 8px 22px rgba(0,173,181,0.28); transition: transform .12s ease, filter .15s ease;
}
.tf-start-submit:hover:not(:disabled) { filter: brightness(1.07); }
.tf-start-submit:active:not(:disabled) { transform: translateY(1px); }
.tf-start-submit:disabled { cursor: wait; opacity: 0.72; box-shadow: none; }
.tf-start-help {
    margin: 1.3rem 0 0; padding-top: 1.1rem; border-top: 1px solid var(--surface-border);
    font-size: 0.8rem; line-height: 1.6; color: var(--text-secondary);
}

/* ---- foot ---- */
.tf-start-foot {
    position: relative; width: 100%; max-width: 1140px; margin: clamp(2rem, 5vw, 3rem) auto 0;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
    font-size: 0.76rem; color: rgba(255,255,255,0.4);
}
.tf-start-foot a { color: rgba(255,255,255,0.55); text-decoration: none; }
.tf-start-foot a:hover { color: var(--primary-color); }

@keyframes tf-spin { to { transform: rotate(360deg); } }
.tf-spin { animation: tf-spin 1s linear infinite; }

/* The form leads on a phone: somebody opening this on the bus is signing in,
   not reading about the product. */
@media (max-width: 900px) {
    .tf-start-inner { grid-template-columns: 1fr; gap: 2rem; align-items: start; padding-top: 0.5rem; }
    .tf-start-pitch { order: 2; }
    .tf-start-panel { order: 1; }
    .tf-start-brand { justify-content: center; margin-bottom: 1.25rem; }
    .tf-start-logo { height: 52px; }
    .tf-start-title, .tf-start-lede { text-align: center; margin-left: auto; margin-right: auto; }
    .tf-start-list { margin: 0 auto; }
    .tf-start-foot { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
    .tf-spin { animation: none; }
    .tf-start-submit { transition: none; }
}
            `}</style>
        </div>
    );
};

export default LoginPage;
