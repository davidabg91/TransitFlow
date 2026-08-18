/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TransitFlow demo — in-browser Firebase stand-in.
 *
 * The production system talks to Firestore / Firebase Auth / Storage / Callable
 * Functions. The public demo has no backend: this module re-implements the slice
 * of those SDKs that the app actually uses, on top of localStorage, so every
 * screen, listener and write path behaves exactly as it does in production —
 * including sub-collections, collection-group queries, batched writes and
 * real-time `onSnapshot` updates.
 *
 * Every page imports these names instead of `firebase/firestore` & friends;
 * nothing else in the app knows the difference.
 *
 * Seed data lives in `./demo/seed.ts`.
 */

import { SEED_COLLECTIONS, SEED_AUTH_USERS } from './demo/seed';

const app = {};
export default app;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MockSnapshot {
    id: string;
    exists(): boolean;
    data(): any;
    empty: boolean;
    docs: MockSnapshot[];
    size: number;
    ref?: any;
    metadata: { fromCache: boolean; hasPendingWrites: boolean };
    forEach(callback: (doc: MockSnapshot) => void): void;
}

export type User = any;

// ─────────────────────────────────────────────────────────────────────────────
// Storage engine — one localStorage key per collection path
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'transitflow_demo:';
const PATH_INDEX_KEY = `${PREFIX}__paths__`;
const CURRENT_USER_KEY = `${PREFIX}__session__`;
const SEED_VERSION_KEY = `${PREFIX}__seed_version__`;

/** Bump to force a re-seed for returning visitors after the demo data changes. */
const SEED_VERSION = '2026.08.18.1';

const keyFor = (path: string) => `${PREFIX}${path}`;

const readJson = (key: string, fallback: any) => {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const writeJson = (key: string, value: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // Quota exceeded — the demo keeps working in memory for this session.
        console.warn('[demo db] write failed (storage full?)', e);
    }
};

/** Every collection path that currently holds data (needed for collectionGroup). */
const knownPaths = (): string[] => readJson(PATH_INDEX_KEY, []);

const rememberPath = (path: string) => {
    const paths = knownPaths();
    if (!paths.includes(path)) {
        paths.push(path);
        writeJson(PATH_INDEX_KEY, paths);
    }
};

const readCollection = (path: string): any[] => readJson(keyFor(path), []);

const writeCollection = (path: string, list: any[]) => {
    writeJson(keyFor(path), list);
    rememberPath(path);
};

const generateId = () => {
    const c = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c?.randomUUID) return c.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
    return (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).toUpperCase().slice(0, 20);
};

// ─────────────────────────────────────────────────────────────────────────────
// Seeding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the demo dataset. `force` wipes every visitor-made change and restores
 * the shipped data — that's what the "Нулиране на демо данни" button calls.
 */
export const initializeMockDatabase = (force = false) => {
    if (force) {
        Object.keys(localStorage)
            .filter(k => k.startsWith(PREFIX))
            .forEach(k => localStorage.removeItem(k));
    }

    const seeded = localStorage.getItem(SEED_VERSION_KEY);
    if (!force && seeded === SEED_VERSION) return;

    // A newer dataset shipped — replace the seeded collections but keep nothing
    // stale behind, so the demo always shows the current feature set.
    Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX) && k !== CURRENT_USER_KEY)
        .forEach(k => localStorage.removeItem(k));

    Object.entries(SEED_COLLECTIONS).forEach(([path, docs]) => {
        writeCollection(path, docs as any[]);
    });

    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
};

initializeMockDatabase(false);

// ─────────────────────────────────────────────────────────────────────────────
// References
// ─────────────────────────────────────────────────────────────────────────────

export const db: any = { __demo: true };

/** Build the `ref` object a snapshot exposes (`d.ref.parent.parent?.id`). */
const makeDocRef = (collectionPath: string, id: string) => {
    const segments = collectionPath.split('/');
    const parentDoc = segments.length >= 3
        ? {
            type: 'doc',
            id: segments[segments.length - 2],
            path: segments.slice(0, -2).join('/'),
        }
        : null;
    return {
        type: 'doc',
        id,
        path: collectionPath,
        parent: { type: 'collection', id: segments[segments.length - 1], path: collectionPath, parent: parentDoc },
    };
};

