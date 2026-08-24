// Authorised-employee rosters — the official lists of people entitled to a free
// service card, used by the admin panel to flag service cards issued to someone
// who is not on any list.
//
// These are per-company data: each operator uploads the list agreed with its
// municipality. The platform therefore ships none, and the audit reports
// "no roster" rather than accusing every card until one is configured.

export interface ServiceRosterEntry {
    no: number;
    name: string;      // Име Презиме Фамилия, as in the official list
    position: string;  // длъжност
    direction: string; // направление
    section?: string;  // отдел/структура
}

export interface ServiceRoster {
    id: string;
    municipality: string;
    title: string;
    year: number;
    entries: ServiceRosterEntry[];
}

export const SERVICE_ROSTERS: ServiceRoster[] = [];
