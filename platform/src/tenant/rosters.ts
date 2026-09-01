import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Authorised-employee rosters — the official lists of people entitled to a free
 * service card, used to flag a service card issued to somebody who is not on
 * one.
 *
 * These are per-company by nature: each operator agrees its own list with its
 * община. They used to be a compiled constant, which meant the platform either
 * shipped one operator's staff names to everybody or, as it ended up, shipped an
 * empty list nobody could fill. They live in the company's own data now.
 *
 * A company with no roster configured gets no accusations: the audit reports
 * that there is nothing to check against, rather than flagging every card.
 */

export interface ServiceRosterEntry {
    no: number;
    /** Име Презиме Фамилия, as written in the official list. */
    name: string;
    position: string;
    direction: string;
    section?: string;
}

export interface ServiceRoster {
    id: string;
    municipality: string;
    title: string;
    year: number;
    entries: ServiceRosterEntry[];
}

export const useServiceRosters = () => {
    const { tenantId } = useAuth();
    const [rosters, setRosters] = useState<ServiceRoster[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) { setRosters([]); setLoading(false); return; }
        const unsub = onSnapshot(
            query(collection(db, 'service_rosters'), orderBy('year', 'desc')),
            snap => {
                setRosters(snap.docs.map(d => {
                    const data = d.data() as Omit<ServiceRoster, 'id'>;
                    return {
                        id: d.id,
                        municipality: String(data.municipality || ''),
                        title: String(data.title || ''),
                        year: Number(data.year) || 0,
                        entries: Array.isArray(data.entries) ? data.entries : [],
                    };
                }));
                setLoading(false);
            },
            err => { console.error('Service rosters unavailable:', err); setLoading(false); }
        );
        return () => unsub();
    }, [tenantId]);

    return { rosters, loading };
};
