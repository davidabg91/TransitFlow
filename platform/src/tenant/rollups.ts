import { useEffect, useState } from 'react';
import { getCountFromServer } from 'firebase/firestore';
import { collection, onSnapshot, orderBy, query, where } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * The company's own figures, read as totals rather than derived from every card.
 *
 * The dashboard used to subscribe to the whole `clients` collection and add the
 * numbers up in the browser. That is a download of the entire company every time
 * somebody opens ТАБЛО, and it grows with the company. A Cloud Function keeps
 * one document per month instead, and this reads those.
 *
 * Counts that no rollup can hold — how many cards exist, how many were issued on
 * a given day — come from Firestore's count aggregation, which is billed per
 * thousand documents rather than per document, and never downloads them.
 */

export interface RouteTotals {
    name: string;
    revenue: number;
    payments: number;
}

export interface MonthRollup {
    month: string;
    /**
     * Money for subscriptions *of* this month — what the month earned.
     * A subscription bought in August for September earns September.
     */
    revenue: number;
    /**
     * Money that came *in* during this month, whichever month it was for.
     * This is the till: what the desk actually took.
     */
    received: number;
    payments: number;
    /** Cards whose subscription covers this month. */
    activeCards: number;
    byMethod: Record<string, number>;
    byRoute: Record<string, RouteTotals>;
    /** Money received on each day of this month, keyed "01".."31". */
    byDay: Record<string, number>;
    /** Cards issued on each day of this month. */
    byDayNew: Record<string, number>;
}

const empty = (month: string): MonthRollup => ({
    month, revenue: 0, received: 0, payments: 0, activeCards: 0,
    byMethod: {}, byRoute: {}, byDay: {}, byDayNew: {},
});

const normalise = (month: string, d: Record<string, unknown>): MonthRollup => ({
    month,
    revenue: Number(d.revenue) || 0,
    received: Number(d.received) || 0,
    payments: Number(d.payments) || 0,
    activeCards: Number(d.activeCards) || 0,
    byMethod: (d.byMethod as Record<string, number>) || {},
    byRoute: (d.byRoute as Record<string, RouteTotals>) || {},
    byDay: (d.byDay as Record<string, number>) || {},
    byDayNew: (d.byDayNew as Record<string, number>) || {},
});

/**
 * Every month the company has taken money in, newest first. One small document
 * each, so the whole history is a fraction of a single page of cards.
 */
export const useRollups = () => {
    const { tenantId } = useAuth();
    const [months, setMonths] = useState<MonthRollup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) { setLoading(false); return; }
        const unsub = onSnapshot(
            query(collection(db, 'rollups'), orderBy('month', 'desc')),
            snap => {
                setMonths(snap.docs.map(d => normalise(d.id, d.data() as Record<string, unknown>)));
                setError(null);
                setLoading(false);
            },
            err => {
                // Never fall through to zeroes: "no revenue" and "not loaded" look
                // identical on a dashboard and mean very different things.
                console.error('Rollups unavailable:', err);
                setError(err.message);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [tenantId]);

    return { months, loading, error };
};

/** One month's figures, or an empty set when nothing was taken in it. */
export const monthOf = (months: MonthRollup[], month: string): MonthRollup =>
    months.find(m => m.month === month) || empty(month);

/** Every month added together, for the "всички" view. */
export const allMonths = (months: MonthRollup[]): MonthRollup => {
    const total = empty('all');
    for (const m of months) {
        total.revenue += m.revenue;
        total.received += m.received;
        total.payments += m.payments;
        for (const [k, v] of Object.entries(m.byMethod)) total.byMethod[k] = (total.byMethod[k] || 0) + v;
        for (const [k, v] of Object.entries(m.byRoute)) {
            const line = total.byRoute[k] || { name: v.name, revenue: 0, payments: 0 };
            line.revenue += v.revenue;
            line.payments += v.payments;
            total.byRoute[k] = line;
        }
    }
    // activeCards is a count of cards live in one month; summing it across months
    // would count the same card once per month it ran, so it is left at zero and
    // the caller uses the live card count instead.
    return total;
};

/** What the desk took on one day, from the month that day belongs to. */
export const takingsOn = (months: MonthRollup[], dayIso: string): number =>
    monthOf(months, dayIso.slice(0, 7)).byDay[dayIso.slice(8, 10)] || 0;

/** Cards issued on one day. */
export const issuedOn = (months: MonthRollup[], dayIso: string): number =>
    monthOf(months, dayIso.slice(0, 7)).byDayNew[dayIso.slice(8, 10)] || 0;

/** Lines by takings, largest first — what ПРИХОДИ ПО ЛИНИИ draws. */
export const routeTotals = (r: MonthRollup): RouteTotals[] =>
    Object.values(r.byRoute)
        .filter(x => x.revenue || x.payments)
        .sort((a, b) => b.revenue - a.revenue);

// ─────────────────────────────────────────────────────────────────────────────
// Counts, straight from the server
// ─────────────────────────────────────────────────────────────────────────────

const nextDay = (iso: string) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
};

export interface CardCounts {
    /** Cards on file that have not been cancelled. */
    active: number;
    /** Cards issued on the chosen day. */
    registeredOnDay: number;
    /** Cards scanned today. */
    scannedToday: number;
    loading: boolean;
}

/**
 * Card counts without reading the cards.
 *
 * `getCountFromServer` answers on the server and bills a read per thousand
 * documents, so a company of four thousand cards costs four reads instead of
 * four thousand — and nothing is downloaded.
 */
export const useCardCounts = (selectedDate: string, refreshKey?: unknown): CardCounts => {
    const { tenantId } = useAuth();
    const [counts, setCounts] = useState<CardCounts>({
        active: 0, registeredOnDay: 0, scannedToday: 0, loading: true,
    });

    useEffect(() => {
        if (!tenantId) return;
        let cancelled = false;
        const today = new Date().toISOString().slice(0, 10);

        const run = async () => {
            try {
                const cards = collection(db, 'clients');
                // Counted as "all minus cancelled" rather than `isCanceled == false`:
                // an equality filter skips documents where the field was never
                // written, and those cards are very much on file.
                const [total, canceledCards, onDay, scanned] = await Promise.all([
                    getCountFromServer(query(cards)),
                    getCountFromServer(query(cards, where('isCanceled', '==', true))),
                    getCountFromServer(query(
                        cards,
                        where('createdAt', '>=', selectedDate),
                        where('createdAt', '<', nextDay(selectedDate))
                    )),
                    getCountFromServer(query(
                        cards,
                        where('lastScanAt', '>=', today),
                        where('lastScanAt', '<', nextDay(today))
                    )),
                ]);
                if (cancelled) return;
                setCounts({
                    active: total.data().count - canceledCards.data().count,
                    registeredOnDay: onDay.data().count,
                    scannedToday: scanned.data().count,
                    loading: false,
                });
            } catch (err) {
                console.error('Card counts unavailable:', err);
                if (!cancelled) setCounts(c => ({ ...c, loading: false }));
            }
        };
        run();
        return () => { cancelled = true; };
    }, [tenantId, selectedDate, refreshKey]);

    return counts;
};
