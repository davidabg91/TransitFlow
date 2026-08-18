import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bus, Users, Clock, ShieldAlert, Compass,
    ArrowRight, Settings, Database, RefreshCw,
    UserCheck, Eye, Calendar, Shield, Nfc, ClipboardCheck, KeyRound
} from 'lucide-react';
import { initializeMockDatabase, signInWithEmailAndPassword, auth } from '../firebase';
import { SEED_AUTH_USERS, DEMO_CARD_IDS } from '../demo/seed';

type DemoRole = 'admin' | 'moderator' | 'inspector';

const ACCOUNTS: Record<DemoRole, string> = {
    admin: 'admin@transitflow.bg',
    moderator: 'staff@transitflow.bg',
    inspector: 'inspector@transitflow.bg',
};

const DemoHub: React.FC = () => {
    const navigate = useNavigate();

    const handleRoleAccess = async (role: DemoRole, path: string) => {
        try {
            const email = ACCOUNTS[role];
            await signInWithEmailAndPassword(auth, email, SEED_AUTH_USERS[email]);
            navigate(path);
        } catch (e) {
            console.error("Autologin error:", e);
            navigate('/login');
        }
    };

    const handleResetDatabase = () => {
        if (window.confirm("Сигурни ли сте, че искате да нулирате демо данните? Всички ваши промени ще бъдат изтрити.")) {
            initializeMockDatabase(true);
            window.location.reload();
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            fontFamily: 'var(--font-family)',
            padding: '4rem 1.5rem 6rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background glowing circles */}
            <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 173, 181, 0.15) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(0, 255, 245, 0.05) 0%, transparent 70%)', filter: 'blur(120px)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                
                {/* Header Brand */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '4rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(0, 173, 181, 0.1)',
                        padding: '10px 24px',
                        borderRadius: '50px',
                        border: '1px solid rgba(0, 173, 181, 0.3)',
                        boxShadow: 'var(--shadow-neon)',
                        marginBottom: '1.5rem',
                        animation: 'pulse 3s infinite'
                    }}>
                        <Bus size={28} color="var(--primary-color)" />
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                            Transit<span style={{ color: 'var(--primary-color)' }}>Flow</span>
                        </span>
                    </div>
                    
                    <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', fontWeight: 950, letterSpacing: '-1.5px', marginBottom: '1rem', lineHeight: 1.1 }}>
                        Интерактивна Демо Система
                    </h1>
                    <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', color: 'var(--text-secondary)', maxWidth: '750px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                        Разгледайте пълния потенциал на софтуерната платформа за дигитализация, таксуване и контрол на пътническия транспорт.
                    </p>
                    <a 
                        href="https://transitflow.org/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontWeight: 700,
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            fontSize: '0.9rem'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 173, 181, 0.15)';
                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                    >
                        ← Към Основния Сайт
                    </a>
                </div>

                {/* Key Metrics Dashboard */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '5rem'
                }}>
                    {/* Metric 1 */}
                    <div style={metricCardStyle}>
                        <div style={{ background: 'rgba(0, 173, 181, 0.1)', padding: '12px', borderRadius: '16px', color: 'var(--primary-color)' }}>
                            <Users size={28} />
                        </div>
                        <div>
                            <div style={metricValueStyle}>32,450+</div>
                            <div style={metricLabelStyle}>Проверени Пътници</div>
                            <p style={metricDescStyle}>Валидирани в реално време чрез NFC карти и бордови терминали.</p>
                        </div>
                    </div>

                    {/* Metric 2 */}
                    <div style={metricCardStyle}>
                        <div style={{ background: 'rgba(255, 82, 82, 0.1)', padding: '12px', borderRadius: '16px', color: '#ff5252' }}>
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <div style={{ ...metricValueStyle, color: '#ff5252' }}>14,820 лв.</div>
                            <div style={metricLabelStyle}>Засечени Нередности</div>
                            <p style={metricDescStyle}>Предотвратени финансови загуби от невалидни, чужди или изтекли карти.</p>
                        </div>
                    </div>

                    {/* Metric 3 */}
                    <div style={metricCardStyle}>
                        <div style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '12px', borderRadius: '16px', color: '#00e676' }}>
                            <Clock size={28} />
                        </div>
                        <div>
                            <div style={{ ...metricValueStyle, color: '#00e676' }}>100%</div>
                            <div style={metricLabelStyle}>Точност на Графиците</div>
                            <p style={metricDescStyle}>GPS контрол на превозните средства и автоматично засичане на разписанията.</p>
                        </div>
                    </div>

                    {/* Metric 4 */}
                    <div style={metricCardStyle}>
                        <div style={{ background: 'rgba(255, 171, 0, 0.1)', padding: '12px', borderRadius: '16px', color: '#ffab00' }}>
                            <Compass size={28} />
                        </div>
                        <div>
                            <div style={{ ...metricValueStyle, color: '#ffab00' }}>15+</div>
                            <div style={metricLabelStyle}>Активни Маршрута</div>
                            <p style={metricDescStyle}>Пълна дигитална карта на обслужваните линии и спирки в района.</p>
                        </div>
                    </div>
                </div>

                {/* Modules Selection Grid */}
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center', letterSpacing: '-0.5px' }}>
                    Изберете модул за тестване:
                </h2>
                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem',
                    marginBottom: '6rem'
                }}>
                    {/* Admin Panel Card */}
                    <div style={moduleCardStyle} onClick={() => handleRoleAccess('admin', '/admin')}>
                        <div style={moduleIconContainerStyle('#00ADB5')}>
                            <Settings size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>1. Административен Панел</h3>
                        <p style={moduleDescStyle}>
                            Интерфейс на диспечера и управителя на фирмата. Проследяване на приходи, регистриране на карти, печат на NFC връзки, сигнали и изпращане на пуш известия.
                        </p>
                        <div style={moduleLinkStyle('#00ADB5')}>
                            Влез като Администратор <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* Driver/Staff Card */}
                    <div style={moduleCardStyle} onClick={() => handleRoleAccess('moderator', '/portal')}>
                        <div style={moduleIconContainerStyle('#00e676')}>
                            <UserCheck size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>2. Портал за Водачи и Ревизори</h3>
                        <p style={moduleDescStyle}>
                            Служебен портал за шофьорите и контрольорите. Симулация на валидиране на карти, проверка на пътници и отчитане на курсове в реално време.
                        </p>
                        <div style={moduleLinkStyle('#00e676')}>
                            Влез като Шофьор/Контрольор <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* Client NFC Card Simulator */}
                    <div style={moduleCardStyle} onClick={() => navigate(`/client/${DEMO_CARD_IDS.active}`)}>
                        <div style={moduleIconContainerStyle('#ffab00')}>
                            <Eye size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>3. Дигитален Пътнически Профил</h3>
                        <p style={moduleDescStyle}>
                            Симулация на страницата, която се отваря при сканиране на NFC картата на пътник от контролните органи или при отваряне на неговия линк за проверка.
                        </p>
                        <div style={moduleLinkStyle('#ffab00')}>
                            Прегледай NFC Карта <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* Passenger App / Schedules */}
                    <div style={moduleCardStyle} onClick={() => navigate('/schedules')}>
                        <div style={moduleIconContainerStyle('#a020f0')}>
                            <Calendar size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>4. Панел за Разписания и Пътници</h3>
                        <p style={moduleDescStyle}>
                            Публичен портал за пътници, показващ разписания, налични линии, часове на тръгване и информация за абонаменти.
                        </p>
                        <div style={moduleLinkStyle('#a020f0')}>
                            Разгледай Разписания <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* Inspector module */}
                    <div style={moduleCardStyle} onClick={() => handleRoleAccess('inspector', '/inspections')}>
                        <div style={moduleIconContainerStyle('#00b0ff')}>
                            <ClipboardCheck size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>5. Модул „Контрол на пътници“</h3>
                        <p style={moduleDescStyle}>
                            Работното място на контрольора: проверени пътници по дни и месеци, GPS карта на извършените проверки, процент редовни пътници и писмени констативни протоколи.
                        </p>
                        <div style={moduleLinkStyle('#00b0ff')}>
                            Влез като Контрольор <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* System Admin Panel Card */}
                    <div style={moduleCardStyle} onClick={() => handleRoleAccess('admin', '/system-admin')}>
                        <div style={moduleIconContainerStyle('#ff5252')}>
                            <Shield size={32} />
                        </div>
                        <h3 style={moduleTitleStyle}>6. Системен Административен Панел</h3>
                        <p style={moduleDescStyle}>
                            Контролен панел за глобални администратори: системно табло, управление на акаунти и роли, глобален одит лог, дневник на неуспешните опити за вход и сигнали за дублирани карти.
                        </p>
                        <div style={moduleLinkStyle('#ff5252')}>
                            Влез в Системен Панел <ArrowRight size={16} />
                        </div>
                    </div>
                </div>

                {/* NFC simulator explainer */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0,173,181,0.12), rgba(0,173,181,0.02))',
                    border: '1px solid rgba(0,173,181,0.3)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    marginBottom: '3rem',
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ background: 'rgba(0,173,181,0.15)', color: 'var(--primary-color)', padding: '16px', borderRadius: '20px' }}>
                        <Nfc size={32} />
                    </div>
                    <div style={{ flex: '1 1 320px' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.6rem' }}>Симулатор на бордовия NFC четец</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>
                            В реалната система пътникът допира картата си до терминала на водача. Тук същото се прави
                            с бутона <strong style={{ color: '#fff' }}>„Сканирай карта“</strong> долу вдясно — на всяка страница.
                            Може да пуснете валидна карта, изтекъл абонамент, анулирана карта, опит с клонирано копие,
                            повторно сканиране (anti-passback) или напълно нова карта, която системата предлага да регистрирате.
                        </p>
                    </div>
                </div>

                {/* Demo accounts */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    marginBottom: '3rem'
                }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <KeyRound size={16} /> Демо акаунти
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginTop: 0, marginBottom: '1.5rem' }}>
                        Демото ви вписва автоматично като <span style={{ color: '#fff', fontWeight: 700 }}>администратор</span>, за да са достъпни
                        всички панели веднага. Ако искате да видите самия екран за вход и различните нива на достъп, натиснете
                        „Изход“ горе вдясно и влезте с някой от тези акаунти:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        {[
                            { email: 'admin@transitflow.bg', pass: 'admin', role: 'Администратор — пълен достъп' },
                            { email: 'staff@transitflow.bg', pass: 'staff', role: 'Модератор — каса и карти' },
                            { email: 'inspector@transitflow.bg', pass: 'inspector', role: 'Контрольор — само проверки' },
                        ].map(a => (
                            <div key={a.email} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1rem 1.15rem' }}>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{a.email}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary-color)', marginTop: '2px' }}>парола: {a.pass}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{a.role}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Database Settings Section */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <Database size={16} /> Демо Контрол
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Локална База Данни</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        Всяко действие (добавяне на нови карти, подновяване на плащания, промяна на сигнали) се записва незабавно във вашата локална памет (LocalStorage). Можете да нулирате демо данните до първоначалното им състояние по всяко време.
                    </p>
                    
                    <button
                        onClick={handleResetDatabase}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            padding: '12px 28px',
                            borderRadius: '50px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
                        }}
                    >
                        <RefreshCw size={18} /> Нулиране на Демо Данни
                    </button>
                </div>

                {/* Footer inside DemoHub */}
                <footer style={{
                    marginTop: '5rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <p>© {new Date().getFullYear()} TransitFlow. Всички права запазени.</p>
                    <p style={{ opacity: 0.7 }}>Интерактивна демонстрационна среда за управление на транспортни системи</p>
                </footer>

            </div>
        </div>
    );
};

// CSS styles in JS objects
const metricCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1.25rem',
    transition: 'transform 0.3s, border-color 0.3s',
};

const metricValueStyle: React.CSSProperties = {
    fontSize: '1.8rem',
    fontWeight: 900,
    color: 'var(--primary-color)',
    lineHeight: 1.1,
    marginBottom: '2px'
};

const metricLabelStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '6px'
};

const metricDescStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.4
};

const moduleCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '28px',
    padding: '2.5rem 2rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative'
};

const moduleIconContainerStyle = (color: string): React.CSSProperties => ({
    background: `${color}15`,
    color: color,
    border: `1px solid ${color}30`,
    padding: '16px',
    borderRadius: '20px',
    marginBottom: '1.5rem'
});

const moduleTitleStyle: React.CSSProperties = {
    fontSize: '1.3rem',
    fontWeight: 800,
    marginBottom: '0.75rem',
    color: '#fff'
};

const moduleDescStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '2rem',
    flexGrow: 1
};

const moduleLinkStyle = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: color,
    fontWeight: 800,
    fontSize: '0.9rem',
    borderBottom: `2px solid transparent`,
    transition: 'all 0.2s',
    paddingBottom: '2px'
});

export default DemoHub;
