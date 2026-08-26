import { useEffect, useState } from 'react';
import { doc, getActiveTenant, onSnapshot, tenantDoc, getDoc } from './db';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Who the company is, on paper.
 *
 * The registers and financial reports that come out of this system are handed
 * to municipalities and kept for audit, and until now they went out under the
 * TransitFlow logo — the supplier's mark on the operator's own document. What
 * belongs at the top of those pages is the operator: their logo, or failing
 * that their name, and the identifiers that make the sheet a document rather
 * than a printout.
 *
 * Kept apart from `settings/general` (which is what the company *sells*)
 * because this is what the company *is*.
 */

export interface CompanyProfile {
    /** Download URL of the uploaded logo. Empty means print the name instead. */
    logoUrl: string;
    /** The legal name as it should read on a document: ЦВЕТИНА - МЕЗДРА ЕООД. */
    name: string;
    eik: string;
    /** With the BG prefix, as it is quoted. Empty when not VAT-registered. */
    vatNumber: string;
    /** Registered seat, on one line. */
    address: string;
    /** Who represents the company — the manager named in the register. */
    manager: string;
    phone: string;
    email: string;
}

export const EMPTY_COMPANY: CompanyProfile = {
    logoUrl: '', name: '', eik: '', vatNumber: '',
    address: '', manager: '', phone: '', email: '',
};

const read = (data: Record<string, unknown> | undefined): CompanyProfile => ({
    logoUrl: String(data?.logoUrl || ''),
    name: String(data?.name || ''),
    eik: String(data?.eik || ''),
    vatNumber: String(data?.vatNumber || ''),
    address: String(data?.address || ''),
    manager: String(data?.manager || ''),
    phone: String(data?.phone || ''),
    email: String(data?.email || ''),
});

/**
 * The company's own details, live, with the registry name standing in until the
 * admin has filled the form. A company that has entered nothing still prints
 * under its own name rather than the supplier's.
 */
export const useCompanyProfile = (): CompanyProfile & { loading: boolean } => {
    const { tenantId } = useAuth();
    const tenant = tenantId || getActiveTenant();
    const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY);
    const [registryName, setRegistryName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenant) { setProfile(EMPTY_COMPANY); setLoading(false); return; }
        const unsub = onSnapshot(
            doc(db, 'settings', 'company'),
            snap => { setProfile(read(snap.exists() ? snap.data() : undefined)); setLoading(false); },
            () => setLoading(false)
        );
        return () => unsub();
    }, [tenant]);

    useEffect(() => {
        if (!tenant) { setRegistryName(''); return; }
        getDoc(tenantDoc(db, tenant))
            .then(snap => setRegistryName(String(snap.data()?.name || '')))
            .catch(() => { /* the profile's own name covers it */ });
    }, [tenant]);

    return { ...profile, name: profile.name || registryName, loading };
};

/**
 * The identification line printed under the title: ЕИК, VAT number, seat.
 * Whatever the company has not filled in is simply left out, so a half-filled
 * profile still prints a clean line instead of empty labels.
 */
export const requisitesLine = (profile: CompanyProfile): string =>
    [
        profile.eik && `ЕИК ${profile.eik}`,
        profile.vatNumber && `ДДС № ${profile.vatNumber}`,
        profile.address,
    ].filter(Boolean).join(' · ');
