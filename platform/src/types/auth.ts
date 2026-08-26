export type UserRole = 'admin' | 'moderator' | 'inspector';

export interface AppUser {
    id: string;
    username: string;
    /**
     * The person behind the login.
     *
     * A username is an address, not a name — several people at one company can
     * share a mailbox and still need separate logins, so they end up as
     * `cvetina.monika@transitflow.bg`. Greeting somebody by that, or listing a
     * shift by it, says nothing about who they are. Optional, because every
     * account issued before this has none and the login stands in.
     */
    displayName?: string;
    passwordHash: string; // simple hash for demo
    role: UserRole;
    createdAt: string;
    lastSeen?: string; // ISO timestamp of the user's last app load / login
}

type Named = { displayName?: string; username?: string } | null | undefined;

/** What to call this person on screen: their name, or the login without its domain. */
export const personName = (user: Named): string =>
    user?.displayName?.trim() || (user?.username || '').split('@')[0];

/** What a greeting uses — the first name on its own. */
export const firstName = (user: Named): string =>
    personName(user).split(/[\s.]+/)[0];
