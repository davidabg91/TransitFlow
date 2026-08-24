import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getActiveTenant, getDoc, onSnapshot, orderBy, query } from './db';
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
    // A passenger who has just tapped their own card is not signed in and so
    // carries no claim; the company is in the address they arrived at. The
    // fares are the tariff printed on the bus, not private data.
    const tenant = tenantId || getActiveTenant();
    const [routes, setRoutes] = useState<RouteDef[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenant) { setRoutes([]); setLoading(false); return; }
        const unsub = onSnapshot(
            query(collection(db, 'routes'), orderBy('name')),
            snap => {
                setRoutes(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<RouteDef, 'id'>) })));
                setLoading(false);
            },
            err => { console.error('Routes unavailable:', err); setLoading(false); }
        );
        return () => unsub();
    }, [tenant]);

    return { routes, loading };
};

/**
 * The names of the lines the company currently runs — what every route picker
 * lists. A line switched off keeps its history but stops being offered.
 */
export const useRouteNames = (): string[] => {
    const { routes } = useRoutes();
    return useMemo(
        () => routes.filter(r => r.active !== false).map(r => r.name),
        [routes]
    );
};

/**
 * The company's lines together with a price lookup over them.
 *
 * The panels used to price against a compiled table of one operator's routes,
 * with the discounts for student and pensioner cards written into the code. A
 * second company has neither those routes nor those discounts, so the price now
 * comes from the matrix the company fills in under Настройки, and a price it has
 * not set reads as `null` — the form then leaves the amount alone rather than
 * quoting a figure nobody agreed to.
 */
export const useRoutePricing = () => {
    const { routes, loading } = useRoutes();

    return useMemo(() => {
        const byName = new Map(routes.map(r => [r.name, r]));
        return {
            routes,
            loading,
            names: routes.filter(r => r.active !== false).map(r => r.name),
            /** Does the company run this line? */
            has: (name?: string) => !!name && byName.has(name),
            /** The fare, or `null` when the company has not set one. */
            priceOf: (
                name?: string,
                cardType?: string,
                period: PeriodId = 'month'
            ): number | null => {
                // A service card is issued to staff and is never charged for,
                // whatever the line's matrix says.
                if (cardType === 'Служебна карта') return 0;
                return routePrice(byName.get(name || ''), cardType, period);
            },
            /** A line's stops, for the passenger-facing card. */
            stopsOf: (name?: string): string[] => byName.get(name || '')?.stops || [],
        };
    }, [routes, loading]);
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
