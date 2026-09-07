/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    type User as FirebaseUser
} from 'firebase/auth';
import {
    doc,
    getDoc,
    collection,
    onSnapshot,
    updateDoc,
    deleteDoc,
    query
} from '../tenant/db';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth, db } from '../firebase';
import { FUNCTIONS_REGION } from '../tenant/db';
import { setActiveTenant } from '../tenant/db';
import type { AppUser, UserRole } from '../types/auth';

interface AuthContextType {
    currentUser: AppUser | null;
    users: AppUser[];
    loading: boolean;
    /** The company the signed-in account belongs to, from its token claim. */
    tenantId: string | null;
    /** The platform owner, who administers companies rather than belonging to one. */
    isPlatformAdmin: boolean;
    /**
     * Email of whoever is signed in, even when they have no company and no
     * platform rights yet. Without this the owner could never reach the screen
     * that grants those rights in the first place.
     */
    signedInEmail: string | null;
    /** Re-reads the token after claims change server-side (e.g. after provisioning). */
    refreshClaims: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    addUser: (email: string, password: string, role: UserRole, displayName?: string) => Promise<void>;
    updateUserRole: (userId: string, role: UserRole) => Promise<void>;
    /** Names the person behind a login. Admins only — the rules say so too. */
    updateUserName: (userId: string, displayName: string) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    /** Changes the signed-in account's own password, proving the old one first. */
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

/**
 * The last claims we managed to read, kept between runs.
 *
 * A terminal starts up wherever the bus happens to be, which is sometimes a
 * place with no signal. Its account is still on the device, but an expired token
 * can only be renewed over the network, and the read throws. Without this the
 * app would conclude the device belongs to nobody and ask the driver for an
 * enrolment code he does not have, in a bus that is about to leave.
 *
 * This is for keeping the screen right, not for granting anything. Every read
 * and write still goes to the server with the real token, and the rules decide;
 * a stale claim here opens no door.
 */
const CLAIMS_CACHE_KEY = 'tf_last_claims';

interface CachedClaims { uid: string; tenant: string | null; role?: UserRole }

const readCachedClaims = (uid: string): CachedClaims | null => {
    try {
        const raw = localStorage.getItem(CLAIMS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedClaims;
        // Only ever for the account that is actually signed in.
        return parsed?.uid === uid ? parsed : null;
    } catch { return null; }
};

const writeCachedClaims = (claims: CachedClaims) => {
    try { localStorage.setItem(CLAIMS_CACHE_KEY, JSON.stringify(claims)); } catch { /* full or blocked */ }
};

/**
 * What a terminal looks like to the rest of the app.
 *
 * There is no account behind it to describe — it signed in anonymously and was
 * handed a company by a one-time code. This is enough for the app to know what
 * it is and stop there.
 */
const deviceUser = (uid: string): AppUser => ({
    id: uid,
    username: 'terminal',
    displayName: 'Терминал',
    passwordHash: '',
    role: 'device' as UserRole,
    createdAt: '',
    lastSeen: '',
});

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
    const loadingRef = React.useRef(loading);
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        // Safety timeout: stop loading after 10 seconds even if Firebase hasn't responded
        const safetyTimeout = setTimeout(() => {
            if (loadingRef.current) {
                console.warn('Authentication check timed out. Firebase might be blocked by a proxy or network issue.');
                setLoading(false);
            }
        }, 10000);

        // 1. Listen for Auth State
        const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
            clearTimeout(safetyTimeout);
            setLoading(true);
            try {
                if (fbUser) {
                    // The company and the role live in the token's custom claims, set
                    // server-side when the account was provisioned. Reading them here
                    // means the security rules never have to look a user up, and it
                    // must happen before anything queries Firestore — every path is
                    // built from the active company.
                    setSignedInEmail(fbUser.email || null);

                    let claimedTenant: string | null = null;
                    let claimedRole: UserRole | undefined;
                    let platformAdmin = false;
                    try {
                        const token = await fbUser.getIdTokenResult();
                        claimedTenant = (token.claims.tenant as string | undefined) || null;
                        claimedRole = token.claims.role as UserRole | undefined;
                        platformAdmin = token.claims.platformAdmin === true;
                        writeCachedClaims({ uid: fbUser.uid, tenant: claimedTenant, role: claimedRole });
                    } catch (err) {
                        // Almost always no network on a cold start. The account is
                        // still here and still belongs where it did; carry on with
                        // what it was last known to be, and let the server refuse
                        // anything that is no longer true.
                        const cached = readCachedClaims(fbUser.uid);
                        if (!cached) throw err;
                        console.warn('Token unreadable; using the last known claims.', err);
                        claimedTenant = cached.tenant;
                        claimedRole = cached.role;
                    }
                    setIsPlatformAdmin(platformAdmin);

                    if (!claimedTenant) {
                        // The platform owner administers companies instead of belonging
                        // to one, so they sign in without a company claim and can only
                        // reach the platform screen.
                        setActiveTenant(null);
                        setTenantId(null);
                        setCurrentUser(platformAdmin ? {
                            id: fbUser.uid,
                            username: fbUser.email || '',
                            passwordHash: '',
                            role: 'admin' as UserRole,
                            createdAt: '',
                            lastSeen: '',
                        } : null);
                        if (!platformAdmin && !fbUser.isAnonymous) {
                            console.warn(`${fbUser.email || fbUser.uid} has no company assigned. Access denied.`);
                        }
                        // An anonymous account belongs to nobody on purpose: it is
                        // a terminal waiting for its code. Saying "access denied"
                        // about it would send somebody hunting for a fault that is
                        // not there.
                        return;
                    }

                    setActiveTenant(claimedTenant);
                    setTenantId(claimedTenant);

                    if (claimedRole === 'device') {
                        // A terminal is a device on a bus, not a member of staff.
                        // It has no profile in the staff list and never will, so
                        // the lookup below would find nothing and lock it out.
                        // Everything it is allowed to do is already on the token.
                        setCurrentUser(deviceUser(fbUser.uid));
                        return;
                    }

                    // Get user role from Firestore
                    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setCurrentUser({
                            id: fbUser.uid,
                            username: data.username || fbUser.email || '',
                            displayName: data.displayName || '',
                            passwordHash: '', // Not needed for Firebase
                            role: claimedRole || (data.role as UserRole),
                            createdAt: data.createdAt || new Date().toISOString(),
                            lastSeen: data.lastSeen || ''
                        });
                        // Best-effort "last seen" stamp on each app load / login.
                        updateDoc(doc(db, 'users', fbUser.uid), { lastSeen: new Date().toISOString() })
                            .catch(() => { /* rules or offline — ignore */ });
                    } else {
                        // User exists in Auth but not in Firestore - no default role anymore
                        // This prevents unauthorized sign-ups from gaining access
                        console.warn(`User ${fbUser.email} logged in but has no Firestore profile. Access will be restricted.`);
                        setCurrentUser(null);
                    }
                } else {
                    setActiveTenant(null);
                    setTenantId(null);
                    setIsPlatformAdmin(false);
                    setSignedInEmail(null);
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Error in onAuthStateChanged:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    // The staff list can only be read once the company is known, so it waits for
    // the claim rather than running alongside the auth listener.
    useEffect(() => {
        if (!tenantId || currentUser?.role === 'device') {
            // A terminal has no business knowing who works there, and the rules
            // agree — asking would only produce a denial in the console.
            setUsers([]);
            return;
        }
        const q = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(q, (snapshot) => {
            const userList: AppUser[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                userList.push({
                    id: docSnap.id,
                    username: data.username || '',
                    displayName: data.displayName || '',
                    passwordHash: '',
                    role: data.role as UserRole,
                    createdAt: data.createdAt || '',
                    lastSeen: data.lastSeen || ''
                });
            });
            setUsers(userList);
        }, (err) => console.error('Staff list unavailable:', err));

        return () => unsubscribeUsers();
    }, [tenantId, currentUser?.role]);

    /**
     * Custom claims are set server-side, so an existing token keeps the old ones
     * until it is refreshed. Called after provisioning to pick them up without
     * making the user sign out and back in.
     */
    const refreshClaims = async () => {
        const fbUser = auth.currentUser;
        if (!fbUser) return;
        await fbUser.getIdToken(true);
        const token = await fbUser.getIdTokenResult();
        const claimedTenant = (token.claims.tenant as string | undefined) || null;
        setIsPlatformAdmin(token.claims.platformAdmin === true);
        setActiveTenant(claimedTenant);
        setTenantId(claimedTenant);
        // A terminal reaches this line seconds after being enrolled, and may be
        // switched off a minute later. Remember what it now is before that.
        writeCachedClaims({
            uid: fbUser.uid,
            tenant: claimedTenant,
            role: token.claims.role as UserRole | undefined,
        });
        // A terminal calls this the moment it is enrolled. Its claim is new, and
        // nothing else will set it up: the auth listener already ran, back when
        // this account was anonymous and belonged to nobody.
        if (token.claims.role === 'device') setCurrentUser(deviceUser(fbUser.uid));
    };

    const login = async (email: string, password: string) => {
        const emailToLogin = email.includes('@') ? email : `${email}@transitflow.bg`;
        await signInWithEmailAndPassword(auth, emailToLogin, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const addUser = async (username: string, password: string, role: UserRole, displayName?: string) => {
        // Created via the createStaffUser Cloud Function (Admin SDK). This keeps the
        // current admin signed in (the client SDK's createUserWithEmailAndPassword
        // would switch the active session to the new user) and lets Firestore rules
        // keep `users` writes admin-only.
        const email = username.includes('@') ? username : `${username}@transitflow.bg`;
        const fns = getFunctions(app, FUNCTIONS_REGION);
        const createStaffUser = httpsCallable(fns, 'createStaffUser');
        const created = await createStaffUser({ email, password, role });

        // The name is written from here rather than passed to the function: the
        // rules already let an admin edit their own company's staff, so naming a
        // person needs no deploy of the functions. An account created before the
        // name existed is named the same way, from the staff list.
        const uid = (created.data as { uid?: string } | undefined)?.uid;
        const name = displayName?.trim();
        if (uid && name) {
            await updateDoc(doc(db, 'users', uid), { displayName: name });
        }
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        await updateDoc(doc(db, 'users', userId), { role });
    };

    const updateUserName = async (userId: string, displayName: string) => {
        await updateDoc(doc(db, 'users', userId), { displayName: displayName.trim() });
    };

    /**
     * Until now a password was whatever it was set to at creation and stayed
     * that way — there was no screen for changing one and no reset, so a
     * password handed over on paper was permanent.
     *
     * Firebase refuses to change a password on a session that has been open a
     * while, which is the same protection a password prompt gives: whoever is
     * at the keyboard has to know the current one, not merely find the laptop
     * unlocked. So the old password is asked for and used to sign in again
     * first, rather than being worked around.
     */
    const changePassword = async (currentPassword: string, newPassword: string) => {
        const fbUser = auth.currentUser;
        if (!fbUser?.email) throw new Error('Няма влязъл потребител.');
        await reauthenticateWithCredential(
            fbUser,
            EmailAuthProvider.credential(fbUser.email, currentPassword)
        );
        await updatePassword(fbUser, newPassword);
    };

    const deleteUser = async (userId: string) => {
        // We can't easily delete from Auth without Admin SDK, but we can remove from Firestore database
        await deleteDoc(doc(db, 'users', userId));
    };

    return (
        <AuthContext.Provider value={{ currentUser, users, loading, tenantId, isPlatformAdmin, signedInEmail, refreshClaims, login, logout, addUser, updateUserRole, updateUserName, deleteUser, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

