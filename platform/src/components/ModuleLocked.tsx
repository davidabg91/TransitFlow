import React from 'react';
import { Lock, Phone } from 'lucide-react';
import { MODULE_LABELS, type Modules } from '../tenant/modules';

/**
 * Shown in place of a module the company has not licensed.
 *
 * The tab stays visible on purpose — hiding it would leave staff wondering
 * whether the feature exists at all, and this is the one place where saying
 * "this exists, it is simply not switched on for you" is the honest answer.
 */
const ModuleLocked: React.FC<{ module: keyof Modules }> = ({ module }) => (
    <div style={{ animation: 'fadeIn 0.4s ease', padding: '1rem 0' }}>
        <div style={{
            maxWidth: '620px', margin: '2rem auto', textAlign: 'center',
            padding: '3rem 2rem', borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed var(--surface-border)',
        }}>
            <div style={{
                width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,171,0,0.1)', border: '1px solid rgba(255,171,0,0.25)',
                color: '#ffab00',
            }}>
                <Lock size={28} />
            </div>

            <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                „{MODULE_LABELS[module]}“ не е активиран
            </h3>

            <p style={{
                margin: '0 auto 1.75rem', maxWidth: '46ch',
                color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.65,
            }}>
                Този модул е част от системата, но не е включен в абонамента на вашата фирма.
                Активирането става от страна на TransitFlow и започва да работи веднага след това.
            </p>

            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.8rem 1.4rem', borderRadius: '12px',
                background: 'rgba(0,173,181,0.08)', border: '1px solid rgba(0,173,181,0.25)',
                color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.9rem',
            }}>
                <Phone size={16} />
                Свържете се с TransitFlow за активиране
            </div>
        </div>
    </div>
);

export default ModuleLocked;
