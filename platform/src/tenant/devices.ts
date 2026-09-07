import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * The terminals a company runs.
 *
 * A terminal is not a person and cannot be given a password, so it signs in
 * anonymously and proves which company it belongs to with a one-time code read
 * off the admin panel. From then on it keeps its own record here: that it is
 * awake, and how much charge it has left.
 *
 * There is no "offline" flag to trust. A terminal that has been switched off, or
 * has lost signal, or has run flat, cannot tell anybody so — the last thing it
 * ever does is stop reporting. So the panel decides from silence: a device that
 * has not spoken recently is treated as offline, and how recently is the only
 * question worth arguing about.
 */

/** A device is called offline once this long has passed without a word. */
export const SILENT_FOR_OFFLINE_MS = 5 * 60 * 1000;

/** How often a terminal reports in. Frequent enough that five minutes of
 *  silence is meaningful, rare enough to cost nothing. */
export const HEARTBEAT_MS = 60 * 1000;

export interface Device {
    id: string;
    label: string;
    model: string;
    platform: string;
    appVersion: string;
    /** 0–100, or null when the device has not said. */
    battery: number | null;
    charging: boolean;
    enrolledAt: string;
    lastSeenAt: string;
}

const normalise = (id: string, d: Record<string, unknown>): Device => ({
    id,
    label: String(d.label || 'Терминал'),
    model: String(d.model || ''),
    platform: String(d.platform || ''),
    appVersion: String(d.appVersion || ''),
    battery: typeof d.battery === 'number' ? Math.round(d.battery) : null,
    charging: d.charging === true,
    enrolledAt: String(d.enrolledAt || ''),
    lastSeenAt: String(d.lastSeenAt || ''),
});

/** Has this device spoken recently enough to be called awake? */
export const isOnline = (device: Device, now = Date.now()): boolean => {
    const seen = Date.parse(device.lastSeenAt);
    return !isNaN(seen) && now - seen < SILENT_FOR_OFFLINE_MS;
};

/** How long ago it last spoke, in words. */
export const lastSeenText = (device: Device, now = Date.now()): string => {
    const seen = Date.parse(device.lastSeenAt);
    if (isNaN(seen)) return 'никога';
    const secs = Math.max(0, Math.round((now - seen) / 1000));
    if (secs < 90) return 'току-що';
    const mins = Math.round(secs / 60);
    if (mins < 60) return `преди ${mins} мин`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `преди ${hours} ч`;
    return `преди ${Math.round(hours / 24)} дни`;
};

export const useDevices = () => {
    const { tenantId } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) { setLoading(false); return; }
        const unsub = onSnapshot(
            query(collection(db, 'devices'), orderBy('label')),
            snap => {
                setDevices(snap.docs.map(d => normalise(d.id, d.data() as Record<string, unknown>)));
                setError(null);
                setLoading(false);
            },
            err => {
                console.error('Devices unavailable:', err);
                setError(err.message);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [tenantId]);

    return { devices, loading, error };
};

// ─────────────────────────────────────────────────────────────────────────────
// What a terminal reports about itself
// ─────────────────────────────────────────────────────────────────────────────

interface Reading {
    battery: number | null;
    charging: boolean;
    model: string;
    platform: string;
}

/**
 * The terminal's own state, from Capacitor when the app is running natively.
 *
 * Loaded on demand rather than imported: the browser build has no such plugin,
 * and a missing plugin must not stop the page from loading for the desk staff
 * who never see a terminal.
 */
const readState = async (): Promise<Reading> => {
    const reading: Reading = { battery: null, charging: false, model: '', platform: 'web' };
    try {
        const capacitor = (window as unknown as {
            Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
        }).Capacitor;
        if (!capacitor?.isNativePlatform?.()) return reading;

        const device = capacitor.Plugins?.Device as {
            getInfo?: () => Promise<{ model?: string; platform?: string }>;
            getBatteryInfo?: () => Promise<{ batteryLevel?: number; isCharging?: boolean }>;
        } | undefined;
        if (!device) return reading;

        const info = await device.getInfo?.();
        reading.model = String(info?.model || '');
        reading.platform = String(info?.platform || 'native');

        const battery = await device.getBatteryInfo?.();
        // Capacitor reports 0–1; a percentage is what a person reads.
        if (typeof battery?.batteryLevel === 'number') {
            reading.battery = Math.round(battery.batteryLevel * 100);
        }
        reading.charging = battery?.isCharging === true;
    } catch (err) {
        console.warn('Device state unavailable:', err);
    }
    return reading;
};

/**
 * Keeps this terminal's record current while the app is open.
 *
 * Only a device does this — staff signing in on a computer are people, not
 * terminals, and have no record to keep. It reports once on waking and then on
 * a timer, and again whenever the screen comes back, since a terminal that has
 * been asleep has been silent and should say so as soon as it is not.
 */
export const useDeviceHeartbeat = (appVersion: string) => {
    const { currentUser, tenantId } = useAuth();
    const isTerminal = currentUser?.role === 'device';

    useEffect(() => {
        if (!isTerminal || !tenantId || !currentUser?.id) return;
        let stopped = false;

        const report = async () => {
            if (stopped) return;
            try {
                const state = await readState();
                await updateDoc(doc(db, 'devices', currentUser.id), {
                    lastSeenAt: new Date().toISOString(),
                    battery: state.battery,
                    charging: state.charging,
                    model: state.model,
                    platform: state.platform,
                    appVersion,
                });
            } catch (err) {
                // A terminal out of signal cannot report, which is the point:
                // silence is what the panel reads as offline.
                console.warn('Heartbeat failed:', err);
            }
        };

        report();
        const timer = setInterval(report, HEARTBEAT_MS);
        const onWake = () => { if (document.visibilityState === 'visible') report(); };
        document.addEventListener('visibilitychange', onWake);

        return () => {
            stopped = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onWake);
        };
    }, [isTerminal, tenantId, currentUser?.id, appVersion]);
};
