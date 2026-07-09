// We mock the Firebase App structure
const app = {};
export default app;

export interface MockSnapshot {
    id: string;
    exists(): boolean;
    data(): any;
    empty: boolean;
    docs: MockSnapshot[];
    size: number;
    forEach(callback: (doc: MockSnapshot) => void): void;
}

export type User = any;

export const getToken = async (_messaging?: any, _options?: any) => {
    return 'mock-fcm-token-12345';
};

// --- Mock Database Core & Initial Data ---
const STORAGE_KEYS = {
    USERS: 'transitflow_demo_users',
    CLIENTS: 'transitflow_demo_clients',
    SIGNALS: 'transitflow_demo_signals',
    RENTALS: 'transitflow_demo_rentals',
    NOTIFICATIONS: 'transitflow_demo_notifications',
    SUBSCRIPTIONS: 'transitflow_demo_subscriptions',
    LOGS: 'transitflow_demo_logs',
    CURRENT_USER: 'transitflow_demo_current_user'
};

// Simple helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

// Helper to format date relative to today (e.g. YYYY-MM)
const getRelativeMonth = (offsetMonths: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

const getRelativeDateString = (offsetDays: number, timeStr = "12:00:00") => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const datePart = d.toISOString().split('T')[0];
    return `${datePart}T${timeStr}`;
};

// Initial Seed Datasets
const INITIAL_USERS = [
    { id: 'u-admin', username: 'admin@transitflow.bg', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'u-staff', username: 'staff@transitflow.bg', role: 'moderator', createdAt: new Date().toISOString() },
    { id: 'u-driver', username: 'driver@transitflow.bg', role: 'moderator', createdAt: new Date().toISOString() }
];

