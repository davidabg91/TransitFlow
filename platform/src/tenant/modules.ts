import { useEffect, useState } from 'react';
import { getDoc, tenantDoc } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Optional, separately licensed parts of the system.
 *
 * The core — cards, payments, inspections, reports — is what every company gets.
 * These three are sold on top, so a company sees them in its panel but cannot
 * use them until the platform enables them on its record.
 *
 * The flags are read from the company's own document, which only the platform
 * can write. A company cannot switch its own modules on.
 */
export interface Modules {
    /** Passenger complaints and suggestions. */
    signals: boolean;
    /** Bus rental enquiries. */
    rentals: boolean;
    /** Push notifications to passengers. */
    notifications: boolean;
}

export const MODULE_LABELS: Record<keyof Modules, string> = {
    signals: 'Сигнали от пътници',
    rentals: 'Наемане на автобуси',
    notifications: 'Известия до пътници',
};

export const NO_MODULES: Modules = { signals: false, rentals: false, notifications: false };

/**
 * Read once per company rather than kept on a live listener: licensing changes
 * when the platform owner flips a switch, not minute to minute, and a permanent
 * listener on every panel open is a cost with nothing to show for it. A change
 * takes effect on the next load.
 */
export const useModules = (): Modules => {
    const { tenantId } = useAuth();
    const [modules, setModules] = useState<Modules>(NO_MODULES);

    useEffect(() => {
        if (!tenantId) { setModules(NO_MODULES); return; }
        let cancelled = false;
        getDoc(tenantDoc(db, tenantId))
            .then(snap => {
                if (cancelled) return;
                const m = (snap.data()?.modules || {}) as Partial<Modules>;
                setModules({
                    signals: m.signals === true,
                    rentals: m.rentals === true,
                    notifications: m.notifications === true,
                });
            })
            .catch(() => { if (!cancelled) setModules(NO_MODULES); });
        return () => { cancelled = true; };
    }, [tenantId]);

    return modules;
};
