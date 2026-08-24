import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * A company's own configuration: the lines it runs and the subscriptions it
 * sells.
 *
 * These were hard-coded to one operator's routes around Pleven, with prices
 * fixed per calendar month. Neither survives a second company — another
 * operator has different lines, different fares, and may sell a fortnight or a
 * quarter rather than a month.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subscription periods
// ─────────────────────────────────────────────────────────────────────────────

export type PeriodId = 'half_month' | 'month' | 'quarter' | 'custom';

export interface PeriodDef {
    id: PeriodId;
    label: string;
    /** Days added to the start date. `null` means the operator picks the end date. */
    days: number | null;
}

export const ALL_PERIODS: PeriodDef[] = [
    { id: 'half_month', label: 'Половин месец', days: 15 },
    { id: 'month', label: 'Месец', days: 30 },
    { id: 'quarter', label: 'Тримесечие', days: 90 },
    { id: 'custom', label: 'От дата до дата', days: null },
];

/** A company that has configured nothing still sells a month, as before. */
export const DEFAULT_PERIODS: PeriodId[] = ['month'];

export interface CompanySettings {
    /** Which subscriptions this company offers. */
    periods: PeriodId[];
    /** Card types it issues. */
    cardTypes: string[];
    loading: boolean;
}

export const DEFAULT_CARD_TYPES = [
    'Нормална карта', 'Ученическа карта', 'Пенсионерска карта',
    'Учителска карта', 'Инвалидна карта', 'Служебна карта',
];

// ─────────────────────────────────────────────────────────────────────────────
// Lines
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteDef {
    id: string;
    name: string;
    /** Stops along the line, in order — shown to passengers. */
    stops: string[];
    /** Price of a single ticket, in euro. */
    singleTicket: number | null;
    /**
     * Subscription price by card type, then by period:
     * `prices['Ученическа карта'].month = 35`
     */
    prices: Record<string, Partial<Record<PeriodId, number>>>;
    active: boolean;
    order?: number;
}

export const emptyRoute = (): Omit<RouteDef, 'id'> => ({
    name: '',
    stops: [],
    singleTicket: null,
    prices: {},
    active: true,
});

/**
 * The price of a subscription on a line, for a card type and a period.
 * `null` means the company has not set one — the form then asks rather than
 * quoting a number nobody agreed to.
 */
export const routePrice = (
    route: RouteDef | undefined,
    cardType: string | undefined,
    period: PeriodId
): number | null => {
    if (!route || !cardType) return null;
    const forType = route.prices?.[cardType];
    const value = forType?.[period];
    return typeof value === 'number' ? value : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reading them
// ─────────────────────────────────────────────────────────────────────────────

/** The company's lines, live — the panels list them and price against them. */
export const useRoutes = () => {
    const { tenantId } = useAuth();
    const [routes, setRoutes] = useState<RouteDef[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) { setRoutes([]); setLoading(false); return; }
        const unsub = onSnapshot(
            query(collection(db, 'routes'), orderBy('name')),
            snap => {
                setRoutes(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<RouteDef, 'id'>) })));
                setLoading(false);
            },
            err => { console.error('Routes unavailable:', err); setLoading(false); }
        );
        return () => unsub();
    }, [tenantId]);

    return { routes, loading };
};

export const useCompanySettings = (): CompanySettings => {
    const { tenantId } = useAuth();
    const [settings, setSettings] = useState<CompanySettings>({
        periods: DEFAULT_PERIODS,
        cardTypes: DEFAULT_CARD_TYPES,
        loading: true,
    });

    useEffect(() => {
        if (!tenantId) return;
        getDoc(doc(db, 'settings', 'general'))
            .then(snap => {
                const d = snap.exists() ? snap.data() || {} : {};
                setSettings({
                    periods: Array.isArray(d.periods) && d.periods.length ? d.periods : DEFAULT_PERIODS,
                    cardTypes: Array.isArray(d.cardTypes) && d.cardTypes.length ? d.cardTypes : DEFAULT_CARD_TYPES,
                    loading: false,
                });
            })
            .catch(() => setSettings(s => ({ ...s, loading: false })));
    }, [tenantId]);

    return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// Working out a subscription's dates
// ─────────────────────────────────────────────────────────────────────────────

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The span a subscription covers, from its start and the period sold.
 *
 * A subscription also keeps the calendar month it is booked into, so the
 * revenue reports — which group by month — carry on working unchanged while
 * validity is judged on the dates.
 */
export const periodRange = (startIso: string, period: PeriodId, customEndIso?: string) => {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return null;

    if (period === 'custom') {
        if (!customEndIso) return null;
        return { from: startIso, to: customEndIso, month: startIso.slice(0, 7) };
    }

    const def = ALL_PERIODS.find(p => p.id === period);
    const days = def?.days ?? 30;
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return { from: iso(start), to: iso(end), month: startIso.slice(0, 7) };
};

/**
 * Is this subscription valid on the given day?
 *
 * Entries written before dated subscriptions existed carry only a month, so
 * those fall back to matching the calendar month — otherwise every card issued
 * so far would read as expired.
 */
export const coversDate = (
    entry: { month?: string; from?: string; to?: string },
    dayIso: string
): boolean => {
    if (entry.from && entry.to) return dayIso >= entry.from && dayIso <= entry.to;
    return !!entry.month && entry.month === dayIso.slice(0, 7);
};
