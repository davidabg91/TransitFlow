import React from 'react';
import { LogOut, Lock, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo_main.png';

/**
 * Shown in place of the whole system when a company's subscription is unpaid.
 *
 * Their data is untouched and still there — the rules block writes, not reads —
 * so the wording says "paused", not "closed". Somebody who has fallen behind on
 * an invoice should be told how to fix it, not made to fear they have lost
 * their cards.
 */
const CompanySuspended: React.FC<{ companyName?: string; reason?: string }> = ({ companyName, reason }) => {
    const { logout } = useAuth();

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem 1rem', background: 'var(--bg-color)', color: '#fff',
        }}>
            <div style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}>

                <img src={logo} alt="TransitFlow" style={{ height: '42px', width: 'auto', marginBottom: '2.5rem', opacity: 0.9 }} />

                <div style={{
                    width: '76px', height: '76px', borderRadius: '24px', margin: '0 auto 1.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,171,0,0.1)', border: '1px solid rgba(255,171,0,0.28)',
                    color: '#ffab00',
                }}>
                    <Lock size={34} />
                </div>

                <h1 style={{ margin: '0 0 0.85rem', fontSize: '1.7rem', fontWeight: 900, lineHeight: 1.2 }}>
                    Достъпът е временно спрян
                </h1>

                <p style={{
                    margin: '0 auto 1.25rem', maxWidth: '44ch',
                    color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.65,
                }}>
                    {companyName ? <>Абонаментът на <strong style={{ color: '#fff' }}>{companyName}</strong> не е заплатен.</>
                        : 'Абонаментът на вашата фирма не е заплатен.'}
                    {' '}Свържете се с нас и заплатете, за да продължите да ползвате системата.
                </p>

                <p style={{
                    margin: '0 auto 2.25rem', maxWidth: '46ch',
                    color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.85,
                }}>
                    Данните ви са запазени и нищо не е изтрито. Достъпът се възстановява веднага
                    щом плащането постъпи.
                </p>

                {reason && (
                    <div style={{
                        margin: '0 auto 2rem', maxWidth: '44ch', padding: '0.85rem 1.1rem',
                        borderRadius: '12px', textAlign: 'left',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)',
                        color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55,
                    }}>
                        <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Причина</strong>
                        {reason}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                    <a href="tel:000000000" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.85rem 1.5rem', borderRadius: '12px', textDecoration: 'none',
                        background: 'var(--primary-color)', color: '#00252a', fontWeight: 800, fontSize: '0.95rem',
                    }}>
                        <Phone size={17} /> Свържете се с нас
                    </a>
                    <a href="mailto:contact@example.bg" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.85rem 1.5rem', borderRadius: '12px', textDecoration: 'none',
                        background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                        border: '1px solid var(--surface-border)',
                    }}>
                        <Mail size={17} /> Пишете ни
                    </a>
                </div>

                <button
                    onClick={() => logout()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600,
                    }}
                >
                    <LogOut size={15} /> Изход
                </button>
            </div>
        </div>
    );
};

export default CompanySuspended;