const INITIAL_CLIENTS = [
    {
        id: 'TF-89A2C',
        rfid: '12498203',
        name: 'Иван Георгиев Димитров',
        route: 'Тръстеник',
        cardType: 'Студентска карта',
        amountPaid: 20,
        expiryDate: getRelativeMonth(1), // Active
        photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-45, "10:30:15"),
        scanCount: 48,
        lastScanAt: getRelativeDateString(0, "18:45:12"),
        school: 'МГ ГЕО МИЛЕВ',
        address: 'гр. Тръстеник, ул. Иван Вазов 12',
        scanHistory: [
            getRelativeDateString(0, "18:45:12"),
            getRelativeDateString(0, "07:32:10"),
            getRelativeDateString(-1, "18:30:44"),
            getRelativeDateString(-1, "07:29:15"),
            getRelativeDateString(-2, "17:15:00")
        ]
    },
    {
        id: 'TF-45B9X',
        rfid: '83920184',
        name: 'Мария Иванова Николова',
        route: 'Долни Дъбник',
        cardType: 'Нормална карта',
        amountPaid: 40,
        expiryDate: getRelativeMonth(2), // Active
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-30, "09:15:00"),
        scanCount: 22,
        lastScanAt: getRelativeDateString(-1, "08:12:45"),
        address: 'гр. Долни Дъбник, ул. България 45',
        scanHistory: [
            getRelativeDateString(-1, "08:12:45"),
            getRelativeDateString(-3, "17:05:10"),
            getRelativeDateString(-4, "08:00:22")
        ]
    },
    {
        id: 'TF-12K3R',
        rfid: '92048572',
        name: 'Георги Тодоров Петров',
        route: 'Биволаре',
        cardType: 'Пенсионерска карта',
        amountPaid: 10,
        expiryDate: getRelativeMonth(-1), // Expired
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-120, "14:20:00"),
        scanCount: 114,
        lastScanAt: getRelativeDateString(-3, "10:14:02"),
        address: 'с. Биволаре, ул. Христо Ботев 4',
        scanHistory: [
            getRelativeDateString(-3, "10:14:02"),
            getRelativeDateString(-4, "15:22:11"),
            getRelativeDateString(-6, "09:30:15")
        ]
    },
    {
        id: 'TF-67V2P',
        rfid: '30491823',
        name: 'Стефан Василев Иванов',
        route: 'Горна Митрополия',
        cardType: 'Нормална карта',
        amountPaid: 40,
        expiryDate: getRelativeMonth(1),
        isCanceled: true,
        cancelReason: 'Загубена карта - преиздадена на нов носител',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-60, "11:45:00"),
        scanCount: 12,
        lastScanAt: getRelativeDateString(-25, "16:20:00"),
        address: 'гр. Долна Митрополия, ул. Дунав 8',
        scanHistory: [
            getRelativeDateString(-25, "16:20:00")
        ]
    },
    {
        id: 'TF-38D5S',
        rfid: '50293841',
        name: 'Елена Петрова Колева',
        route: 'Ясен',
        cardType: 'Ученическа карта',
        amountPaid: 20,
        expiryDate: getRelativeMonth(3), // Active
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-15, "08:30:00"),
        scanCount: 31,
        lastScanAt: getRelativeDateString(0, "14:15:30"),
        school: 'МГ ГЕО МИЛЕВ',
        address: 'с. Ясен, ул. Кирил и Методий 5',
        scanHistory: [
            getRelativeDateString(0, "14:15:30"),
            getRelativeDateString(0, "07:45:10"),
            getRelativeDateString(-1, "14:10:22"),
            getRelativeDateString(-1, "07:44:00")
        ]
    },
    {
        id: 'TF-99P4A',
        rfid: '49204859',
        name: 'Димитър Христов Стоянов',
        route: 'Садовец',
        cardType: 'Нормална карта',
        amountPaid: 40,
        expiryDate: getRelativeMonth(1),
        photo: '', // No photo
        createdAt: getRelativeDateString(-2, "16:10:00"),
        scanCount: 0,
        lastScanAt: '',
        address: 'с. Садовец, ул. Плевен 17'
    },
    {
        id: 'TF-22Y8Q',
        rfid: '20938402',
        name: 'Петър Василев Стоянов',
        route: 'Крушовица',
        cardType: 'Ученическа карта',
        amountPaid: 20,
        expiryDate: getRelativeMonth(2),
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-80, "10:15:00"),
        scanCount: 88,
        lastScanAt: getRelativeDateString(0, "14:22:10"),
        school: 'ДФСГ',
        address: 'с. Крушовица, ул. Асен I 23',
        scanHistory: [
            getRelativeDateString(0, "14:22:10"),
            getRelativeDateString(-1, "14:25:00")
        ]
    },
    {
        id: 'TF-77L1M',
        rfid: '88203940',
        name: 'Йордан Атанасов Попов',
        route: 'Славовица',
        cardType: 'Пенсионерска карта',
        amountPaid: 10,
        expiryDate: getRelativeMonth(2),
        photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120',
        createdAt: getRelativeDateString(-150, "09:00:00"),
        scanCount: 164,
        lastScanAt: getRelativeDateString(-2, "11:15:44"),
        address: 'с. Славовица, ул. Мир 3'
    }
];

const INITIAL_SIGNALS = [
    {
        id: 'sig-1',
        type: 'complaint',
        name: 'Васил Кирилов',
        phone: '0878123456',
        email: 'vasil@kirilov.net',
        message: 'Автобусът по линия Плевен-Тръстеник в 17:30 закъсня с 15 минути на дата 08.07. Моля да обърнете внимание на спазването на графиците.',
        timestamp: getRelativeDateString(-1, "18:10:00"),
        status: 'new'
    },
    {
        id: 'sig-2',
        type: 'suggestion',
        name: 'Гергана Цветкова',
        phone: '0899887766',
        email: 'geri_cvetkova@abv.bg',
        message: 'Моля да добавите допълнителен курс в събота сутрин за линия Плевен-Долни Дъбник, тъй като тогава има много хора за пазара.',
        timestamp: getRelativeDateString(-4, "10:30:00"),
        status: 'resolved'
    },
    {
        id: 'sig-3',
        type: 'complaint',
        name: 'Ангел Димитров',
        phone: '0887332211',
        email: 'angel.d@gmail.com',
        message: 'Шофьорът на курс в 14:00 за Гиген беше изключително груб при проверка на картата. Твърдеше, че картата ми не се чете, въпреки че накрая светна в зелено.',
        timestamp: getRelativeDateString(-2, "15:20:00"),
        status: 'read'
    }
];

