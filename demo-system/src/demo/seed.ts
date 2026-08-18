/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TransitFlow demo dataset.
 *
 * Everything a visitor sees in the demo comes from here. The data is generated
 * relative to *today* (so the dashboards, monthly turnover and "днес" counters
 * are always populated), and it is deliberately shaped to exercise every
 * feature of the system at least once:
 *
 *  · all six card types, incl. free Служебни карти on and off the roster
 *    (drives the service-card fraud audit)
 *  · active / expiring / expired / canceled cards
 *  · multi-direction cards, disabled-card discounts, mixed bank+cash payments
 *  · a card whose paid amount does not match the tariff (price-mismatch audit)
 *  · travel history in the `scans` sub-collection (collection-group queries →
 *    "Пътувания без платен абонамент")
 *  · inspector checks with GPS coordinates and free-form reports
 *  · clone alerts, lost-card fines, failed logins, push subscriptions
 *
 * All names, addresses and card identifiers are invented for the demo.
 */

import { ROUTE_METADATA, disabledFactor } from '../data/routeMetadata';
import { CARDS_MAPPING } from '../data/cardsMapping';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic randomness — the demo looks the same for every visitor
// ─────────────────────────────────────────────────────────────────────────────

let seed = 20260818;
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

// ─────────────────────────────────────────────────────────────────────────────
// Dates
// ─────────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM" offset by whole months from today. */
export const monthOffset = (months: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Local ISO-like timestamp offset by whole days from today. */
const at = (daysAgo: number, time = '12:00:00') => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
};

const day = (daysAgo: number) => at(daysAgo).slice(0, 10);

const clock = (h: number, m: number) => `${pad(h)}:${pad(m)}:${pad(int(0, 59))}`;

// ─────────────────────────────────────────────────────────────────────────────
// Name / place pools
// ─────────────────────────────────────────────────────────────────────────────

const MALE = ['Иван', 'Георги', 'Димитър', 'Николай', 'Петър', 'Стефан', 'Мартин', 'Христо', 'Валентин', 'Красимир', 'Ангел', 'Тодор', 'Борис', 'Веселин', 'Емил', 'Явор', 'Пламен', 'Огнян', 'Румен', 'Кирил', 'Александър', 'Владимир'];
const FEMALE = ['Мария', 'Елена', 'Ивана', 'Десислава', 'Габриела', 'Даниела', 'Виктория', 'Николета', 'Силвия', 'Теодора', 'Радка', 'Милена', 'Цветелина', 'Анелия', 'Йоана', 'Веселина', 'Симона', 'Кристина', 'Магдалена', 'Петя'];
const FAMILY = ['Иванов', 'Георгиев', 'Димитров', 'Николов', 'Петров', 'Стефанов', 'Тодоров', 'Христов', 'Ангелов', 'Василев', 'Маринов', 'Костов', 'Пенев', 'Славов', 'Русев', 'Колев', 'Динев', 'Атанасов', 'Попов', 'Владимиров'];

const nameFor = (male: boolean) => male
    ? `${pick(MALE)} ${pick(FAMILY)} ${pick(FAMILY)}`
    : `${pick(FEMALE)} ${pick(FAMILY)}а ${pick(FAMILY)}а`;

const STREETS = ['ул. Иван Вазов', 'ул. Христо Ботев', 'ул. България', 'ул. Дунав', 'ул. Кирил и Методий', 'ул. Плевен', 'ул. Асен I', 'ул. Мир', 'ул. Възраждане', 'ул. Тракия', 'ул. Осъм', 'ул. Георги Кочев'];

/**
 * Routes a subscription card can actually be sold on. Some lines in
 * ROUTE_METADATA are single-ticket only ("priceCard": "-"), so issuing a card
 * on them would show a 0 € subscription — real, but noise in a demo.
 */
const PRICED_ROUTES = Object.keys(ROUTE_METADATA).filter(r => {
    const p = ROUTE_METADATA[r].priceCard;
    return !!p && p !== '-' && p !== '---';
});

const PLACE_OF = (route: string) => route.split(/\s*-\s*/)[0].trim();

const addressFor = (route: string) => `${PLACE_OF(route)}, ${pick(STREETS)} ${int(1, 60)}`;

const PHOTOS = [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=160',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&q=80&w=160',
];

const SCHOOLS_DEMO = ['МГ ГЕО МИЛЕВ', 'ДФСГ', 'СУ „ИВ. ВАЗОВ“', 'ПГ ТУРИЗЪМ', 'СУ „ХРИСТО БОТЕВ“ Д. ДЪБНИК', 'СУ „ЕВЛОГИ ГЕОРГИЕВ“ ТРЪСТЕНИК', 'МЕД. УНИВЕРСИТЕТ'];

// ─────────────────────────────────────────────────────────────────────────────
// Pricing helpers (mirror the AdminPanel tariff logic)
// ─────────────────────────────────────────────────────────────────────────────

const tariff = (route: string, cardType: string): number => {
    if (cardType === 'Служебна карта') return 0;
    const meta = ROUTE_METADATA[route];
    if (!meta) return 0;
    let priceStr = meta.priceCard;
    let factor = 1;
    if (cardType === 'Пенсионерска карта') factor = 0.5;
    else if (cardType === 'Инвалидна карта') factor = disabledFactor(route);
    else if (cardType === 'Ученическа карта') {
        if (meta.priceCardStudent) priceStr = meta.priceCardStudent;
        else factor = 0.5;
    }
    if (!priceStr || priceStr === '-' || priceStr === '---') return 0;
    const n = parseFloat(priceStr.replace(' €', ''));
    return isNaN(n) ? 0 : Number((n * factor).toFixed(2));
};

