/**
 * Where this screen is being drawn, when that changes what it should draw.
 *
 * Two of the three places this app runs cannot afford a blurred background. The
 * reader at the ticket desk composites on the processor — its graphics drivers
 * deliver frames incorrectly any other way, so that is not a setting anyone can
 * change — and a blur behind a bar fixed over moving content is then recomputed
 * on every frame of every scroll. The terminals on the buses have little power
 * to spare and a battery to protect, and pay the same cost for the same reason.
 *
 * An office browser on a desktop pays almost nothing for it, so it keeps it.
 *
 * Decided once, at startup: neither of these things changes while the app is
 * open, and asking again on every render would be work for an answer already
 * known.
 */
const detect = (): boolean => {
    try {
        const ua = navigator.userAgent || '';
        // The desk reader is a Qt application with a browser inside it.
        if (ua.includes('QtWebEngine')) return true;
        // The terminal, which the native bridge gives away before any of our
        // own code has run.
        return !!(window as unknown as { androidBridge?: unknown }).androidBridge;
    } catch {
        return false;
    }
};

/** True where a blur costs a frame rather than nothing. */
export const plainSurface = detect();

/**
 * A blur, or nothing, depending on where this is being drawn.
 *
 * Returned as the pair React needs, so a component sets both properties from one
 * call and cannot leave the prefixed one behind by accident.
 */
export const blur = (radius: string) => (
    plainSurface
        ? { backdropFilter: undefined, WebkitBackdropFilter: undefined }
        : { backdropFilter: `blur(${radius})`, WebkitBackdropFilter: `blur(${radius})` }
);