const INITIAL_RENTALS = [
    {
        id: 'rent-1',
        name: 'Димитър Ангелов',
        phone: '0878556677',
        date: getRelativeDateString(10).split('T')[0],
        passengers: '45',
        destination: 'Плевен - Рилски манастир - Плевен',
        timestamp: getRelativeDateString(-1, "12:00:00"),
        status: 'new'
    },
    {
        id: 'rent-2',
        name: 'Силвия Петрова',
        phone: '0899121212',
        date: getRelativeDateString(15).split('T')[0],
        passengers: '20',
        destination: 'Плевен - София (Летище)',
        timestamp: getRelativeDateString(-3, "15:45:00"),
        status: 'contacted'
    },
    {
        id: 'rent-3',
        name: 'Ивайло Тодоров',
        phone: '0887009988',
        date: getRelativeDateString(-5).split('T')[0],
        passengers: '50',
        destination: 'Плевен - Велико Търново - Плевен',
        timestamp: getRelativeDateString(-15, "09:30:00"),
        status: 'completed'
    }
];

const INITIAL_NOTIFICATIONS = [
    {
        id: 'notif-1',
        courseId: 'all',
        title: 'Планов ремонт в гр. Долни Дъбник',
        body: 'Поради ремонти на пътната настилка, автобусите по линия Плевен - Долни Дъбник ще се движат по обходен маршрут с 5 минути закъснение.',
        timestamp: getRelativeDateString(-2, "08:00:00"),
        sentStatus: 'sent',
        subscriberCount: 28
    },
    {
        id: 'notif-2',
        courseId: 'Тръстеник',
        title: 'Допълнителен извънреден курс',
        body: 'За линия Тръстеник се пуска допълнителен курс в петък от 19:30 часа от автогара Плевен.',
        timestamp: getRelativeDateString(-5, "16:22:00"),
        sentStatus: 'sent',
        subscriberCount: 14
    }
];

const INITIAL_LOGS = [
    {
        id: 'log-1',
        timestamp: getRelativeDateString(0, "18:45:12"),
        performedBy: 'Шофьор (staff@transitflow.bg)',
        action: 'Валидиране на карта',
        targetName: 'Иван Георгиев Димитров',
        details: 'Успешна NFC заверка на карта TF-89A2C за курс "Тръстеник"',
        amount: 0
    },
    {
        id: 'log-2',
        timestamp: getRelativeDateString(0, "15:20:10"),
        performedBy: 'Администратор (admin@transitflow.bg)',
        action: 'Преиздаване на карта',
        targetName: 'Стефан Василев Иванов',
        details: 'Маркиране на карта TF-67V2P като анулирана. Причина: Загубена карта.',
        amount: 0
    },
    {
        id: 'log-3',
        timestamp: getRelativeDateString(-1, "10:30:00"),
        performedBy: 'Администратор (admin@transitflow.bg)',
        action: 'Издаване на нова карта',
        targetName: 'Димитър Христов Стоянов',
        details: 'Регистрирана нова NFC карта TF-99P4A за маршрут "Садовец". Такса: 40 лв.',
        amount: 40
    },
    {
        id: 'log-4',
        timestamp: getRelativeDateString(-2, "08:15:00"),
        performedBy: 'Администратор (admin@transitflow.bg)',
        action: 'Изпращане на уведомление',
        targetName: 'Всички линии',
        details: 'Изпратено пуш уведомление: "Планов ремонт в гр. Долни Дъбник"',
        amount: 0
    },
    {
        id: 'log-5',
        timestamp: getRelativeDateString(-3, "17:10:00"),
        performedBy: 'Администратор (admin@transitflow.bg)',
        action: 'Подновяване на карта',
        targetName: 'Мария Иванова Николова',
        details: 'Подновяване за месец ' + getRelativeMonth(2) + '. Такса: 40 лв.',
        amount: 40
    }
];

// Initialize Storage Functions
const getStorageItem = (key: string, defaultValue: any) => {
    const val = localStorage.getItem(key);
    if (!val) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
    }
    try {
        return JSON.parse(val);
    } catch {
        return defaultValue;
    }
};

