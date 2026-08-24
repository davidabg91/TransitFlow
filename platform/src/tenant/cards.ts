import { useEffect, useState } from 'react';
import { collection, doc, getActiveTenant, getDoc, getDocs, limit, orderBy, query, where } from './db';
import { db } from '../firebase';

/**
 * Finding a card from whatever somebody has in front of them.
 *
 * Staff read the number printed on the card; a scanner delivers the code or the
 * whole URL; at the counter people ask for a passenger by name. All three lead
 * to the same place, so they are resolved here rather than at each call site.
 *
 * Cards are looked up in the company's own stock, which is what makes a code
 * valid — not its shape. A code the system never issued matches nothing.
 */

export interface FoundCard {
    code: string;
    cardNumber: string;
    status?: string;
}

export interface FoundClient {
    id: string;
    name: string;
    cardNumber?: string;
    route?: string;
}

/** Pull the code out of a pasted card URL, or take the input as the code. */
export const normalizeCardInput = (raw: string): string => {
    const trimmed = (raw || '').trim();
    const fromUrl = trimmed.match(/\/client\/([^/?#\s]+)/i);
    return (fromUrl ? fromUrl[1] : trimmed).toUpperCase();
};

const isNumeric = (s: string) => /^\d+$/.test(s.replace(/\s/g, ''));

/** The stored form of a card number: ten digits, zero padded. */
export const padCardNumber = (digits: string) => digits.replace(/\D/g, '').padStart(10, '0');

/** Look a card up by its code or by the number printed on it. */
export const findCard = async (input: string): Promise<FoundCard | null> => {
    const candidate = normalizeCardInput(input);
    if (!candidate) return null;

    if (!isNumeric(candidate)) {
        const snap = await getDoc(doc(db, 'card_stock', candidate));
        if (snap.exists()) {
            const d = snap.data() || {};
            return { code: snap.id, cardNumber: String(d.cardNumber || ''), status: d.status };
        }
        return null;
    }

    const byNumber = await getDocs(query(
        collection(db, 'card_stock'),
        where('cardNumber', '==', padCardNumber(candidate)),
        limit(1)
    ));
    if (byNumber.empty) return null;
    const d = byNumber.docs[0].data();
    return { code: byNumber.docs[0].id, cardNumber: String(d.cardNumber || ''), status: d.status };
};

/**
 * Passengers whose name starts with what was typed.
 *
 * A prefix range rather than a full scan, so the cost is the handful of rows
 * shown instead of every card in the company. Firestore compares strings by
 * their bytes, so the first letter is capitalised to match how names are stored
 * — typing "иван" finds "Иван Георгиев".
 */
export const findClientsByName = async (term: string, max = 8): Promise<FoundClient[]> => {
    const raw = (term || '').trim();
    if (raw.length < 2) return [];

    const variants = Array.from(new Set([
        raw,
        raw.charAt(0).toUpperCase() + raw.slice(1),
        raw.toUpperCase(),
    ]));

    const seen = new Map<string, FoundClient>();
    for (const prefix of variants) {
        const snap = await getDocs(query(
            collection(db, 'clients'),
            orderBy('name'),
            where('name', '>=', prefix),
            where('name', '<=', prefix + ''),
            limit(max)
        ));
        snap.docs.forEach(d => {
            if (seen.size >= max || seen.has(d.id)) return;
            const data = d.data() || {};
            seen.set(d.id, {
                id: d.id,
                name: String(data.name || ''),
                cardNumber: String(data.cardNumber || ''),
                route: String(data.route || ''),
            });
        });
        if (seen.size >= max) break;
    }
    return [...seen.values()];
};

/**
 * Resolves a card as it is typed, for the field that links a card to a new
 * passenger. Debounced, because the number is entered digit by digit and each
 * keystroke would otherwise be a query.
 */
export const useCardResolver = (input: string) => {
    const [card, setCard] = useState<FoundCard | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const candidate = normalizeCardInput(input);
        if (!candidate) { setCard(null); setChecking(false); return; }

        setChecking(true);
        let cancelled = false;
        const timer = setTimeout(() => {
            findCard(candidate)
                .then(found => { if (!cancelled) { setCard(found); setChecking(false); } })
                .catch(() => { if (!cancelled) { setCard(null); setChecking(false); } });
        }, 300);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [input]);

    return { card, checking };
};

/**
 * Where a card's profile lives, for links inside the app.
 *
 * The company belongs in the address because that is the form written onto the
 * cards; keeping the in-app links the same shape means one route to reason
 * about instead of two that drift apart.
 */
export const cardProfileHref = (code: string): string => {
    const tenant = getActiveTenant();
    return tenant ? `#/t/${tenant}/client/${code}` : `#/client/${code}`;
};
