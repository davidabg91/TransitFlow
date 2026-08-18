/**
 * Demo shim for @capacitor/core.
 *
 * The real system runs inside a Capacitor Android shell on the myPOS Smart
 * terminal, where the native `DaryScanner` plugin streams NFC taps into the
 * web layer. The demo runs in a plain browser, so this shim reports the "web"
 * platform and registers a plugin whose NFC events are produced by the
 * on-screen card simulator instead of real hardware.
 */

export interface PluginListenerHandle {
    remove: () => Promise<void>;
}

export const Capacitor = {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
    isPluginAvailable: (_name: string) => false,
};

type AnyListener = (event: any) => void;

const registry: Record<string, AnyListener[]> = {};

/** Dispatch a simulated native event to every registered listener. */
export const emitNativeEvent = (eventName: string, payload: any) => {
    (registry[eventName] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.error('[demo shim] listener failed', e); }
    });
};

export function registerPlugin<T = any>(name: string): T {
    return {
        // NFC lifecycle — no-ops in the browser
        startNfcScan: async () => { console.log(`[demo shim] ${name}.startNfcScan()`); },
        stopNfcScan: async () => { console.log(`[demo shim] ${name}.stopNfcScan()`); },
        triggerWarningBeep: async () => {
            // A short synthesised beep so the demo still gives audible feedback
            try {
                const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!Ctx) return;
                const ctx = new Ctx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = 320;
                gain.gain.value = 0.08;
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start();
                setTimeout(() => { osc.stop(); ctx.close(); }, 350);
            } catch { /* audio is best-effort in the demo */ }
        },
        addListener: async (eventName: string, listenerFunc: AnyListener): Promise<PluginListenerHandle> => {
            if (!registry[eventName]) registry[eventName] = [];
            registry[eventName].push(listenerFunc);
            return {
                remove: async () => {
                    registry[eventName] = (registry[eventName] || []).filter(f => f !== listenerFunc);
                }
            };
        },
        removeAllListeners: async () => { Object.keys(registry).forEach(k => delete registry[k]); },
    } as unknown as T;
}

export default { Capacitor, registerPlugin };