const CARD_CODES = Object.keys(CARDS_MAPPING);
let cardCursor = 0;
/** Hand out a printed card code + its card number, in order. */
const nextCard = () => {
    const code = CARD_CODES[cardCursor % CARD_CODES.length];
    cardCursor += 1;
    return { id: code, cardNumber: CARDS_MAPPING[code] };
};

const uidFor = (n: number) => `04${n.toString(16).toUpperCase().padStart(6, '0')}A${(n % 16).toString(16).toUpperCase()}`;

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

/** email -> password. Shown on the login screen and the demo hub. */
export const SEED_AUTH_USERS: Record<string, string> = {
    'admin@transitflow.bg': 'admin',
    'staff@transitflow.bg': 'staff',
    'driver@transitflow.bg': 'driver',
    'inspector@transitflow.bg': 'inspector',
    'inspector2@transitflow.bg': 'inspector2',
};

const USERS = [
    { id: 'u-admin', username: 'admin@transitflow.bg', role: 'admin', createdAt: at(400, '09:00:00'), lastSeen: at(0, '08:12:00') },
    { id: 'u-staff', username: 'staff@transitflow.bg', role: 'moderator', createdAt: at(320, '09:00:00'), lastSeen: at(0, '06:40:00') },
    { id: 'u-driver', username: 'driver@transitflow.bg', role: 'moderator', createdAt: at(210, '09:00:00'), lastSeen: at(1, '19:05:00') },
    { id: 'u-insp1', username: 'inspector@transitflow.bg', role: 'inspector', createdAt: at(180, '09:00:00'), lastSeen: at(0, '10:20:00') },
    { id: 'u-insp2', username: 'inspector2@transitflow.bg', role: 'inspector', createdAt: at(95, '09:00:00'), lastSeen: at(2, '16:45:00') },
];

