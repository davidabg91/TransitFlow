"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertUnpaidScan = exports.sendPushNotification = exports.reportFailedLogin = exports.syncNfcUid = exports.enrollDevice = exports.deleteStaffUser = exports.createStaffUser = exports.bootstrapPlatformAdmin = exports.provisionTenant = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const REGION = "europe-west3";
const fn = functions.region(REGION);
const PLATFORM_URL = process.env.PLATFORM_URL || "https://app.transitflow.org";
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL || "").toLowerCase();
const db = () => admin.firestore();
const tenantRef = (tenantId) => db().collection("tenants").doc(tenantId);
const nowIso = () => new Date().toISOString();
const ROLES = ["admin", "moderator", "inspector"];
const requireCaller = (context) => {
    const auth = context.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Трябва да сте влезли в системата.");
    }
    const tenant = auth.token.tenant;
    const role = auth.token.role;
    if (!tenant || !role) {
        throw new functions.https.HttpsError("permission-denied", "Акаунтът не е зачислен към фирма.");
    }
    return { uid: auth.uid, tenant, role };
};
const requireAdmin = (context) => {
    const caller = requireCaller(context);
    if (caller.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Само администратори могат да правят това.");
    }
    return caller;
};
exports.provisionTenant = fn.https.onCall(async (data, context) => {
    if (!context.auth?.token.platformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Само платформеният администратор може да създава фирми.");
    }
    const tenantId = String(data?.tenantId || "").trim().toLowerCase();
    const name = String(data?.name || "").trim();
    const adminEmail = String(data?.adminEmail || "").trim().toLowerCase();
    const adminPassword = String(data?.adminPassword || "");
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(tenantId)) {
        throw new functions.https.HttpsError("invalid-argument", "Идентификаторът на фирмата може да съдържа само малки латински букви, цифри и тире.");
    }
    if (!name) {
        throw new functions.https.HttpsError("invalid-argument", "Липсва име на фирмата.");
    }
    if (!adminEmail || adminPassword.length < 8) {
        throw new functions.https.HttpsError("invalid-argument", "Нужен е имейл и парола от поне 8 знака за първия администратор.");
    }
    if ((await tenantRef(tenantId).get()).exists) {
        throw new functions.https.HttpsError("already-exists", `Фирма „${tenantId}“ вече съществува.`);
    }
    const userRecord = await admin.auth().createUser({ email: adminEmail, password: adminPassword });
    await admin.auth().setCustomUserClaims(userRecord.uid, { tenant: tenantId, role: "admin" });
    await tenantRef(tenantId).set({
        name,
        tenant: tenantId,
        createdAt: nowIso(),
        createdBy: context.auth.token.email || context.auth.uid,
        cardUrlPrefix: `${PLATFORM_URL}/t/${tenantId}/client/`,
        active: true,
    });
    await tenantRef(tenantId).collection("users").doc(userRecord.uid).set({
        username: adminEmail,
        role: "admin",
        tenant: tenantId,
        createdAt: nowIso(),
    });
    return { tenantId, adminUid: userRecord.uid };
});
exports.bootstrapPlatformAdmin = fn.https.onCall(async (_data, context) => {
    const email = context.auth?.token.email?.toLowerCase();
    if (!context.auth || !email) {
        throw new functions.https.HttpsError("unauthenticated", "Трябва да сте влезли.");
    }
    if (!PLATFORM_OWNER_EMAIL || email !== PLATFORM_OWNER_EMAIL) {
        throw new functions.https.HttpsError("permission-denied", "Този акаунт не е собственик на платформата.");
    }
    const existing = await db().collection("tenants").limit(1).get();
    if (!existing.empty) {
        throw new functions.https.HttpsError("failed-precondition", "Платформата вече е инициализирана.");
    }
    await admin.auth().setCustomUserClaims(context.auth.uid, { platformAdmin: true });
    return { ok: true };
});
exports.createStaffUser = fn.https.onCall(async (data, context) => {
    const caller = requireAdmin(context);
    const email = String(data?.email || "").trim().toLowerCase();
    const password = String(data?.password || "");
    const role = ROLES.includes(data?.role) ? data.role : "moderator";
    if (!email || password.length < 6) {
        throw new functions.https.HttpsError("invalid-argument", "Невалиден имейл или парола (минимум 6 знака).");
    }
    const userRecord = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(userRecord.uid, { tenant: caller.tenant, role });
    await tenantRef(caller.tenant).collection("users").doc(userRecord.uid).set({
        username: email,
        role,
        tenant: caller.tenant,
        createdAt: nowIso(),
    });
    return { uid: userRecord.uid };
});
exports.deleteStaffUser = fn.https.onCall(async (data, context) => {
    const caller = requireAdmin(context);
    const uid = String(data?.uid || "");
    if (!uid)
        throw new functions.https.HttpsError("invalid-argument", "Липсва потребител.");
    if (uid === caller.uid) {
        throw new functions.https.HttpsError("failed-precondition", "Не можете да изтриете собствения си акаунт.");
    }
    const profile = await tenantRef(caller.tenant).collection("users").doc(uid).get();
    if (!profile.exists) {
        throw new functions.https.HttpsError("not-found", "Този потребител не е от вашата фирма.");
    }
    await admin.auth().deleteUser(uid).catch(() => { });
    await profile.ref.delete();
    return { ok: true };
});
exports.enrollDevice = fn.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Устройството не е инициализирано.");
    }
    const code = String(data?.code || "").trim().toUpperCase();
    if (!code)
        throw new functions.https.HttpsError("invalid-argument", "Липсва код за зачисляване.");
    const matches = await db().collectionGroup("device_codes").where("code", "==", code).limit(1).get();
    if (matches.empty) {
        throw new functions.https.HttpsError("not-found", "Невалиден код.");
    }
    const codeDoc = matches.docs[0];
    const codeData = codeDoc.data();
    const tenantId = String(codeData.tenant || "");
    if (codeData.usedAt) {
        throw new functions.https.HttpsError("failed-precondition", "Този код вече е използван.");
    }
    if (codeData.expiresAt && Date.parse(String(codeData.expiresAt)) < Date.now()) {
        throw new functions.https.HttpsError("failed-precondition", "Кодът е изтекъл.");
    }
    await admin.auth().setCustomUserClaims(context.auth.uid, { tenant: tenantId, role: "device" });
    await codeDoc.ref.update({
        usedAt: nowIso(),
        deviceUid: context.auth.uid,
        deviceLabel: String(data?.label || "").slice(0, 100),
    });
    return { tenant: tenantId };
});
exports.syncNfcUid = fn.firestore
    .document("tenants/{tenantId}/clients/{clientId}")
    .onWrite(async (change, context) => {
    const tenantId = context.params.tenantId;
    const before = change.before.exists ? change.before.data() : undefined;
    const after = change.after.exists ? change.after.data() : undefined;
    const beforeUid = before?.nfcUid ? String(before.nfcUid).toUpperCase() : "";
    const afterUid = after?.nfcUid ? String(after.nfcUid).toUpperCase() : "";
    if (beforeUid === afterUid)
        return;
    const uids = tenantRef(tenantId).collection("nfc_uids");
    const batch = db().batch();
    if (beforeUid)
        batch.delete(uids.doc(beforeUid));
    if (afterUid) {
        batch.set(uids.doc(afterUid), {
            clientId: change.after.id,
            tenant: tenantId,
            updatedAt: nowIso(),
        });
    }
    await batch.commit();
});
const ALERT_THRESHOLD = 3;
const WINDOW_MS = 10 * 60 * 1000;
exports.reportFailedLogin = fn.https.onCall(async (data, context) => {
    const req = context.rawRequest;
    const xff = req.headers["x-forwarded-for"] || "";
    const ip = (xff.split(",")[0] || req.ip || "unknown").trim();
    const email = String(data?.email || "").slice(0, 200);
    const errorCode = String(data?.errorCode || "unknown").slice(0, 100);
    const ua = String(data?.ua || req.headers["user-agent"] || "").slice(0, 500);
    let tenantId = "";
    if (email.includes("@")) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            tenantId = String(user.customClaims?.tenant || "");
        }
        catch {
        }
    }
    const attemptsRef = tenantId
        ? tenantRef(tenantId).collection("login_attempts")
        : db().collection("platform_login_attempts");
    const countersRef = tenantId
        ? tenantRef(tenantId).collection("login_attempt_counters")
        : db().collection("platform_login_attempt_counters");
    const geo = {};
    try {
        const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
        if (r.ok) {
            const g = (await r.json());
            if (g && g.success !== false) {
                geo.city = g.city;
                geo.region = g.region;
                geo.country = g.country;
                geo.countryCode = g.country_code;
                geo.isp = g.connection?.isp || g.connection?.org;
                geo.lat = g.latitude;
                geo.lon = g.longitude;
                geo.timezone = g.timezone?.id;
            }
        }
    }
    catch (err) {
        console.warn("Geo lookup failed:", err);
    }
    const now = Date.now();
    const ipKey = ip.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200) || "unknown";
    const counterRef = countersRef.doc(ipKey);
    let shouldAlert = false;
    let windowCount = 0;
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);
        const d = snap.exists ? snap.data() || {} : {};
        let count = d.count || 0;
        let windowStart = d.windowStart || 0;
        let lastAlertAt = d.lastAlertAt || 0;
        if (now - windowStart > WINDOW_MS) {
            count = 0;
            windowStart = now;
        }
        count += 1;
        windowCount = count;
        if (count >= ALERT_THRESHOLD && now - lastAlertAt > WINDOW_MS) {
            shouldAlert = true;
            lastAlertAt = now;
        }
        tx.set(counterRef, {
            count,
            windowStart,
            lastAlertAt,
            ip,
            lastEmail: email,
            tenant: tenantId || null,
            updatedAt: nowIso(),
        }, { merge: true });
    });
    if (windowCount <= 50) {
        await attemptsRef.add({
            timestamp: nowIso(),
            email,
            errorCode,
            ip,
            ua,
            attemptInWindow: windowCount,
            tenant: tenantId || null,
            ...geo,
        });
    }
    if (shouldAlert && tenantId) {
        const tokensSnap = await tenantRef(tenantId).collection("admin_push_tokens").get();
        const tokens = [];
        tokensSnap.forEach((t) => {
            const tok = t.data().token;
            if (tok)
                tokens.push(tok);
        });
        if (tokens.length > 0) {
            const loc = [geo.city, geo.country].filter(Boolean).join(", ") || "неизвестно местоположение";
            const response = await admin.messaging().sendEachForMulticast({
                notification: {
                    title: "⚠️ Опит за неоторизиран вход",
                    body: `${windowCount} неуспешни опита от ${loc} (IP ${ip}). Имейл: ${email || "—"}`,
                },
                tokens,
            });
            response.responses.forEach((res, i) => {
                if (!res.success) {
                    const code = res.error?.code;
                    if (code === "messaging/registration-token-not-registered" ||
                        code === "messaging/invalid-registration-token") {
                        tokensSnap.docs[i].ref.delete().catch(() => { });
                    }
                }
            });
        }
    }
    return { ok: true, windowCount, alerted: shouldAlert };
});
const notificationIcons = {
    icon: `${PLATFORM_URL}/pwa-icon.png`,
    badge: `${PLATFORM_URL}/favicon.png`,
};
exports.sendPushNotification = fn.firestore
    .document("tenants/{tenantId}/push_notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data)
        return;
    const tenantId = context.params.tenantId;
    const { title, body, courseId } = data;
    try {
        const subs = tenantRef(tenantId).collection("push_subscriptions");
        const query = courseId === "all" ? subs : subs.where("courseId", "==", courseId);
        const subscribers = await query.get();
        const tokens = [];
        subscribers.forEach((docSnap) => {
            const token = docSnap.data().token;
            if (token && !tokens.includes(token))
                tokens.push(token);
        });
        if (tokens.length === 0) {
            console.log(`No subscribers for ${tenantId}.`);
            return;
        }
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const message = {
                notification: { title, body, image: notificationIcons.icon },
                webpush: {
                    notification: { title, body, ...notificationIcons, image: notificationIcons.icon },
                    fcmOptions: { link: `${PLATFORM_URL}/` },
                },
                android: {
                    notification: {
                        icon: "stock_white_24dp",
                        color: "#00ADB5",
                        image: notificationIcons.icon,
                    },
                },
                tokens: tokens.slice(i, i + batchSize),
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`[${tenantId}] sent ${response.successCount}, failed ${response.failureCount}`);
        }
    }
    catch (error) {
        console.error(`[${tenantId}] broadcast failed:`, error);
    }
});
const UNPAID_ALERT_THROTTLE_MS = 15 * 60 * 1000;
exports.alertUnpaidScan = fn.firestore
    .document("tenants/{tenantId}/clients/{clientId}/scans/{scanId}")
    .onCreate(async (snap, context) => {
    const scan = snap.data() || {};
    const at = String(scan.at || "");
    if (!at)
        return;
    const tenantId = context.params.tenantId;
    const clientId = context.params.clientId;
    const clientRef = tenantRef(tenantId).collection("clients").doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists)
        return;
    const client = clientSnap.data() || {};
    const month = at.slice(0, 7);
    const renewalHistory = Array.isArray(client.renewalHistory) ? client.renewalHistory : [];
    const hasPaid = renewalHistory.some((rh) => rh && rh.month === month);
    const isCanceled = client.isCanceled === true;
    if (hasPaid && !isCanceled)
        return;
    const now = Date.now();
    let shouldAlert = false;
    await db().runTransaction(async (tx) => {
        const fresh = await tx.get(clientRef);
        const last = fresh.data()?.lastUnpaidAlertAt || 0;
        if (now - last >= UNPAID_ALERT_THROTTLE_MS) {
            shouldAlert = true;
            tx.update(clientRef, { lastUnpaidAlertAt: now });
        }
    });
    if (!shouldAlert)
        return;
    const tokensSnap = await tenantRef(tenantId)
        .collection("admin_push_tokens")
        .where("unpaidAlerts", "==", true)
        .get();
    const tokens = [];
    tokensSnap.forEach((t) => { const tok = t.data().token; if (tok)
        tokens.push(tok); });
    if (tokens.length === 0)
        return;
    const name = String(client.name || "Без име");
    const rawCard = String(client.cardNumber || "");
    const cardNum = rawCard.replace(/^0+/, "") || rawCard;
    const route = String(scan.route || client.route || "");
    const timeStr = (() => {
        const d = new Date(at);
        return isNaN(d.getTime())
            ? at
            : d.toLocaleTimeString("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit" });
    })();
    const reason = !hasPaid ? "без платен абонамент" : "анулирана карта";
    const cardPart = cardNum ? ` (Карта № ${cardNum})` : "";
    const routePart = route ? ` по ${route}` : "";
    const text = `${name}${cardPart} се качи${routePart} в ${timeStr} ч. — ${reason}.`;
    const response = await admin.messaging().sendEachForMulticast({
        notification: { title: "🚨 Пътуване без абонамент", body: text },
        webpush: {
            notification: {
                title: "🚨 Пътуване без абонамент",
                body: text,
                ...notificationIcons,
                tag: `unpaid-${clientId}`,
            },
            fcmOptions: { link: `${PLATFORM_URL}/` },
        },
        android: { notification: { icon: "stock_white_24dp", color: "#ff5252" } },
        tokens,
    });
    response.responses.forEach((res, i) => {
        if (!res.success) {
            const code = res.error?.code;
            if (code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token") {
                tokensSnap.docs[i].ref.delete().catch(() => { });
            }
        }
    });
});
//# sourceMappingURL=index.js.map