const setStorageItem = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Global initializer
export const initializeMockDatabase = (force = false) => {
    if (force) {
        localStorage.removeItem(STORAGE_KEYS.USERS);
        localStorage.removeItem(STORAGE_KEYS.CLIENTS);
        localStorage.removeItem(STORAGE_KEYS.SIGNALS);
        localStorage.removeItem(STORAGE_KEYS.RENTALS);
        localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
        localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTIONS);
        localStorage.removeItem(STORAGE_KEYS.LOGS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    getStorageItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    getStorageItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    getStorageItem(STORAGE_KEYS.SIGNALS, INITIAL_SIGNALS);
    getStorageItem(STORAGE_KEYS.RENTALS, INITIAL_RENTALS);
    getStorageItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    getStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, []);
    getStorageItem(STORAGE_KEYS.LOGS, INITIAL_LOGS);
};

// Auto-run initial seed
initializeMockDatabase(false);

// --- Reactive Snapshots & Callbacks ---
type ListenerCallback = (snapshot: MockSnapshot) => void;
const listeners: Record<string, { query: any; callback: ListenerCallback }[]> = {};

const registerListener = (collectionName: string, queryObj: any, callback: ListenerCallback) => {
    if (!listeners[collectionName]) {
        listeners[collectionName] = [];
    }
    listeners[collectionName].push({ query: queryObj, callback });
    // Trigger immediately
    triggerListeners(collectionName);
};

const unregisterListener = (collectionName: string, callback: ListenerCallback) => {
    if (listeners[collectionName]) {
        listeners[collectionName] = listeners[collectionName].filter(l => l.callback !== callback);
    }
};

const triggerListeners = (collectionName: string) => {
    if (!listeners[collectionName]) return;
    
    // Fetch current data
    const storageKey = getStorageKeyForCollection(collectionName);
    const data = getStorageItem(storageKey, []);
    
    listeners[collectionName].forEach(listener => {
        const queryRef = listener.query;
        
        if (queryRef && queryRef.type === 'doc') {
            // Document listener (e.g. doc(db, 'clients', id))
            const item = data.find((x: any) => x.id === queryRef.id);
            const docSnapshot = {
                id: queryRef.id,
                exists: () => !!item,
                data: () => item,
                empty: !item,
                docs: [],
                size: item ? 1 : 0,
                forEach: (cb: any) => { if (item) cb({ id: queryRef.id, exists: () => true, data: () => item }); }
            };
            listener.callback(docSnapshot as any);
        } else {
            // Collection / Query listener
            const docs = data.map((item: any) => ({
                id: item.id || '',
                data: () => item,
                exists: () => true,
                empty: false,
                docs: [],
                size: 0,
                forEach: () => {}
            }));
            
            const querySnapshot = {
                id: '',
                exists: () => false,
                data: () => null,
                empty: docs.length === 0,
                docs: docs as any[],
                forEach: (cb: (doc: any) => void) => docs.forEach(cb),
                size: docs.length
            };
            
            listener.callback(querySnapshot as any);
        }
    });
};

const getStorageKeyForCollection = (colName: string): string => {
    switch (colName) {
        case 'users': return STORAGE_KEYS.USERS;
        case 'clients': return STORAGE_KEYS.CLIENTS;
        case 'signals': return STORAGE_KEYS.SIGNALS;
        case 'rentals': return STORAGE_KEYS.RENTALS;
        case 'push_notifications': return STORAGE_KEYS.NOTIFICATIONS;
        case 'push_subscriptions': return STORAGE_KEYS.SUBSCRIPTIONS;
        case 'activity_logs': return STORAGE_KEYS.LOGS;
        default: return `transitflow_col_${colName}`;
    }
};

// --- Firestore Mock Functions ---
export const db: any = {};

export const collection = (_dbInstance: any, path: string) => {
    return { type: 'collection', path };
};

export const doc = (parent: any, childIdOrPath?: string, childId?: string) => {
    let path = '';
    let id = '';
    
    if (parent.type === 'collection') {
        path = parent.path;
        id = childIdOrPath || '';
    } else {
        // format is doc(db, 'collectionName', 'id')
        path = childIdOrPath || '';
        id = childId || '';
    }
    
    return { type: 'doc', path, id };
};

export const query = (colRef: any, ...constraints: any[]) => {
    return { ...colRef, constraints };
};

// Operators
export const where = (field: string, op: string, val: any) => ({ type: 'where', field, op, val });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (num: number) => ({ type: 'limit', val: num });