const INSPECTORS = [
    { id: 'u-insp1', name: 'inspector@transitflow.bg' },
    { id: 'u-insp2', name: 'inspector2@transitflow.bg' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────

interface SeedClient {
    id: string;
    [k: string]: any;
}

const clients: SeedClient[] = [];
const scansByClient: Record<string, any[]> = {};

/**
 * When a subscription for month `offset` was actually paid for. Past months are
 * paid around the start of that month; months paid in advance were bought at
 * some point over the last few weeks — never "today", so the dashboard's daily
 * turnover stays a believable slice of the monthly figure.
 */
const paymentDate = (offset: number) => {
    if (offset > 0) return at(int(2, 26), clock(int(8, 17), int(0, 59)));
    const now = new Date();
    const paidOn = new Date(now.getFullYear(), now.getMonth() + offset, 1 + int(0, 4));
    const daysAgo = Math.round((now.getTime() - paidOn.getTime()) / 86400000);
    return at(Math.max(daysAgo, 0), clock(int(8, 17), int(0, 59)));
};

/** Build a renewal history ending in `lastMonth`, `count` months long. */
const renewals = (route: string, cardType: string, lastMonthOffset: number, count: number, opts: { method?: string; amount?: number } = {}) => {
    const out: any[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const offset = lastMonthOffset - i;
        const method = opts.method || pick(['В брой', 'В брой', 'В брой', 'С карта', 'Банка']);
        const amount = opts.amount ?? tariff(route, cardType);
        const entry: any = {
            month: monthOffset(offset),
            amount,
            date: paymentDate(offset),
            route,
            paymentMethod: method,
        };
        if (method === 'Смесено') {
            entry.bankAmount = Number((amount * 0.6).toFixed(2));
            entry.cashAmount = Number((amount - entry.bankAmount).toFixed(2));
        }
        out.push(entry);
    }
    return out;
};

/** Travel history in the `scans` sub-collection (morning + afternoon trips). */
const buildScans = (clientId: string, route: string, days: number, perDay = 2) => {
    const list: any[] = [];
    for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const weekday = date.getDay();
        if (weekday === 0 || weekday === 6) continue; // no school/work trips at weekends
        for (let t = 0; t < perDay; t++) {
            const hour = t === 0 ? int(6, 8) : int(15, 18);
            list.push({
                id: `scan-${clientId}-${d}-${t}`,
                at: at(d, clock(hour, int(0, 59))),
                route,
                scannedBy: 'moderator',
                scannedByName: 'driver@transitflow.bg',
                role: 'moderator',
            });
        }
    }
    scansByClient[clientId] = list;
};

const addClient = (spec: {
    name: string;
    route: string;
    routes?: string[];
    cardType: string;
    expiryOffset: number | null;
    monthsPaid?: number;
    photoIndex?: number | null;
    school?: string;
    municipality?: string;
    address?: string;
    serviceReason?: string;
    isCanceled?: boolean;
    cancelReason?: string;
    amountOverride?: number;
    paymentMethod?: string;
    scanDays?: number;
    createdDaysAgo?: number;
    nfcUid?: string;
}) => {
    const card = nextCard();
    const amount = spec.amountOverride ?? tariff(spec.route, spec.cardType);
    // A card paid up to a future month must also have the months in between
    // covered, otherwise the panel would show it unpaid for the current month.
    const monthsPaid = Math.max(spec.monthsPaid ?? 3, (spec.expiryOffset ?? 0) + 1);
    const history = spec.expiryOffset === null
        ? []
        : renewals(spec.route, spec.cardType, spec.expiryOffset, monthsPaid, { method: spec.paymentMethod, amount: spec.amountOverride });

    const client: SeedClient = {
        id: card.id,
        cardNumber: card.cardNumber,
        rfid: String(int(10000000, 99999999)),
        nfcUid: spec.nfcUid ?? uidFor(clients.length + 1),
        name: spec.name,
        route: spec.routes ? spec.routes.join(', ') : spec.route,
        ...(spec.routes ? { routes: spec.routes } : {}),
        cardType: spec.cardType,
        amountPaid: amount,
        expiryDate: spec.expiryOffset === null ? '' : monthOffset(spec.expiryOffset),
        // Cards without a photo omit the field entirely (rather than storing an
        // empty string), so the panels render their placeholder instead of an
        // <img src="">.
        ...(spec.photoIndex === null ? {} : { photo: PHOTOS[(spec.photoIndex ?? clients.length) % PHOTOS.length] }),
        createdAt: at(spec.createdDaysAgo ?? int(30, 400), clock(int(8, 17), int(0, 59))),
        address: spec.address ?? addressFor(spec.route),
        renewalHistory: history,
        scanCount: 0,
        lastScanAt: '',
        ...(spec.school ? { school: spec.school } : {}),
        ...(spec.municipality ? { municipality: spec.municipality } : {}),
        ...(spec.serviceReason ? { serviceReason: spec.serviceReason } : {}),
        ...(spec.isCanceled ? { isCanceled: true, cancelReason: spec.cancelReason || 'Анулирана' } : {}),
        history: [{
            date: at(spec.createdDaysAgo ?? 120, '10:00:00'),
            action: 'Издаване на карта',
            details: `Регистрирана карта ${card.cardNumber} за маршрут „${spec.route}“`,
            amount,
            performedBy: 'admin@transitflow.bg',
        }],
    };

    if (spec.scanDays) {
        buildScans(client.id, spec.route, spec.scanDays);
        const list = scansByClient[client.id];
        client.scanCount = list.length;
        client.lastScanAt = list[0]?.at || '';
        client.lastScanDate = (list[0]?.at || '').slice(0, 10);
        client.dailyScanCount = list.filter(s => s.at.startsWith(day(0))).length;
    }

    clients.push(client);
    return client;
};

// ── Featured cards — one per interesting state ──────────────────────────────

addClient({ name: 'Иван Георгиев Димитров', route: 'Тръстеник', cardType: 'Ученическа карта', expiryOffset: 1, monthsPaid: 5, school: 'СУ „ЕВЛОГИ ГЕОРГИЕВ“ ТРЪСТЕНИК', municipality: 'Долна Митрополия', scanDays: 21, createdDaysAgo: 240, photoIndex: 0 });
addClient({ name: 'Мария Иванова Николова', route: 'Долни Дъбник', cardType: 'Нормална карта', expiryOffset: 2, monthsPaid: 4, scanDays: 14, createdDaysAgo: 190, photoIndex: 1 });
addClient({ name: 'Георги Тодоров Петров', route: 'Биволаре', cardType: 'Пенсионерска карта', expiryOffset: -1, monthsPaid: 6, scanDays: 9, createdDaysAgo: 380, photoIndex: 2 });
addClient({ name: 'Стефан Василев Иванов', route: 'Горна Митрополия', cardType: 'Нормална карта', expiryOffset: 0, monthsPaid: 2, isCanceled: true, cancelReason: 'Загубена карта — профилът е прехвърлен на нов носител', createdDaysAgo: 150, photoIndex: 3 });
addClient({ name: 'Елена Петрова Колева', route: 'Ясен', cardType: 'Ученическа карта', expiryOffset: 3, monthsPaid: 6, school: 'МГ ГЕО МИЛЕВ', municipality: 'Плевен', scanDays: 25, createdDaysAgo: 300, photoIndex: 4 });
addClient({ name: 'Димитър Христов Стоянов', route: 'Садовец', cardType: 'Нормална карта', expiryOffset: 1, monthsPaid: 1, photoIndex: null, createdDaysAgo: 3 });
addClient({ name: 'Петър Василев Стоянов', route: 'Крушовица', cardType: 'Ученическа карта', expiryOffset: 2, monthsPaid: 4, school: 'ДФСГ', municipality: 'Плевен', scanDays: 18, createdDaysAgo: 260, photoIndex: 5 });
addClient({ name: 'Йордан Атанасов Попов', route: 'Славовица', cardType: 'Пенсионерска карта', expiryOffset: 2, monthsPaid: 8, scanDays: 6, createdDaysAgo: 420, photoIndex: 6 });

// Disabled card — 20 % / 25 % discount depending on the contract route
addClient({ name: 'Веселин Маринов Колев', route: 'Опанец', cardType: 'Инвалидна карта', expiryOffset: 1, monthsPaid: 4, municipality: 'Долна Митрополия', scanDays: 11, createdDaysAgo: 210, photoIndex: 7 });

// Teacher card
addClient({ name: 'Даниела Стефанова Русева', route: 'Тръстеник', cardType: 'Учителска карта', expiryOffset: 2, monthsPaid: 5, school: 'СУ „ЕВЛОГИ ГЕОРГИЕВ“ ТРЪСТЕНИК', municipality: 'Долна Митрополия', scanDays: 16, createdDaysAgo: 280, photoIndex: 8 });

// Mixed bank + cash payment
addClient({ name: 'Красимир Пенев Динев', route: 'Долна Митрополия', cardType: 'Нормална карта', expiryOffset: 1, monthsPaid: 3, paymentMethod: 'Смесено', scanDays: 12, createdDaysAgo: 130, photoIndex: 9 });

// Multi-direction card
addClient({ name: 'Николета Иванова Тодорова', route: 'Ясен', routes: ['Ясен', 'Долни Дъбник'], cardType: 'Нормална карта', expiryOffset: 2, monthsPaid: 3, scanDays: 10, createdDaysAgo: 160, photoIndex: 1 });

// Price mismatch — paid less than the tariff (shows up in the finance audit)
addClient({ name: 'Огнян Костов Атанасов', route: 'Гиген', cardType: 'Нормална карта', expiryOffset: 1, monthsPaid: 2, amountOverride: 35, scanDays: 8, createdDaysAgo: 100, photoIndex: 2 });

// Service (free) cards — the first is on the roster, the second deliberately is not
addClient({ name: 'Кирил Христов Христов', route: 'Брегаре', cardType: 'Служебна карта', expiryOffset: 6, monthsPaid: 1, municipality: 'Долна Митрополия', serviceReason: 'Служител на Община Долна Митрополия — безплатен превоз 2026', scanDays: 14, createdDaysAgo: 220, photoIndex: 3 });
addClient({ name: 'Тодор Славов Владимиров', route: 'Тръстеник', cardType: 'Служебна карта', expiryOffset: 6, monthsPaid: 1, municipality: 'Долна Митрополия', serviceReason: 'Заявена служебна карта — очаква проверка в списъка', scanDays: 7, createdDaysAgo: 60, photoIndex: 4 });

// Traveling without a paid subscription — expired card that is still being scanned
const unpaidRider = addClient({ name: 'Мартин Ангелов Колев', route: 'Пордим', cardType: 'Нормална карта', expiryOffset: -2, monthsPaid: 3, scanDays: 20, createdDaysAgo: 320, photoIndex: 5 });

// Never activated — issued but never paid for
addClient({ name: 'Симона Русева Динева', route: 'Гривица', cardType: 'Нормална карта', expiryOffset: null, photoIndex: null, createdDaysAgo: 8 });

// ── Bulk population ─────────────────────────────────────────────────────────

const CARD_MIX: { type: string; weight: number }[] = [
    { type: 'Нормална карта', weight: 40 },
    { type: 'Ученическа карта', weight: 30 },
    { type: 'Пенсионерска карта', weight: 15 },
    { type: 'Учителска карта', weight: 6 },
    { type: 'Инвалидна карта', weight: 5 },
    { type: 'Служебна карта', weight: 4 },
];
const CARD_POOL = CARD_MIX.flatMap(m => Array(m.weight).fill(m.type)) as string[];

for (let i = 0; i < 64; i++) {
    const route = pick(PRICED_ROUTES);
    const cardType = pick(CARD_POOL);
    const male = rnd() < 0.5;
    // A realistic spread: mostly active, some expiring, a few already expired.
    const roll = rnd();
    const expiryOffset = roll < 0.62 ? int(1, 3) : roll < 0.8 ? 0 : int(-4, -1);
    addClient({
        name: nameFor(male),
        route,
        cardType,
        expiryOffset,
        monthsPaid: int(1, 7),
        school: cardType === 'Ученическа карта' ? pick(SCHOOLS_DEMO) : undefined,
        municipality: ['Ученическа карта', 'Пенсионерска карта', 'Учителска карта', 'Инвалидна карта'].includes(cardType)
            ? pick(['Плевен', 'Плевен', 'Долна Митрополия', 'Долни Дъбник', 'Пордим'])
            : undefined,
        serviceReason: cardType === 'Служебна карта' ? 'Служител — безплатен превоз по общински договор' : undefined,
        scanDays: rnd() < 0.75 ? int(3, 18) : 0,
        photoIndex: rnd() < 0.8 ? int(0, PHOTOS.length - 1) : null,
        createdDaysAgo: int(20, 500),
    });
}

// ── Today's counter activity ────────────────────────────────────────────────
// A day at the desk: a few subscriptions renewed and two cards issued today, so
// the "оборот за деня" / "нови регистрации" tiles are never empty on arrival.

const todaysDesk = clients.filter(c => !c.isCanceled && (c.renewalHistory?.length || 0) > 0).slice(3, 12);
todaysDesk.forEach((c, i) => {
    const history = c.renewalHistory as any[];
    const last = history[history.length - 1];
    last.date = at(0, clock(9 + (i % 8), int(0, 59)));
    last.paymentMethod = i % 4 === 0 ? 'С карта' : i % 5 === 0 ? 'Банка' : 'В брой';
    c.history = [...(c.history || []), {
        date: last.date,
        action: 'Подновяване на карта',
        details: `Абонамент за ${last.month} (${last.paymentMethod})`,
        amount: last.amount,
        performedBy: i % 2 === 0 ? 'admin@transitflow.bg' : 'staff@transitflow.bg',
    }];
});

clients.filter(c => !c.isCanceled).slice(20, 22).forEach((c, i) => {
    c.createdAt = at(0, clock(10 + i * 3, int(0, 59)));
});

// ─────────────────────────────────────────────────────────────────────────────
// NFC UID → card lookup (used when an unknown physical card is tapped)
// ─────────────────────────────────────────────────────────────────────────────

const nfcUids = clients.slice(0, 30).map(c => ({ id: c.nfcUid, clientId: c.id }));

// ─────────────────────────────────────────────────────────────────────────────
// Inspector checks — GPS points around Pleven & the served villages
// ─────────────────────────────────────────────────────────────────────────────

const CHECKPOINTS: { name: string; lat: number; lng: number }[] = [
    { name: 'Автогара Плевен, бул. Данаил Попов', lat: 43.4170, lng: 24.6180 },
    { name: 'с. Опанец, центъра', lat: 43.4720, lng: 24.5460 },
    { name: 'гр. Долна Митрополия, пл. Труд', lat: 43.4650, lng: 24.5230 },
    { name: 'с. Тръстеник, ул. Г. Димитров', lat: 43.5170, lng: 24.4530 },
    { name: 'гр. Долни Дъбник, ул. Христо Янчев', lat: 43.3960, lng: 24.4290 },
    { name: 'с. Ясен, спирка Център', lat: 43.4030, lng: 24.5170 },
    { name: 'с. Биволаре, ул. Първи май', lat: 43.5010, lng: 24.4110 },
    { name: 'с. Горна Митрополия, ул. Дунав', lat: 43.4900, lng: 24.4750 },
    { name: 'гр. Пордим, пл. Иван Божинов', lat: 43.3780, lng: 24.8480 },
    { name: 'с. Крушовица, спирка Читалище', lat: 43.3480, lng: 24.3610 },
];

const inspectorScans: any[] = [];
const withSubscription = clients.filter(c => c.expiryDate && !c.isCanceled);

for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0) continue; // no Sunday checks
    const checksToday = d === 0 ? int(6, 11) : int(0, 7);
    for (let k = 0; k < checksToday; k++) {
        const inspector = pick(INSPECTORS);
        const client = pick(withSubscription);
        const spot = pick(CHECKPOINTS);
        const hour = int(7, 18);
        const minute = int(10, 59);
        const scanAt = at(d, clock(hour, minute));
        // ~78 % of checked passengers had actually validated on boarding, always
        // shortly (5–55 min) before the check so it counts inside the 1 h window.
        const validated = rnd() < 0.78;
        const boardingAt = new Date(scanAt);
        boardingAt.setMinutes(boardingAt.getMinutes() - int(5, 55));
        const boardingScanAt = validated
            ? `${boardingAt.getFullYear()}-${pad(boardingAt.getMonth() + 1)}-${pad(boardingAt.getDate())}T${pad(boardingAt.getHours())}:${pad(boardingAt.getMinutes())}:00`
            : null;
        inspectorScans.push({
            id: `insp-${d}-${k}`,
            inspectorId: inspector.id,
            inspectorName: inspector.name,
            clientId: client.id,
            clientName: client.name,
            clientCard: client.cardNumber,
            route: client.route,
            at: scanAt,
            boardingScanAt,
            lat: Number((spot.lat + (rnd() - 0.5) * 0.004).toFixed(6)),
            lng: Number((spot.lng + (rnd() - 0.5) * 0.004).toFixed(6)),
            accuracy: int(4, 25),
            address: spot.name,
            locationError: false,
        });
    }
}

