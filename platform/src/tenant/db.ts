/**
 * Tenant-scoped Firestore.
 *
 * Every company's data lives under `tenants/{tenantId}/…`. Rather than making
 * ~94 call sites remember to add that prefix, the pages import `collection`,
 * `doc` and friends from here instead of from `firebase/firestore`. The prefix
 * is applied in one place, so a query cannot accidentally reach another
 * company's data by omission — the mistake would have to be deliberate.
 *
 * Everything the app does not need to scope (query builders, field modifiers,
 * transactions) is re-exported unchanged, so this module is a drop-in swap for
 * the `firebase/firestore` import.
 */

import {
    collection as fsCollection,
    collectionGroup as fsCollectionGroup,
    doc as fsDoc,
    addDoc as fsAddDoc,
    setDoc as fsSetDoc,
    query as fsQuery,
    where as fsWhere,
    type CollectionReference,
    type DocumentReference,
    type DocumentData,
    type Firestore,
    type Query,
    type SetOptions,
} from 'firebase/firestore';

// Re-exported untouched — these carry no path and need no scoping.
export {
    getDoc,
    getDocs,
    onSnapshot,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    increment,
    arrayUnion,
    arrayRemove,
    deleteField,
    serverTimestamp,
    writeBatch,
    runTransaction,
    documentId,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    average,
    count,
    Timestamp,
} from 'firebase/firestore';

export const TENANT_ROOT = 'tenants';

/**
 * The field every document carries so that collection-group queries (which
 * always span the whole database, whatever the path) can be constrained to one
 * company — and so the security rules can reject anything that isn't.
 */
export const TENANT_FIELD = 'tenant';

let activeTenant: string | null = null;

/**
 * Set from the `tenant` claim on the signed-in user's token, or — on the public
 * card page, which is reached by scanning a card — from the tenant segment of
 * the URL. Setting it grants nothing on its own: what a caller may actually
 * read or write is decided by the security rules, which compare the path
 * against the claim on the token.
 */
export const setActiveTenant = (tenantId: string | null) => {
    activeTenant = tenantId || null;
};

export const getActiveTenant = () => activeTenant;

/**
 * Fail loudly rather than silently querying an unscoped path. A missing tenant
 * means the app tried to read data before the token's claims resolved, which is
 * a bug worth surfacing in development instead of a confusing empty result.
 */
const requireTenant = (): string => {
    if (activeTenant) return activeTenant;

    // A card's address carries its company, so when a query beats the code
    // that sets it — React runs a child's effects before its parent's — the
    // address is a reliable second source rather than a reason to fail. It
    // grants nothing: the rules still decide what may be read.
    const fromUrl = typeof window !== 'undefined'
        ? window.location.hash.match(/#\/t\/([^/]+)\//)
        : null;
    if (fromUrl) {
        activeTenant = fromUrl[1];
        return activeTenant;
    }

    throw new Error(
        '[tenant] No active company. A query ran before the company was known.'
    );
};

/** True when the value is the Firestore instance rather than a reference. */
const isFirestore = (value: unknown): value is Firestore =>
    !!value && typeof value === 'object' && !('path' in (value as object)) && !('id' in (value as object));

// ─────────────────────────────────────────────────────────────────────────────
// Scoped path builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `collection(db, 'clients')`            → tenants/{t}/clients
 * `collection(db, 'clients', id, 'scans')` → tenants/{t}/clients/{id}/scans
 * `collection(someDocRef, 'scans')`      → left alone; the parent is already scoped
 */
export function collection(
    parent: Firestore | DocumentReference<DocumentData>,
    ...segments: string[]
): CollectionReference<DocumentData> {
    if (!isFirestore(parent)) {
        return fsCollection(parent as DocumentReference<DocumentData>, ...(segments as [string, ...string[]]));
    }
    const [first, ...rest] = segments;
    return fsCollection(parent as Firestore, TENANT_ROOT, requireTenant(), first, ...rest);
}

/**
 * `doc(db, 'clients', id)` → tenants/{t}/clients/{id}
 * `doc(colRef)` / `doc(colRef, id)` → left alone; the collection is already scoped
 */
export function doc(
    parent: Firestore | CollectionReference<DocumentData>,
    ...segments: string[]
): DocumentReference<DocumentData> {
    if (!isFirestore(parent)) {
        return fsDoc(parent as CollectionReference<DocumentData>, ...(segments as [string, ...string[]]));
    }
    const [first, ...rest] = segments;
    return fsDoc(parent as Firestore, TENANT_ROOT, requireTenant(), first, ...rest);
}

/**
 * A collection-group query spans the entire database no matter where the
 * sub-collection sits, so scoping by path is impossible here. Instead the query
 * comes back already filtered on the tenant field, and the rules reject any
 * document whose tenant does not match the token — so a caller who bypassed
 * this helper gets "permission denied" rather than another company's rows.
 */
export function collectionGroup(dbInstance: Firestore, groupId: string): Query<DocumentData> {
    return fsQuery(
        fsCollectionGroup(dbInstance, groupId),
        fsWhere(TENANT_FIELD, '==', requireTenant())
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes — stamped with the tenant
// ─────────────────────────────────────────────────────────────────────────────

const stamp = <T extends object>(data: T) => ({ ...data, [TENANT_FIELD]: requireTenant() });

/** Adds the tenant field so collection-group reads and rules can rely on it. */
export function addDoc(reference: CollectionReference<DocumentData>, data: DocumentData) {
    return fsAddDoc(reference, stamp(data));
}

export function setDoc(
    reference: DocumentReference<DocumentData>,
    data: DocumentData,
    options?: SetOptions
) {
    return options
        ? fsSetDoc(reference, stamp(data), options)
        : fsSetDoc(reference, stamp(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-level paths (outside any company)
// ─────────────────────────────────────────────────────────────────────────────

/** The company registry: `tenants/{tenantId}` — name, logo, colours, modules. */
export const tenantDoc = (dbInstance: Firestore, tenantId: string) =>
    fsDoc(dbInstance, TENANT_ROOT, tenantId);

/** Escape hatch for genuinely global data. Use sparingly and deliberately. */
export const globalCollection = (dbInstance: Firestore, path: string, ...rest: string[]) =>
    fsCollection(dbInstance, path, ...rest);

export const globalDoc = (dbInstance: Firestore, path: string, ...rest: string[]) =>
    fsDoc(dbInstance, path, ...rest);

/**
 * Where the callable functions are deployed. Without this the SDK defaults to
 * us-central1 and the browser calls a host with nothing on it, which surfaces as
 * a CORS failure rather than anything that names the real problem.
 */
export const FUNCTIONS_REGION = 'europe-west3';