export const collection = (_parent: any, ...segments: string[]) => {
    // collection(db, 'clients') | collection(db, 'clients', id, 'scans') | collection(docRef, 'scans')
    const base = _parent && _parent.type === 'doc' ? `${_parent.path}/${_parent.id}` : '';
    const path = [base, ...segments].filter(Boolean).join('/');
    return { type: 'collection', path };
};

/** Collection-group query: matches every sub-collection with this id. */
export const collectionGroup = (_dbInstance: any, groupId: string) => ({ type: 'collectionGroup', groupId, path: `__group__/${groupId}` });

export const doc = (parent: any, ...rest: string[]) => {
    if (parent && parent.type === 'collection') {
        // doc(colRef) -> auto id | doc(colRef, id)
        return makeDocRef(parent.path, rest[0] || generateId());
    }
    // doc(db, 'clients', 'ID') | doc(db, 'clients', 'ID', 'scans', 'SCANID')
    const segments = rest.filter(Boolean);
    const id = segments.pop() as string;
    return makeDocRef(segments.join('/'), id);
};

export const query = (ref: any, ...constraints: any[]) => ({
    ...ref,
    constraints: [...(ref.constraints || []), ...constraints],
});

export const where = (field: string, op: string, val: any) => ({ type: 'where', field, op, val });
export const orderBy = (field: string, dir: 'asc' | 'desc' = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (val: number) => ({ type: 'limit', val });

// ─────────────────────────────────────────────────────────────────────────────
// Field modifiers
// ─────────────────────────────────────────────────────────────────────────────

const DELETE_FIELD = { __sentinel: 'deleteField' };

export const increment = (value: number) => ({ __sentinel: 'increment', value });
export const arrayUnion = (...values: any[]) => ({ __sentinel: 'arrayUnion', values });
export const arrayRemove = (...values: any[]) => ({ __sentinel: 'arrayRemove', values });
export const deleteField = () => DELETE_FIELD;
export const serverTimestamp = () => new Date().toISOString();

const sameValue = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

/** Apply one `updateDoc`/`batch.update` payload onto a stored document. */
const applyUpdate = (target: any, updates: any) => {
    Object.entries(updates).forEach(([field, raw]) => {
        const val: any = raw;
        if (val === DELETE_FIELD || (val && val.__sentinel === 'deleteField')) {
            delete target[field];
            return;
        }
        if (val && val.__sentinel === 'increment') {
            target[field] = (target[field] || 0) + val.value;
            return;
        }
        if (val && val.__sentinel === 'arrayUnion') {
            if (!Array.isArray(target[field])) target[field] = [];
            val.values.forEach((v: any) => {
                if (!target[field].some((existing: any) => sameValue(existing, v))) target[field].push(v);
            });
            return;
        }
        if (val && val.__sentinel === 'arrayRemove') {
            if (!Array.isArray(target[field])) return;
            target[field] = target[field].filter((existing: any) => !val.values.some((v: any) => sameValue(existing, v)));
            return;
        }
        // Dotted field paths ("a.b") update nested objects, as Firestore does.
        if (field.includes('.')) {
            const parts = field.split('.');
            let cursor = target;
            for (let i = 0; i < parts.length - 1; i++) {
                if (typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) cursor[parts[i]] = {};
                cursor = cursor[parts[i]];
            }
            cursor[parts[parts.length - 1]] = val;
            return;
        }
        target[field] = val;
    });
    return target;
};

// ─────────────────────────────────────────────────────────────────────────────
// Query evaluation
// ─────────────────────────────────────────────────────────────────────────────

const fieldValue = (item: any, field: string) =>
    field.split('.').reduce((acc: any, part: string) => (acc === undefined || acc === null ? undefined : acc[part]), item);

const compare = (a: any, b: any): number => {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
};

const matchesWhere = (item: any, c: any): boolean => {
    const v = fieldValue(item, c.field);
    switch (c.op) {
        case '==': return sameValue(v, c.val);
        case '!=': return !sameValue(v, c.val);
        case '>': return compare(v, c.val) > 0;
        case '>=': return compare(v, c.val) >= 0;
        case '<': return compare(v, c.val) < 0;
        case '<=': return compare(v, c.val) <= 0;
        case 'in': return Array.isArray(c.val) && c.val.some((x: any) => sameValue(v, x));
        case 'not-in': return Array.isArray(c.val) && !c.val.some((x: any) => sameValue(v, x));
        case 'array-contains': return Array.isArray(v) && v.some((x: any) => sameValue(x, c.val));
        case 'array-contains-any': return Array.isArray(v) && Array.isArray(c.val) && v.some((x: any) => c.val.some((y: any) => sameValue(x, y)));
        default: return true;
    }
};

/** Resolve a ref (collection, sub-collection or collection-group) to rows. */
const resolveRows = (ref: any): { path: string; item: any }[] => {
    if (ref.type === 'collectionGroup') {
        return knownPaths()
            .filter(p => p.split('/').pop() === ref.groupId && p.includes('/'))
            .flatMap(p => readCollection(p).map(item => ({ path: p, item })));
    }
    return readCollection(ref.path).map(item => ({ path: ref.path, item }));
};

const runQuery = (ref: any): { path: string; item: any }[] => {
    let rows = resolveRows(ref);
    const constraints = ref.constraints || [];

    constraints.filter((c: any) => c.type === 'where').forEach((c: any) => {
        rows = rows.filter(r => matchesWhere(r.item, c));
    });

    const orders = constraints.filter((c: any) => c.type === 'orderBy');
    if (orders.length) {
        rows = [...rows].sort((a, b) => {
            for (const o of orders) {
                const res = compare(fieldValue(a.item, o.field), fieldValue(b.item, o.field));
                if (res !== 0) return o.dir === 'desc' ? -res : res;
            }
            return 0;
        });
    }

    const lim = constraints.find((c: any) => c.type === 'limit');
    if (lim) rows = rows.slice(0, lim.val);

    return rows;
};

const METADATA = { fromCache: false, hasPendingWrites: false };

const makeDocSnapshot = (collectionPath: string, item: any): MockSnapshot => ({
    id: item.id || '',
    data: () => item,
    exists: () => true,
    empty: false,
    docs: [],
    size: 1,
    ref: makeDocRef(collectionPath, item.id || ''),
    metadata: METADATA,
    forEach: () => { /* a document snapshot has no children */ },
});

const makeQuerySnapshot = (rows: { path: string; item: any }[]): MockSnapshot => {
    const docs = rows.map(r => makeDocSnapshot(r.path, r.item));
    return {
        id: '',
        exists: () => false,
        data: () => null,
        empty: docs.length === 0,
        docs,
        size: docs.length,
        metadata: METADATA,
        forEach: (cb: (d: MockSnapshot) => void) => docs.forEach(cb),
    };
};

const makeMissingDocSnapshot = (collectionPath: string, id: string): MockSnapshot => ({
    id,
    data: () => undefined,
    exists: () => false,
    empty: true,
    docs: [],
    size: 0,
    ref: makeDocRef(collectionPath, id),
    metadata: METADATA,
    forEach: () => { /* nothing to iterate */ },
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-time listeners
// ─────────────────────────────────────────────────────────────────────────────

type ListenerCallback = (snapshot: MockSnapshot) => void;

interface Registration { ref: any; callback: ListenerCallback }

const registrations: Registration[] = [];

const emit = (reg: Registration) => {
    try {
        if (reg.ref.type === 'doc') {
            const item = readCollection(reg.ref.path).find((x: any) => x.id === reg.ref.id);
            reg.callback(item ? makeDocSnapshot(reg.ref.path, item) : makeMissingDocSnapshot(reg.ref.path, reg.ref.id));
        } else {
            reg.callback(makeQuerySnapshot(runQuery(reg.ref)));
        }
    } catch (e) {
        console.error('[demo db] listener failed', e);
    }
};

/** Wake every listener whose ref could be affected by a write to `path`. */
const notify = (path: string) => {
    const groupId = path.split('/').pop();
    registrations
        .filter(r => {
            if (r.ref.type === 'collectionGroup') return r.ref.groupId === groupId;
            return r.ref.path === path;
        })
        .forEach(emit);
};

export const onSnapshot = (ref: any, callback: ListenerCallback, _onError?: (err: any) => void) => {
    const reg: Registration = { ref, callback };
    registrations.push(reg);
    emit(reg);
    return () => {
        const i = registrations.indexOf(reg);
        if (i >= 0) registrations.splice(i, 1);
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export const getDoc = async (docRef: any): Promise<MockSnapshot> => {
    const item = readCollection(docRef.path).find((x: any) => x.id === docRef.id);
    return item ? makeDocSnapshot(docRef.path, item) : makeMissingDocSnapshot(docRef.path, docRef.id);
};

export const getDocs = async (ref: any): Promise<MockSnapshot> => makeQuerySnapshot(runQuery(ref));

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────

const writeAdd = (collectionPath: string, data: any, forcedId?: string) => {
    const list = readCollection(collectionPath);
    const id = forcedId || generateId();
    list.push({ id, ...data });
    writeCollection(collectionPath, list);
    return id;
};

const writeSet = (collectionPath: string, id: string, data: any, merge = false) => {
    const list = readCollection(collectionPath);
    const i = list.findIndex((x: any) => x.id === id);
    const next = merge && i >= 0 ? { ...list[i], ...data, id } : { id, ...data };
    if (i >= 0) list[i] = next; else list.push(next);
    writeCollection(collectionPath, list);
};

const writeUpdate = (collectionPath: string, id: string, updates: any) => {
    const list = readCollection(collectionPath);
    const i = list.findIndex((x: any) => x.id === id);
    if (i < 0) return false;
    list[i] = applyUpdate({ ...list[i] }, updates);
    writeCollection(collectionPath, list);
    return true;
};

const writeDelete = (collectionPath: string, id: string) => {
    const list = readCollection(collectionPath);
    const next = list.filter((x: any) => x.id !== id);
    if (next.length === list.length) return false;
    writeCollection(collectionPath, next);
    return true;
};

export const addDoc = async (colRef: any, data: any) => {
    const id = writeAdd(colRef.path, data);
    notify(colRef.path);
    return makeDocRef(colRef.path, id);
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
    writeSet(docRef.path, docRef.id, data, !!options?.merge);
    notify(docRef.path);
};

export const updateDoc = async (docRef: any, updates: any) => {
    writeUpdate(docRef.path, docRef.id, updates);
    notify(docRef.path);
};

export const deleteDoc = async (docRef: any) => {
    writeDelete(docRef.path, docRef.id);
    notify(docRef.path);
};

/**
 * Transactions. The demo is single-threaded against localStorage, so there is
 * nothing to retry: read the current document, let the callback stage its
 * writes, then apply them together.
 */
export const runTransaction = async <T,>(_dbInstance: any, updateFn: (tx: any) => Promise<T>): Promise<T> => {
    const staged: { kind: 'set' | 'update' | 'delete'; ref: any; data?: any; merge?: boolean }[] = [];
    const tx = {
        async get(ref: any) { return getDoc(ref); },
        set(ref: any, data: any, options?: { merge?: boolean }) { staged.push({ kind: 'set', ref, data, merge: !!options?.merge }); return tx; },
        update(ref: any, data: any) { staged.push({ kind: 'update', ref, data }); return tx; },
        delete(ref: any) { staged.push({ kind: 'delete', ref }); return tx; },
    };
    const result = await updateFn(tx);
    const touched = new Set<string>();
    staged.forEach(op => {
        if (op.kind === 'set') writeSet(op.ref.path, op.ref.id, op.data, op.merge);
        else if (op.kind === 'update') writeUpdate(op.ref.path, op.ref.id, op.data);
        else writeDelete(op.ref.path, op.ref.id);
        touched.add(op.ref.path);
    });
    touched.forEach(notify);
    return result;
};

/** Batched writes — queued, then applied and broadcast together on commit(). */
export const writeBatch = (_dbInstance: any) => {
    const ops: { kind: 'set' | 'update' | 'delete'; ref: any; data?: any; merge?: boolean }[] = [];
    const batch = {
        set(ref: any, data: any, options?: { merge?: boolean }) { ops.push({ kind: 'set', ref, data, merge: !!options?.merge }); return batch; },
        update(ref: any, data: any) { ops.push({ kind: 'update', ref, data }); return batch; },
        delete(ref: any) { ops.push({ kind: 'delete', ref }); return batch; },
        async commit() {
            const touched = new Set<string>();
            ops.forEach(op => {
                if (op.kind === 'set') writeSet(op.ref.path, op.ref.id, op.data, op.merge);
                else if (op.kind === 'update') writeUpdate(op.ref.path, op.ref.id, op.data);
                else writeDelete(op.ref.path, op.ref.id);
                touched.add(op.ref.path);
            });
            touched.forEach(notify);
        },
    };
    return batch;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

const readSession = () => readJson(CURRENT_USER_KEY, null);

export const auth: any = {
    get currentUser() {
        const u = readSession();
        return u ? { uid: u.id, email: u.username, emailVerified: true } : null;
    },
};

const authListeners: ((user: any) => void)[] = [];
const broadcastAuth = () => authListeners.forEach(cb => cb(auth.currentUser));

export const onAuthStateChanged = (_authInstance: any, callback: (user: any) => void) => {
    authListeners.push(callback);
    callback(auth.currentUser);
    return () => {
        const i = authListeners.indexOf(callback);
        if (i >= 0) authListeners.splice(i, 1);
    };
};

/**
 * Mirrors the `reportFailedLogin` Cloud Function: every rejected sign-in is
 * written to `login_attempts` with the same shape the Security log renders
 * (IP, geo lookup, user agent, attempts in the current window).
 */
const recordFailedLogin = (email: string, errorCode: string) => {
    const recentWindow = readCollection('login_attempts')
        .filter((a: any) => Date.now() - new Date(a.timestamp).getTime() < 15 * 60 * 1000).length;
    writeAdd('login_attempts', {
        timestamp: new Date().toISOString(),
        email,
        errorCode,
        ip: `188.254.${10 + Math.floor(Math.random() * 200)}.${1 + Math.floor(Math.random() * 250)}`,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'demo',
        city: 'Плевен',
        region: 'Плевен',
        country: 'България',
        countryCode: 'BG',
        isp: 'Демо мрежа',
        timezone: 'Europe/Sofia',
        attemptInWindow: recentWindow + 1,
    });
    notify('login_attempts');
};

/**
 * Demo sign-in. Accounts and their passwords are listed in `demo/seed.ts`;
 * a failed attempt is recorded in `login_attempts` so the Security log in the
 * system panel shows real activity.
 */
export const signInWithEmailAndPassword = async (_authInstance: any, email: string, password: string) => {
    const users = readCollection('users');
    const matched = users.find((u: any) => (u.username || '').toLowerCase() === email.toLowerCase());
    const expected = SEED_AUTH_USERS[email.toLowerCase()]
        ?? (matched ? String(matched.username).split('@')[0] : undefined);

    if (matched && password === expected) {
        writeJson(CURRENT_USER_KEY, matched);
        writeUpdate('users', matched.id, { lastSeen: new Date().toISOString() });
        notify('users');
        broadcastAuth();
        return { user: auth.currentUser };
    }

    recordFailedLogin(email, matched ? 'auth/wrong-password' : 'auth/user-not-found');

    const err: any = new Error('Грешно потребителско име или парола.');
    err.code = 'auth/invalid-credential';
    throw err;
};

export const signOut = async (_authInstance: any) => {
    localStorage.removeItem(CURRENT_USER_KEY);
    broadcastAuth();
};

export const createUserWithEmailAndPassword = async (_authInstance: any, email: string, _password: string) => {
    const id = 'u-' + generateId().toLowerCase().slice(0, 8);
    writeAdd('users', { username: email, role: 'moderator', createdAt: new Date().toISOString() }, id);
    notify('users');
    return { user: { uid: id, email } };
};

// ─────────────────────────────────────────────────────────────────────────────
// Callable Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

export const getFunctions = (_app?: any) => ({ __demo: true });

/**
 * Stand-ins for the deployed callables. `createStaffUser` normally runs on the
 * Admin SDK (creating an auth account without signing the admin out);
 * `reportFailedLogin` writes the security-log entry server-side.
 */
export const httpsCallable = (_functions: any, name: string) => async (payload: any = {}) => {
    switch (name) {
        case 'createStaffUser': {
            const email = String(payload.email || '').toLowerCase();
            if (readCollection('users').some((u: any) => (u.username || '').toLowerCase() === email)) {
                const err: any = new Error('Вече съществува акаунт с този имейл.');
                err.code = 'already-exists';
                throw err;
            }
            const id = 'u-' + generateId().toLowerCase().slice(0, 8);
            writeAdd('users', {
                username: payload.email,
                role: payload.role || 'moderator',
                createdAt: new Date().toISOString(),
            }, id);
            notify('users');
            if (payload.password) SEED_AUTH_USERS[email] = payload.password;
            return { data: { uid: id } };
        }
        case 'deleteStaffUser': {
            writeDelete('users', payload.uid);
            notify('users');
            return { data: { ok: true } };
        }
        case 'reportFailedLogin': {
            recordFailedLogin(payload.email || '', payload.errorCode || 'auth/invalid-credential');
            return { data: { ok: true } };
        }
        default:
            console.warn(`[demo] callable "${name}" is not implemented in the demo build`);
            return { data: null };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Storage
// ─────────────────────────────────────────────────────────────────────────────

export const storage: any = { __demo: true };

export const ref = (_storage: any, path: string) => ({ type: 'storageRef', path });

/**
 * Photos are kept as data URLs in the demo instead of being uploaded. The
 * returned "download URL" is the data URL itself, so <img src> works unchanged.
 */
export const uploadString = async (storageRef: any, data: string, _format?: string) => {
    writeJson(`${PREFIX}storage:${storageRef.path}`, data);
    return { ref: storageRef };
};

export const getDownloadURL = async (storageRef: any): Promise<string> =>
    readJson(`${PREFIX}storage:${storageRef.path}`, '') || '';

// ─────────────────────────────────────────────────────────────────────────────
// Messaging / Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const analytics = null;
export const messaging = null;

export const getToken = async (_messaging?: any, _options?: any) => `demo-fcm-token-${generateId().slice(0, 12)}`;

/**
 * Production returns a Firebase Messaging instance only where the browser
 * supports it. The demo has no real push channel, so it hands back a stub —
 * the subscribe buttons still walk their full UI flow and store a token.
 */
export const getSafeMessaging = async (): Promise<any> => ({ __demo: true });

// ─────────────────────────────────────────────────────────────────────────────
// Cross-tab sync — a write in one tab refreshes listeners in the others
// ─────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (!e.key || !e.key.startsWith(PREFIX)) return;
        if (e.key === CURRENT_USER_KEY) { broadcastAuth(); return; }
        const path = e.key.slice(PREFIX.length);
        if (path.startsWith('__')) return;
        notify(path);
    });
}

/** Exposed for the demo tooling (reset button, NFC simulator). */
export const __demoInternals = {
    readCollection,
    writeCollection,
    notify,
    generateId,
    knownPaths,
};