const inspectorReports: any[] = [
    {
        id: 'rep-1',
        inspectorId: 'u-insp1', inspectorName: 'inspector@transitflow.bg',
        at: at(0, '09:40:00'),
        description: 'Извършена планова проверка на курс Плевен – Тръстеник. Всички пътници представиха валидни карти или билети. Водачът спазва разписанието.',
        checkedName: 'Курс 07:30 Плевен – Тръстеник',
        clientCount: 24, driverName: 'driver@transitflow.bg', busInfo: 'PL 4821 BX (Setra S 415)',
        destination: 'Тръстеник', hasProblem: false,
    },
    {
        id: 'rep-2',
        inspectorId: 'u-insp1', inspectorName: 'inspector@transitflow.bg',
        at: at(1, '16:20:00'),
        description: 'Проверка на курс Плевен – Долни Дъбник. Двама пътници без заверена карта при качване — съставени констативни протоколи.',
        checkedName: 'Курс 15:45 Плевен – Долни Дъбник',
        clientCount: 31, driverName: 'staff@transitflow.bg', busInfo: 'PL 7734 AM (Mercedes Tourismo)',
        destination: 'Долни Дъбник', hasProblem: true,
        problemDescription: 'Двама пътници пътуваха с изтекъл абонамент. Картите са отбелязани в системата, наложени са глоби по тарифа.',
    },
    {
        id: 'rep-3',
        inspectorId: 'u-insp2', inspectorName: 'inspector2@transitflow.bg',
        at: at(2, '11:05:00'),
        description: 'Контрол на спирка Опанец. Проверени 18 карти, без нередности. Валидаторът в автобуса работи нормално.',
        checkedName: 'Спирков контрол — Опанец',
        clientCount: 18, driverName: 'driver@transitflow.bg', busInfo: 'PL 5560 CH (Isuzu Novociti)',
        destination: 'Долна Митрополия', hasProblem: false,
    },
    {
        id: 'rep-4',
        inspectorId: 'u-insp2', inspectorName: 'inspector2@transitflow.bg',
        at: at(5, '08:15:00'),
        description: 'Сигнал за дублирана карта — при сканиране системата отчете различен физически UID. Картата е задържана и предадена на администрацията.',
        checkedName: 'Курс 07:00 Плевен – Гиген',
        clientCount: 27, driverName: 'staff@transitflow.bg', busInfo: 'PL 1290 KP (Setra S 315)',
        destination: 'Гиген', hasProblem: true,
        problemDescription: 'Засечено копие на карта. Сигналът е записан в модул „Сигнали за дублирани карти“.',
    },
    {
        id: 'rep-5',
        inspectorId: 'u-insp1', inspectorName: 'inspector@transitflow.bg',
        at: at(9, '17:50:00'),
        description: 'Вечерен курс към Садовец. Проверени 12 пътници. Един пътник с ученическа карта без придружаващ документ — предупреден.',
        checkedName: 'Курс 17:15 Плевен – Садовец',
        clientCount: 12, driverName: 'driver@transitflow.bg', busInfo: 'PL 4821 BX (Setra S 415)',
        destination: 'Садовец', hasProblem: false,
    },
    {
        id: 'rep-6',
        inspectorId: 'u-insp2', inspectorName: 'inspector2@transitflow.bg',
        at: at(14, '13:30:00'),
        description: 'Съвместна проверка с представител на Община Долна Митрополия за служебните карти. Всички представени карти отговарят на списъка на правоимащите лица.',
        checkedName: 'Тематична проверка — служебни карти',
        clientCount: 9, driverName: 'staff@transitflow.bg', busInfo: 'PL 5560 CH (Isuzu Novociti)',
        destination: 'Долна Митрополия', hasProblem: false,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Signals, rentals, notifications
// ─────────────────────────────────────────────────────────────────────────────

const signals = [
    { id: 'sig-1', type: 'complaint', name: 'Васил Кирилов', phone: '0878123456', email: 'vasil.kirilov@example.bg', message: 'Автобусът по линия Плевен – Тръстеник в 17:30 закъсня с 15 минути. Моля да обърнете внимание на спазването на графиците.', timestamp: at(0, '08:10:00'), status: 'new' },
    { id: 'sig-2', type: 'complaint', name: 'Румяна Иванова', phone: '0888445566', email: 'r.ivanova@example.bg', message: 'Валидаторът в автобус PL 7734 AM не прочете картата ми три пъти подред. Наложи се да платя билет.', timestamp: at(0, '12:35:00'), status: 'new' },
    { id: 'sig-3', type: 'suggestion', name: 'Гергана Цветкова', phone: '0899887766', email: 'g.cvetkova@example.bg', message: 'Моля да добавите допълнителен курс в събота сутрин за линия Плевен – Долни Дъбник заради пазара.', timestamp: at(4, '10:30:00'), status: 'resolved' },
    { id: 'sig-4', type: 'complaint', name: 'Ангел Димитров', phone: '0887332211', email: 'angel.d@example.bg', message: 'Шофьорът на курс 14:00 за Гиген беше груб при проверката на картата.', timestamp: at(2, '15:20:00'), status: 'read' },
    { id: 'sig-5', type: 'suggestion', name: 'Николай Петков', phone: '0876554433', email: 'n.petkov@example.bg', message: 'Ще е полезно, ако в приложението се показва на живо къде се намира автобусът.', timestamp: at(7, '19:02:00'), status: 'read' },
    { id: 'sig-6', type: 'complaint', name: 'Дора Маринова', phone: '0895112233', email: 'd.marinova@example.bg', message: 'Спирката в с. Ясен няма табела с разписание. Моля да се постави.', timestamp: at(11, '09:44:00'), status: 'resolved' },
];

const rentals = [
    { id: 'rent-1', name: 'Димитър Ангелов', phone: '0878556677', date: day(-10), passengers: '45', destination: 'Плевен – Рилски манастир – Плевен', timestamp: at(0, '11:00:00'), status: 'new', message: 'Еднодневна екскурзия за пенсионерски клуб. Нужен е автобус с климатик.' },
    { id: 'rent-2', name: 'Силвия Петрова', phone: '0899121212', date: day(-15), passengers: '20', destination: 'Плевен – София (Летище)', timestamp: at(1, '15:45:00'), status: 'contacted', message: 'Трансфер до летището, ранен час — 04:30.' },
    { id: 'rent-3', name: 'СУ „Иван Вазов“ – Плевен', phone: '064 800 121', date: day(-25), passengers: '52', destination: 'Плевен – Велико Търново – Арбанаси', timestamp: at(3, '09:10:00'), status: 'new', message: 'Ученическа екскурзия, необходими са 2 автобуса.' },
    { id: 'rent-4', name: 'Ивайло Тодоров', phone: '0887009988', date: day(5), passengers: '50', destination: 'Плевен – Велико Търново – Плевен', timestamp: at(20, '09:30:00'), status: 'completed', message: 'Фирмено събитие.' },
    { id: 'rent-5', name: 'Мартина Колева', phone: '0894332211', date: day(-3), passengers: '30', destination: 'Плевен – Хисаря', timestamp: at(6, '13:20:00'), status: 'contacted', message: 'Сватбено тържество, връщане в 23:00.' },
    { id: 'rent-6', name: 'ФК Спартак Плевен', phone: '0888774411', date: day(12), passengers: '28', destination: 'Плевен – Ловеч (стадион)', timestamp: at(30, '17:05:00'), status: 'completed', message: 'Транспорт на отбора за гостуване.' },
];

const notifications = [
    { id: 'notif-1', courseId: 'all', title: 'Планов ремонт в гр. Долни Дъбник', body: 'Поради ремонт на пътната настилка автобусите по линия Плевен – Долни Дъбник ще се движат по обходен маршрут с около 5 минути закъснение.', timestamp: at(2, '08:00:00'), sentStatus: 'sent', subscriberCount: 128 },
    { id: 'notif-2', courseId: 'Тръстеник', title: 'Допълнителен извънреден курс', body: 'За линия Тръстеник се пуска допълнителен курс всеки петък от 19:30 ч. от Автогара Плевен.', timestamp: at(5, '16:22:00'), sentStatus: 'sent', subscriberCount: 46 },
    { id: 'notif-3', courseId: 'all', title: 'Нови цени на абонаментните карти', body: 'От началото на следващия месец влизат в сила актуализираните тарифи. Проверете цената за вашата линия в раздел „Разписания“.', timestamp: at(9, '10:15:00'), sentStatus: 'sent', subscriberCount: 121 },
    { id: 'notif-4', courseId: 'Садовец', title: 'Промяна в часа на вечерния курс', body: 'Вечерният курс за Садовец се измества от 17:15 на 17:30 ч.', timestamp: at(14, '12:40:00'), sentStatus: 'sent', subscriberCount: 33 },
    { id: 'notif-5', courseId: 'all', title: 'Празнично разписание', body: 'На официалните празници автобусите се движат по неделно разписание.', timestamp: at(21, '09:00:00'), sentStatus: 'sent', subscriberCount: 117 },
];

const pushSubscriptions = Array.from({ length: 132 }, (_, i) => ({
    id: `sub-${i + 1}`,
    token: `demo-fcm-${(i + 1).toString().padStart(4, '0')}`,
    courseId: i % 4 === 0 ? 'all' : pick(PRICED_ROUTES),
    createdAt: at(int(1, 180), clock(int(7, 21), int(0, 59))),
    platform: pick(['android', 'ios', 'web']),
}));

const adminPushTokens = [
    { id: 'apt-1', token: 'demo-admin-token-001', role: 'admin', device: 'myPOS Smart N5', createdAt: at(45, '09:12:00'), unpaidAlerts: true },
    { id: 'apt-2', token: 'demo-admin-token-002', role: 'moderator', device: 'Samsung Galaxy A54', createdAt: at(12, '07:35:00'), unpaidAlerts: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Security: clone alerts, failed logins, fines
// ─────────────────────────────────────────────────────────────────────────────

const cloneAlerts = [
    { id: 'clone-1', timestamp: at(0, '07:52:00'), clientId: clients[2].id, clientName: clients[2].name, route: clients[2].route, registeredUid: clients[2].nfcUid, scannedUid: '04FF19C2B1', resolved: false },
    { id: 'clone-2', timestamp: at(5, '08:07:00'), clientId: clients[6].id, clientName: clients[6].name, route: clients[6].route, registeredUid: clients[6].nfcUid, scannedUid: '0471AE3390', resolved: false },
    { id: 'clone-3', timestamp: at(18, '17:31:00'), clientId: clients[10].id, clientName: clients[10].name, route: clients[10].route, registeredUid: clients[10].nfcUid, scannedUid: '04C0512D7E', resolved: true },
];

const loginAttempts = [
    { id: 'la-1', timestamp: at(0, '03:14:22'), email: 'admin@transitflow.bg', errorCode: 'auth/wrong-password', ip: '45.144.227.19', ua: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/121.0', city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', countryCode: 'NL', isp: 'M247 Europe SRL', timezone: 'Europe/Amsterdam', attemptInWindow: 7 },
    { id: 'la-2', timestamp: at(0, '03:14:05'), email: 'admin@transitflow.bg', errorCode: 'auth/wrong-password', ip: '45.144.227.19', ua: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/121.0', city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', countryCode: 'NL', isp: 'M247 Europe SRL', timezone: 'Europe/Amsterdam', attemptInWindow: 6 },
    { id: 'la-3', timestamp: at(1, '22:41:10'), email: 'administrator@transitflow.bg', errorCode: 'auth/user-not-found', ip: '103.87.12.204', ua: 'python-requests/2.31.0', city: 'Singapore', region: '', country: 'Singapore', countryCode: 'SG', isp: 'DigitalOcean', timezone: 'Asia/Singapore', attemptInWindow: 3 },
    { id: 'la-4', timestamp: at(2, '11:02:48'), email: 'staff@transitflow.bg', errorCode: 'auth/wrong-password', ip: '188.254.31.77', ua: 'Mozilla/5.0 (Android 14; Mobile) Chrome/120.0', city: 'Плевен', region: 'Плевен', country: 'България', countryCode: 'BG', isp: 'Vivacom', timezone: 'Europe/Sofia', attemptInWindow: 1 },
    { id: 'la-5', timestamp: at(4, '01:55:03'), email: 'root@transitflow.bg', errorCode: 'auth/user-not-found', ip: '91.240.118.36', ua: 'curl/8.4.0', city: 'Kyiv', region: '', country: 'Ukraine', countryCode: 'UA', isp: 'Hostpro', timezone: 'Europe/Kyiv', attemptInWindow: 12 },
    { id: 'la-6', timestamp: at(6, '19:20:41'), email: 'inspector@transitflow.bg', errorCode: 'auth/wrong-password', ip: '78.90.14.203', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Safari/17.4', city: 'Плевен', region: 'Плевен', country: 'България', countryCode: 'BG', isp: 'A1 Bulgaria', timezone: 'Europe/Sofia', attemptInWindow: 2 },
    { id: 'la-7', timestamp: at(9, '04:31:12'), email: 'admin@example-transit.com', errorCode: 'auth/user-not-found', ip: '194.26.29.118', ua: 'Go-http-client/2.0', city: 'Frankfurt', region: 'Hesse', country: 'Germany', countryCode: 'DE', isp: 'Aeza International', timezone: 'Europe/Berlin', attemptInWindow: 21 },
    { id: 'la-8', timestamp: at(13, '13:07:55'), email: 'driver@transitflow.bg', errorCode: 'auth/wrong-password', ip: '188.254.90.11', ua: 'Mozilla/5.0 (Android 13; Mobile) Chrome/119.0', city: 'Долна Митрополия', region: 'Плевен', country: 'България', countryCode: 'BG', isp: 'Vivacom', timezone: 'Europe/Sofia', attemptInWindow: 1 },
];

const fines = [
    { id: 'fine-1', clientId: clients[4].id, oldCardId: clients[3].id, clientName: clients[3].name, amount: 5, reason: 'Загубена карта', month: monthOffset(0), date: at(3, '10:22:00'), performedBy: 'admin@transitflow.bg', paymentMethod: 'В брой' },
    { id: 'fine-2', clientId: clients[9].id, oldCardId: clients[12].id, clientName: clients[9].name, amount: 5, reason: 'Загубена карта', month: monthOffset(0), date: at(12, '14:05:00'), performedBy: 'staff@transitflow.bg', paymentMethod: 'В брой' },
    { id: 'fine-3', clientId: clients[15].id, oldCardId: clients[16].id, clientName: clients[15].name, amount: 5, reason: 'Загубена карта', month: monthOffset(-1), date: at(38, '09:48:00'), performedBy: 'admin@transitflow.bg', paymentMethod: 'В брой' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Activity log — built from the data above so the audit trail is consistent
// ─────────────────────────────────────────────────────────────────────────────

const activityLogs: any[] = [
    { id: 'log-1', timestamp: at(0, '18:45:12'), performedBy: 'driver@transitflow.bg', action: 'Валидиране на карта', targetName: clients[0].name, details: `Успешна NFC заверка на карта ${clients[0].cardNumber} за курс „${clients[0].route}“`, amount: 0 },
    { id: 'log-2', timestamp: at(0, '15:20:10'), performedBy: 'admin@transitflow.bg', action: 'Анулиране на карта', targetName: clients[3].name, details: `Карта ${clients[3].cardNumber} е маркирана като анулирана. Причина: загубена карта.`, amount: 0 },
    { id: 'log-3', timestamp: at(0, '10:12:44'), performedBy: 'admin@transitflow.bg', action: 'Загубена карта (прехвърляне)', targetName: clients[3].name, details: `Профилът е прехвърлен на карта ${clients[4].cardNumber}; наложена глоба 5 €`, amount: 5 },
    { id: 'log-4', timestamp: at(1, '10:30:00'), performedBy: 'admin@transitflow.bg', action: 'Издаване на нова карта', targetName: clients[5].name, details: `Регистрирана нова NFC карта ${clients[5].cardNumber} за маршрут „${clients[5].route}“`, amount: clients[5].amountPaid },
    { id: 'log-5', timestamp: at(2, '08:15:00'), performedBy: 'admin@transitflow.bg', action: 'Изпращане на уведомление', targetName: 'Всички линии', details: 'Изпратено push уведомление: „Планов ремонт в гр. Долни Дъбник“', amount: 0 },
    { id: 'log-6', timestamp: at(3, '17:10:00'), performedBy: 'staff@transitflow.bg', action: 'Подновяване на карта', targetName: clients[1].name, details: `Подновяване за месец ${monthOffset(2)}`, amount: clients[1].amountPaid },
    { id: 'log-7', timestamp: at(5, '08:07:30'), performedBy: 'Система', action: 'Сигнал за дублирана карта', targetName: clients[6].name, details: 'Засечено несъответствие на физически UID при сканиране', amount: 0 },
    { id: 'log-8', timestamp: at(6, '11:41:00'), performedBy: 'admin@transitflow.bg', action: 'Промяна на потребител', targetName: 'inspector2@transitflow.bg', details: 'Създаден акаунт с роля „Контрольор“', amount: 0 },
    { id: 'log-9', timestamp: at(8, '09:02:00'), performedBy: 'admin@transitflow.bg', action: 'Групово подновяване', targetName: '18 карти', details: `Групово подновяване за месец ${monthOffset(1)}`, amount: 940 },
    { id: 'log-10', timestamp: at(15, '16:30:00'), performedBy: 'staff@transitflow.bg', action: 'Обработка на сигнал', targetName: 'Гергана Цветкова', details: 'Сигналът е маркиран като разрешен', amount: 0 },
];

// A few renewal entries per client also become audit-log rows, so the log has
// realistic volume for paging in the system panel.
clients.slice(0, 40).forEach((c, i) => {
    (c.renewalHistory || []).slice(-2).forEach((r: any, j: number) => {
        activityLogs.push({
            id: `log-auto-${i}-${j}`,
            timestamp: r.date,
            performedBy: pick(['admin@transitflow.bg', 'staff@transitflow.bg']),
            action: 'Подновяване на карта',
            targetName: c.name,
            details: `Абонамент за ${r.month} по линия „${r.route}“ (${r.paymentMethod})`,
            amount: r.amount,
        });
    });
});

activityLogs.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

// ─────────────────────────────────────────────────────────────────────────────
// Export — path → documents
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_COLLECTIONS: Record<string, any[]> = {
    users: USERS,
    clients,
    signals,
    rentals,
    push_notifications: notifications,
    push_subscriptions: pushSubscriptions,
    admin_push_tokens: adminPushTokens,
    activity_logs: activityLogs,
    inspector_scans: inspectorScans,
    inspector_reports: inspectorReports,
    clone_alerts: cloneAlerts,
    login_attempts: loginAttempts,
    fines,
    nfc_uids: nfcUids,
    admin_actions: [{ id: 'current', action: 'idle', updatedAt: at(0, '08:00:00') }],
    // Sub-collections: clients/<id>/scans
    ...Object.fromEntries(Object.entries(scansByClient).map(([clientId, list]) => [`clients/${clientId}/scans`, list])),
};

/** The card ids the demo hub links to directly. */
export const DEMO_CARD_IDS = {
    active: clients[0].id,
    expired: clients[2].id,
    canceled: clients[3].id,
    unpaidRider: unpaidRider.id,
    serviceCard: clients[14].id,
};