// Firestore mutations
export const addDoc = async (colRef: any, data: any) => {
    const key = getStorageKeyForCollection(colRef.path);
    const list = getStorageItem(key, []);
    const newId = generateId();
    const newItem = { id: newId, ...data };
    
    list.push(newItem);
    setStorageItem(key, list);
    
    // Auto-log admin actions if applicable
    if (colRef.path !== 'activity_logs' && colRef.path !== 'push_subscriptions') {
        await logAction('Издаване/регистрация', newItem.name || colRef.path, `Регистриран нов запис в ${colRef.path}`, data.amountPaid || 0);
    }
    
    triggerListeners(colRef.path);
    return { id: newId };
};

export const setDoc = async (docRef: any, data: any) => {
    const key = getStorageKeyForCollection(docRef.path);
    let list = getStorageItem(key, []);
    
    const existingIndex = list.findIndex((item: any) => item.id === docRef.id);
    const newItem = { id: docRef.id, ...data };
    
    if (existingIndex >= 0) {
        list[existingIndex] = newItem;
    } else {
        list.push(newItem);
    }
    
    setStorageItem(key, list);
    triggerListeners(docRef.path);
};

export const updateDoc = async (docRef: any, updateFields: any) => {
    const key = getStorageKeyForCollection(docRef.path);
    const list = getStorageItem(key, []);
    const index = list.findIndex((item: any) => item.id === docRef.id);
    
    if (index >= 0) {
        const item = list[index];
        // Apply updates, check for special modifiers like increment or arrayUnion
        Object.keys(updateFields).forEach(f => {
            const val = updateFields[f];
            if (val && val.type === 'increment') {
                item[f] = (item[f] || 0) + val.value;
            } else if (val && val.type === 'arrayUnion') {
                if (!Array.isArray(item[f])) {
                    item[f] = [];
                }
                val.values.forEach((v: any) => {
                    if (!item[f].includes(v)) {
                        item[f].push(v);
                    }
                });
            } else {
                item[f] = val;
            }
        });
        
        list[index] = item;
        setStorageItem(key, list);
        
        // Log scans or edits
        if (docRef.path === 'clients' && updateFields.lastScanAt) {
            await logAction('Валидиране на карта', item.name, `NFC заверка на карта ${item.id}`, 0);
        }
        
        triggerListeners(docRef.path);
    }
};

export const deleteDoc = async (docRef: any) => {
    const key = getStorageKeyForCollection(docRef.path);
    const list = getStorageItem(key, []);
    const index = list.findIndex((item: any) => item.id === docRef.id);
    
    if (index >= 0) {
        const item = list[index];
        const newList = list.filter((i: any) => i.id !== docRef.id);
        setStorageItem(key, newList);
        
        if (docRef.path !== 'activity_logs') {
            await logAction('Изтриване на запис', item.name || docRef.id, `Изтрит запис от ${docRef.path}`, 0);
        }
        
        triggerListeners(docRef.path);
    }
};

export const getDoc = async (docRef: any): Promise<MockSnapshot> => {
    const key = getStorageKeyForCollection(docRef.path);
    const list = getStorageItem(key, []);
    const item = list.find((i: any) => i.id === docRef.id);
    
    return {
        id: docRef.id,
        exists: () => !!item,
        data: () => item,
        empty: !item,
        docs: [],
        size: item ? 1 : 0,
        forEach: (cb: any) => { if (item) cb({ id: docRef.id, exists: () => true, data: () => item }); }
    } as any;
};

export const getDocs = async (queryRef: any): Promise<MockSnapshot> => {
    const key = getStorageKeyForCollection(queryRef.path);
    let list = getStorageItem(key, []);
    
    // Apply basic filter constraints if any
    if (queryRef.constraints) {
        queryRef.constraints.forEach((c: any) => {
            if (c.type === 'where') {
                list = list.filter((item: any) => {
                    const itemVal = item[c.field];
                    if (c.op === '==') return itemVal === c.val;
                    if (c.op === '!=') return itemVal !== c.val;
                    return true;
                });
            }
        });
    }
    
    const docs = list.map((item: any) => ({
        id: item.id || '',
        data: () => item,
        exists: () => true,
        empty: false,
        docs: [],
        size: 0,
        forEach: () => {}
    }));
    
    return {
        id: '',
        exists: () => false,
        data: () => null,
        empty: docs.length === 0,
        docs: docs as any[],
        forEach: (cb: (doc: MockSnapshot) => void) => docs.forEach(cb as any),
        size: docs.length
    } as any;
};

