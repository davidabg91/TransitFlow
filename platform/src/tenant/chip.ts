/**
 * The card's serial number, handed to the page rather than carried in its
 * address.
 *
 * A tag that opens a link gives the browser the link and nothing else, so the
 * serial has to arrive some other way. Putting it in the address works, and is
 * what the older reader did, but it parks the serial in the address bar beside
 * the card's code, where copying the address hands over both halves of what a
 * forged card would need.
 *
 * The desk reader embeds this page, so it can simply call in. It opens the plain
 * address and hands the serial over here, where it stays in memory for as long
 * as the page is open and appears in no URL, no history entry, and nothing
 * anybody can copy.
 *
 * The serial is stored against the card it belongs to. Navigation and the call
 * are two separate events and either can land first, so rather than depending on
 * their order, a page only takes a serial that names its own card.
 */

interface Held {
    uid: string;
    /** The card it was read from, when the reader said. */
    code: string;
}

let held: Held | null = null;
const listeners = new Set<(uid: string, code: string) => void>();

const clean = (value: unknown) =>
    String(value || '').trim().toUpperCase().replace(/[^0-9A-F]/g, '');

/**
 * What the desk reader calls, and what the page's own chip reading uses.
 * `code` is the card the serial was read from; without it the serial is taken
 * to belong to whatever is on screen.
 */
export const setChipSerial = (uid: string, code?: string): boolean => {
    const serial = clean(uid);
    if (!serial) return false;
    held = { uid: serial, code: clean(code) };
    listeners.forEach(fn => fn(held!.uid, held!.code));
    return true;
};

/** The serial for this card, if one has been handed over for it. */
export const getChipSerial = (code?: string): string => {
    if (!held) return '';
    if (held.code && code && held.code !== clean(code)) return '';
    return held.uid;
};

/** Told when one arrives, for a page that was already open when it did. */
export const onChipSerial = (fn: (uid: string, code: string) => void) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
};

export const clearChipSerial = () => { held = null; };

// The name the desk reader looks for. Registered as the bundle loads, before
// anything renders, because the reader calls as soon as the page is up and
// should not have to wait for React.
declare global {
    interface Window {
        transitflowChip?: (uid: string, code?: string) => boolean;
    }
}

if (typeof window !== 'undefined') {
    window.transitflowChip = setChipSerial;
}
