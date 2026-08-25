import React, { useEffect } from 'react';
import { ALL_PERIODS, periodRange, useCompanySettings } from '../tenant/settings';
import type { PeriodId } from '../tenant/settings';

/**
 * Choosing what a subscription covers.
 *
 * Subscriptions were always a calendar month: one `<input type="month">`, and a
 * card counted as paid when an entry carried that month. Companies sell other
 * spans — a fortnight, a quarter, or plain date-to-date — so the span is chosen
 * here and written alongside the month.
 *
 * The month stays. It is the accounting month the payment is booked into, every
 * revenue report groups by it, and every entry written so far has one. A company
 * that offers only months therefore sees exactly the control it saw before, and
 * nothing downstream changes.
 */

export interface PeriodChoice {
    period: PeriodId;
    /** Start date (ISO). Absent means the month input is in charge. */
    from?: string;
    /** End date, for a date-to-date subscription. */
    to?: string;
}

export const defaultChoice = (): PeriodChoice => ({ period: 'month' });

/**
 * The subscription fields to write. Undefined is never returned — Firestore
 * rejects undefined values, and a plain month is the correct shape for a
 * monthly subscription rather than a month with two empty dates beside it.
 */
export const spanFields = (
    month: string,
    choice?: PeriodChoice
): { month: string; from?: string; to?: string; period?: PeriodId } => {
    if (!choice || !choice.from || choice.period === 'month') return { month };
    const range = periodRange(choice.from, choice.period, choice.to);
    if (!range) return { month };
    return { month: range.month, from: range.from, to: range.to, period: choice.period };
};

/**
 * The month a subscription runs out in, for the client's `expiryDate` field.
 * A quarter bought in September expires in December, and saying so is more
 * honest than recording the month it was sold in.
 */
export const spanExpiryMonth = (month: string, choice?: PeriodChoice): string => {
    const f = spanFields(month, choice);
    return f.to ? f.to.slice(0, 7) : f.month;
};

/** The day a subscription starts — what the duplicate-payment guard tests. */
export const spanStartDay = (month: string, choice?: PeriodChoice): string =>
    choice?.from || `${month}-01`;

/** Today in local time, since a card is judged against the local day. */
export const localToday = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmt = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface Props {
    month: string;
    onMonth: (m: string) => void;
    choice: PeriodChoice;
    onChoice: (c: PeriodChoice) => void;
    /** Applied to the month/date inputs so each form keeps its own look. */
    inputStyle?: React.CSSProperties;
    compact?: boolean;
}

const PeriodPicker: React.FC<Props> = ({ month, onMonth, choice, onChoice, inputStyle, compact }) => {
    const { periods } = useCompanySettings();
    const offered = ALL_PERIODS.filter(p => periods.includes(p.id));

    const base: React.CSSProperties = {
        width: '100%',
        padding: compact ? '0.6rem' : '0.8rem',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid var(--surface-border)',
        borderRadius: '8px',
        color: '#fff',
        colorScheme: 'dark',
        outline: 'none',
        ...inputStyle,
    };

    // The company sells months only — show the control it has always shown.
    if (offered.length <= 1 && (offered[0]?.id || 'month') === 'month') {
        return <input type="month" value={month} onChange={e => onMonth(e.target.value)} style={base} />;
    }

    // A company that does not sell months would otherwise sit on a choice of
    // 'month' that matches no option: the select shows its first entry while the
    // state still says month, and the subscription is written as a plain month
    // nobody offered. Settle on something the company actually sells.
    useEffect(() => {
        if (offered.length === 0) return;
        if (offered.some(p => p.id === choice.period)) return;
        const first = offered[0];
        onChoice(
            first.id === 'month'
                ? { period: 'month' }
                : { period: first.id, from: choice.from || `${month}-01`, to: choice.to }
        );
    }, [offered.map(p => p.id).join(','), choice.period]);

    const pick = (period: PeriodId) => {
        if (period === 'month') {
            onChoice({ period });
            return;
        }
        // Start from the first of the month already chosen, so switching period
        // does not silently move the subscription to today.
        onChoice({ period, from: choice.from || `${month}-01`, to: choice.to });
    };

    const range = choice.from ? periodRange(choice.from, choice.period, choice.to) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <select value={choice.period} onChange={e => pick(e.target.value as PeriodId)} style={base}>
                {offered.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#222' }}>{p.label}</option>
                ))}
            </select>

            {choice.period === 'month' ? (
                <input type="month" value={month} onChange={e => onMonth(e.target.value)} style={base} />
            ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ОТ</label>
                        <input
                            type="date"
                            value={choice.from || ''}
                            onChange={e => onChoice({ ...choice, from: e.target.value })}
                            style={base}
                        />
                    </div>
                    {choice.period === 'custom' && (
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ДО</label>
                            <input
                                type="date"
                                value={choice.to || ''}
                                onChange={e => onChoice({ ...choice, to: e.target.value })}
                                style={base}
                            />
                        </div>
                    )}
                </div>
            )}

            {range && choice.period !== 'month' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Валиден {fmt(range.from)} – {fmt(range.to)}
                </div>
            )}

            {choice.period === 'custom' && (!choice.from || !choice.to) && (
                <div style={{ fontSize: '0.75rem', color: '#ffab00', fontWeight: 600 }}>
                    Изберете и двете дати, иначе абонаментът се записва като цял месец.
                </div>
            )}
        </div>
    );
};

export default PeriodPicker;