export const onSnapshot = (queryRef: any, callback: ListenerCallback, _onError?: (err: any) => void) => {
    const path = queryRef.path;
    registerListener(path, queryRef, callback);
    return () => {
        unregisterListener(path, callback);
    };
};

// Modifiers
export const increment = (value: number) => ({ type: 'increment', value });
export const arrayUnion = (...values: any[]) => ({ type: 'arrayUnion', values });

// Helper to write to audit logs
const logAction = async (action: string, targetName: string, details: string, amount: number) => {
    const logsKey = STORAGE_KEYS.LOGS;
    const logs = getStorageItem(logsKey, []);
    const user = getStorageItem(STORAGE_KEYS.CURRENT_USER, { username: 'Система' });
    
    logs.push({
        id: generateId(),
        timestamp: new Date().toISOString(),
        performedBy: user ? `${user.role === 'admin' ? 'Администратор' : 'Водещ'} (${user.username})` : 'Демо сесия',
        action,
        targetName,
        details,
        amount
    });
    
    setStorageItem(logsKey, logs);
    triggerListeners('activity_logs');
};


// --- Auth Mock Functions ---
export const auth: any = {
    // Current user getter
    get currentUser() {
        const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (!u) return null;
        try {
            const data = JSON.parse(u);
            // Must return FirebaseUser-like shape
            return {
                uid: data.id,
                email: data.username,
                emailVerified: true
            } as any;
        } catch {
            return null;
        }
    }
};

// Auth listeners
const authListeners: ((user: any) => void)[] = [];

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
    authListeners.push(callback);
    // Run immediately
    callback(authInstance.currentUser);
    return () => {
        const idx = authListeners.indexOf(callback);
        if (idx >= 0) authListeners.splice(idx, 1);
    };
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, passwordHash: string) => {
    const users = getStorageItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    // In our mock, email determines the user. Password matches username prefix (e.g. admin for admin@transitflow.bg)
    const prefix = email.split('@')[0];
    const matchedUser = users.find((u: any) => u.username.toLowerCase() === email.toLowerCase());
    
    if (matchedUser && passwordHash === prefix) {
        setStorageItem(STORAGE_KEYS.CURRENT_USER, matchedUser);
        // Notify
        authListeners.forEach(cb => cb(authInstance.currentUser));
        return { user: authInstance.currentUser };
    } else {
        throw new Error("Невалидно потребителско име или парола! За демото използвайте: admin@transitflow.bg с парола admin, или staff@transitflow.bg с парола staff.");
    }
};

export const signOut = async (_authInstance: any) => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    authListeners.forEach(cb => cb(null));
};

export const createUserWithEmailAndPassword = async (_authInstance: any, email: string, role: string = 'moderator') => {
    const users = getStorageItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    const newId = 'u-' + generateId().toLowerCase();
    
    const newUser = {
        id: newId,
        username: email,
        role: role,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    setStorageItem(STORAGE_KEYS.USERS, users);
    triggerListeners('users');
    
    return { user: { uid: newId, email } };
};

// Messaging / Analytics placeholders
export const analytics = null;
export const messaging = null;

// Cross-tab real-time sync for localStorage mock database
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        
        let collectionName: string | null = null;
        if (e.key === STORAGE_KEYS.CLIENTS) collectionName = 'clients';
        else if (e.key === STORAGE_KEYS.SIGNALS) collectionName = 'signals';
        else if (e.key === STORAGE_KEYS.RENTALS) collectionName = 'rentals';
        else if (e.key === STORAGE_KEYS.LOGS) collectionName = 'activity_logs';
        else if (e.key === STORAGE_KEYS.NOTIFICATIONS) collectionName = 'push_notifications';
        else if (e.key === STORAGE_KEYS.SUBSCRIPTIONS) collectionName = 'push_subscriptions';
        else if (e.key === STORAGE_KEYS.USERS) collectionName = 'users';
        else if (e.key === 'transitflow_col_admin_actions') collectionName = 'admin_actions';

        if (collectionName) {
            triggerListeners(collectionName);
        }
    });
}
