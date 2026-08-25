import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getActiveTenant, onSnapshot, orderBy, query } from './db';
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
        if (!tenantId) { setSettings(s => ({ ...s, loading: false })); return; }
        // Live rather than fetched once: an admin who enables a new period in
        // Настройки should see it in the issuing forms straight away, instead of
        // changing a setting that appears to do nothing until a reload.
        const unsub = onSnapshot(
            doc(db, 'settings', 'general'),
            snap => {
                const d = (snap.exists() ? snap.data() : {}) || {};
                setSettings({
                    periods: Array.isArray(d.periods) && d.periods.length ? d.periods : DEFAULT_PERIODS,
                    cardTypes: Array.isArray(d.cardTypes) && d.cardTypes.length ? d.cardTypes : DEFAULT_CARD_TYPES,
                    loading: false,
                });
            },
            () => setSettings(s => ({ ...s, loading: false }))
        );
        return () => unsub();
    }, [tenantId]);

    return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// Saying what a subscription covers
// ─────────────────────────────────────────────────────────────────────────────

const BG_MONTHS = [
    'ЯНУАРИ', 'ФЕВРУАРИ', 'МАРТ', 'АПРИЛ', 'МАЙ', 'ЮНИ',
    'ЮЛИ', 'АВГУСТ', 'СЕПТЕМВРИ', 'ОКТОМВРИ', 'НОЕМВРИ', 'ДЕКЕМВРИ',
];

/** A month the way it is spoken: АВГУСТ 2026. */
export const formatMonthBG = (monthIso?: string): string => {
    if (!monthIso || !monthIso.includes('-')) return monthIso || '';
    const [year, month] = monthIso.split('-');
    return `${BG_MONTHS[parseInt(month, 10) - 1] || month} ${year}`;
};

/** A day the way it is written: 15.08.2026. */
export const formatDayBG = (iso?: string): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d ? `${d}.${m}.${y}` : formatMonthBG(iso);
};

/**
 * What a subscription covers, in words.
 *
 * A subscription sold by date says its dates; one sold by the calendar month
 * says its month. Showing only the month for a subscription that runs from the
 * 15th to the 14th tells the passenger nothing they can act on.
 */
export const formatSpanBG = (entry?: { month?: string; from?: string; to?: string }): string => {
    if (!entry) return '';
    if (entry.from && entry.to) return `${formatDayBG(entry.from)} – ${formatDayBG(entry.to)}`;
    return formatMonthBG(entry.month);
};

/** The last day a subscription is valid — its end date, or the end of its month. */
export const spanEndDay = (entry?: { month?: string; from?: string; to?: string }): string => {
    if (!entry) return '';
    if (entry.to) return entry.to;
    if (!entry.month) return '';
    const [y, m] = entry.month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${entry.month}-${String(last).padStart(2, '0')}`;
};

/** Sorting key that puts a dated subscription in its true place in the list. */
export const spanSortKey = (entry: { month?: string; from?: string }): string =>
    entry.from || (entry.month ? `${entry.month}-01` : '');

/**
 * The subscription in force on a day; failing that, the one that runs latest.
 *
 * The panels used to reach for the last entry in the array, which is the order
 * it was written in rather than the order it applies in.
 */
export const currentEntry = <T extends { month?: string; from?: string; to?: string }>(
    history: T[],
    dayIso: string
): T | null => {
    if (!history || history.length === 0) return null;
    const live = history.filter(e => coversDate(e, dayIso));
    const pick = (list: T[]) =>
        [...list].sort((a, b) => spanEndDay(b).localeCompare(spanEndDay(a)))[0] || null;
    return pick(live.length ? live : history);
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
/**
 * Which period a subscription was sold as, worked out from its span.
 *
 * A passenger's card carries the dates it runs for but not the name of the
 * product, and their own page needs the name to price a renewal. Spans are
 * matched to the nearest period offered; anything unusual is date-to-date.
 */
export const periodFromSpan = (from?: string, to?: string): PeriodId => {
    if (!from || !to) return 'month';
    const days = Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / 86400000
    ) + 1;
    if (!isFinite(days) || days <= 0) return 'month';
    const named = ALL_PERIODS.filter(p => p.days !== null);
    const nearest = named.reduce((best, p) =>
        Math.abs((p.days as number) - days) < Math.abs((best.days as number) - days) ? p : best
    );
    // Within three days of a named period, call it that period; a fortnight sold
    // on the 1st and one sold on the 16th are the same product.
    return Math.abs((nearest.days as number) - days) <= 3 ? nearest.id : 'custom';
};

export const coversMonth = (
    entry: { month?: string; from?: string; to?: string },
    monthIso: string
): boolean => {
    // A quarter sold in September is live through December, so it covers four
    // months even though it is booked into one. Revenue still belongs to the
    // month it was taken in — that is a different question, asked elsewhere.
    if (entry.from && entry.to) {
        return entry.from.slice(0, 7) <= monthIso && monthIso <= entry.to.slice(0, 7);
    }
    return !!entry.month && entry.month === monthIso;
};

export const coversDate = (
    entry: { month?: string; from?: string; to?: string },
    dayIso: string
): boolean => {
    if (entry.from && entry.to) return dayIso >= entry.from && dayIso <= entry.to;
    return !!entry.month && entry.month === dayIso.slice(0, 7);
};
