import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Every function runs next to the database. The default is us-central1, which
 * would put an ocean between each call and the data it reads.
 */
const REGION = "europe-west3";
const fn = functions.region(REGION);

/** Where the app is served from — used in push notification links and icons. */
const PLATFORM_URL = process.env.PLATFORM_URL || "https://app.transitflow.org";

/** Only this account may create companies. Set in functions/.env. */
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL || "").toLowerCase();

const db = () => admin.firestore();
const tenantRef = (tenantId: string) => db().collection("tenants").doc(tenantId);
const nowIso = () => new Date().toISOString();

type Role = "admin" | "moderator" | "inspector";
const ROLES: Role[] = ["admin", "moderator", "inspector"];

// ─────────────────────────────────────────────────────────────────────────────
// Callers
// ─────────────────────────────────────────────────────────────────────────────

interface Caller {
    uid: string;
    tenant: string;
    role: string;
}

/**
 * The company and role come from the token's claims, which are set here and
 * cannot be edited by the user. The original looked the caller up in Firestore
 * on every call; the claim is already in the token, so this is free.
 */
const requireCaller = (context: functions.https.CallableContext): Caller => {
    const auth = context.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Трябва да сте влезли в системата.");
    }
    const tenant = auth.token.tenant as string | undefined;
    const role = auth.token.role as string | undefined;
    if (!tenant || !role) {
        throw new functions.https.HttpsError("permission-denied", "Акаунтът не е зачислен към фирма.");
    }
    return { uid: auth.uid, tenant, role };
};

const requireAdmin = (context: functions.https.CallableContext): Caller => {
    const caller = requireCaller(context);
    if (caller.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Само администратори могат да правят това.");
    }
    return caller;
};

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding a company
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a company and its first administrator: the registry document, the
 * admin's auth account, and the claims that tie that account to the company.
 *
 * Restricted to the platform owner — the account named in PLATFORM_OWNER_EMAIL,
 * which must also carry the `platformAdmin` claim (see bootstrapPlatformAdmin).
 */
export const provisionTenant = fn.https.onCall(async (data, context) => {
    if (!context.auth?.token.platformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Само платформеният администратор може да създава фирми.");
    }

    const tenantId = String(data?.tenantId || "").trim().toLowerCase();
    const name = String(data?.name || "").trim();
    const adminEmail = String(data?.adminEmail || "").trim().toLowerCase();
    const adminPassword = String(data?.adminPassword || "");

    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(tenantId)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Идентификаторът на фирмата може да съдържа само малки латински букви, цифри и тире."
        );
    }
    if (!name) {
        throw new functions.https.HttpsError("invalid-argument", "Липсва име на фирмата.");
    }
    if (!adminEmail || adminPassword.length < 8) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Нужен е имейл и парола от поне 8 знака за първия администратор."
        );
    }

    // The tenant id ends up printed on physical cards, so it can never be reused.
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

/**
 * One-time bootstrap: grants the `platformAdmin` claim to the owner account so
 * that provisionTenant can be used at all. Refuses once any company exists, so
 * it cannot be replayed later to seize the platform.
 *
 * The caller must be signed in as PLATFORM_OWNER_EMAIL. Sign out and back in
 * afterwards for the new claim to appear in the token.
 */
export const bootstrapPlatformAdmin = fn.https.onCall(async (_data, context) => {
    const email = (context.auth?.token.email as string | undefined)?.toLowerCase();
    if (!context.auth || !email) {
        throw new functions.https.HttpsError("unauthenticated", "Трябва да сте влезли.");
    }
    if (!PLATFORM_OWNER_EMAIL || email !== PLATFORM_OWNER_EMAIL) {
        throw new functions.https.HttpsError("permission-denied", "Този акаунт не е собственик на платформата.");
    }
    const existing = await db().collection("tenants").limit(1).get();
    if (!existing.empty) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Платформата вече е инициализирана."
        );
    }
    await admin.auth().setCustomUserClaims(context.auth.uid, { platformAdmin: true });
    return { ok: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Staff and devices
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a staff account inside the caller's own company.
 *
 * Done here with the Admin SDK so the calling admin is not signed out (the
 * client SDK's createUserWithEmailAndPassword would swap the active session),
 * and so the claims that bind the account to the company are set server-side —
 * a user can never grant themselves a company or a role.
 */
export const createStaffUser = fn.https.onCall(async (data, context) => {
    const caller = requireAdmin(context);

    const email = String(data?.email || "").trim().toLowerCase();
    const password = String(data?.password || "");
    const role: Role = ROLES.includes(data?.role) ? data.role : "moderator";

    if (!email || password.length < 6) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Невалиден имейл или парола (минимум 6 знака)."
        );
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

/** Removes a staff account from the caller's company, auth record included. */
export const deleteStaffUser = fn.https.onCall(async (data, context) => {
    const caller = requireAdmin(context);
    const uid = String(data?.uid || "");
    if (!uid) throw new functions.https.HttpsError("invalid-argument", "Липсва потребител.");
    if (uid === caller.uid) {
        throw new functions.https.HttpsError("failed-precondition", "Не можете да изтриете собствения си акаунт.");
    }

    const profile = await tenantRef(caller.tenant).collection("users").doc(uid).get();
    if (!profile.exists) {
        throw new functions.https.HttpsError("not-found", "Този потребител не е от вашата фирма.");
    }

    await admin.auth().deleteUser(uid).catch(() => { /* already gone */ });
    await profile.ref.delete();
    return { ok: true };
});

/**
 * Enrols a bus terminal.
 *
 * Drivers never sign in — the device does. It signs in anonymously, then calls
 * this once with a short code an admin generated, which puts the company on its
 * token as a `device` role. From then on its scans carry a company and the
 * rules can check them, without a driver ever typing a password.
 */
export const enrollDevice = fn.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Устройството не е инициализирано.");
    }
    const code = String(data?.code || "").trim().toUpperCase();
    if (!code) throw new functions.https.HttpsError("invalid-argument", "Липсва код за зачисляване.");

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

// ─────────────────────────────────────────────────────────────────────────────
// Chip UID → card lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keeps `nfc_uids/{UID} -> clientId` in step with each card's `nfcUid`, so a
 * terminal that could read only the chip's physical UID (not the printed URL)
 * still resolves the card. Runs only when the UID actually changes, so ordinary
 * scan-counter writes are ignored.
 */
export const syncNfcUid = fn.firestore
    .document("tenants/{tenantId}/clients/{clientId}")
    .onWrite(async (change, context) => {
        const tenantId = context.params.tenantId as string;
        const before = change.before.exists ? change.before.data() : undefined;
        const after = change.after.exists ? change.after.data() : undefined;
        const beforeUid = before?.nfcUid ? String(before.nfcUid).toUpperCase() : "";
        const afterUid = after?.nfcUid ? String(after.nfcUid).toUpperCase() : "";
        if (beforeUid === afterUid) return;

        const uids = tenantRef(tenantId).collection("nfc_uids");
        const batch = db().batch();
        if (beforeUid) batch.delete(uids.doc(beforeUid));
        if (afterUid) {
            batch.set(uids.doc(afterUid), {
                clientId: change.after.id,
                tenant: tenantId,
                updatedAt: nowIso(),
            });
        }
        await batch.commit();
    });

// ─────────────────────────────────────────────────────────────────────────────
// Failed-login monitoring
// ─────────────────────────────────────────────────────────────────────────────

interface GeoInfo {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
}

interface IpWhoResponse {
    success?: boolean;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    connection?: { isp?: string; org?: string };
    timezone?: { id?: string };
}

const ALERT_THRESHOLD = 3;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * The login page reports failed attempts here. Callable without auth, because
 * by definition nobody is signed in when a login fails — which also means the
 * company is unknown. We resolve it from the attempted email: a failure against
 * a real account is filed under that account's company, where its own admins
 * can see it. Attempts against addresses that do not exist (the bulk of
 * automated attacks) are filed at platform level instead.
 */
export const reportFailedLogin = fn.https.onCall(async (data, context) => {
    const req = context.rawRequest;
    const xff = (req.headers["x-forwarded-for"] as string) || "";
    const ip = (xff.split(",")[0] || req.ip || "unknown").trim();
    const email = String(data?.email || "").slice(0, 200);
    const errorCode = String(data?.errorCode || "unknown").slice(0, 100);
    const ua = String(data?.ua || req.headers["user-agent"] || "").slice(0, 500);

    let tenantId = "";
    if (email.includes("@")) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            tenantId = String(user.customClaims?.tenant || "");
        } catch {
            // Unknown address — stays at platform level.
        }
    }

    const attemptsRef = tenantId
        ? tenantRef(tenantId).collection("login_attempts")
        : db().collection("platform_login_attempts");
    const countersRef = tenantId
        ? tenantRef(tenantId).collection("login_attempt_counters")
        : db().collection("platform_login_attempt_counters");

    const geo: GeoInfo = {};
    try {
        const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
        if (r.ok) {
            const g = (await r.json()) as IpWhoResponse;
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
    } catch (err) {
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
        let count = (d.count as number) || 0;
        let windowStart = (d.windowStart as number) || 0;
        let lastAlertAt = (d.lastAlertAt as number) || 0;

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

    // Only a company's own admins are alerted, and only about its own accounts.
    if (shouldAlert && tenantId) {
        const tokensSnap = await tenantRef(tenantId).collection("admin_push_tokens").get();
        const tokens: string[] = [];
        tokensSnap.forEach((t) => {
            const tok = t.data().token;
            if (tok) tokens.push(tok);
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
                        tokensSnap.docs[i].ref.delete().catch(() => { /* ignore */ });
                    }
                }
            });
        }
    }

    return { ok: true, windowCount, alerted: shouldAlert };
});

// ─────────────────────────────────────────────────────────────────────────────
// Push notifications
// ─────────────────────────────────────────────────────────────────────────────

const notificationIcons = {
    icon: `${PLATFORM_URL}/pwa-icon.png`,
    badge: `${PLATFORM_URL}/favicon.png`,
};

/** Broadcasts a notification to that company's subscribers only. */
export const sendPushNotification = fn.firestore
    .document("tenants/{tenantId}/push_notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data) return;

        const tenantId = context.params.tenantId as string;
        const { title, body, courseId } = data;

        try {
            const subs = tenantRef(tenantId).collection("push_subscriptions");
            const query = courseId === "all" ? subs : subs.where("courseId", "==", courseId);

            const subscribers = await query.get();
            const tokens: string[] = [];
            subscribers.forEach((docSnap) => {
                const token = docSnap.data().token;
                if (token && !tokens.includes(token)) tokens.push(token);
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
        } catch (error) {
            console.error(`[${tenantId}] broadcast failed:`, error);
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// Travelling without a subscription
// ─────────────────────────────────────────────────────────────────────────────

const UNPAID_ALERT_THROTTLE_MS = 15 * 60 * 1000;

/**
 * Alerts subscribed admins the moment a card is scanned without a valid
 * subscription for that month, so they can go and check the bus. Throttled per
 * card so frequent scans do not flood.
 */
export const alertUnpaidScan = fn.firestore
    .document("tenants/{tenantId}/clients/{clientId}/scans/{scanId}")
    .onCreate(async (snap, context) => {
        const scan = snap.data() || {};
        const at = String(scan.at || "");
        if (!at) return;

        const tenantId = context.params.tenantId as string;
        const clientId = context.params.clientId as string;

        const clientRef = tenantRef(tenantId).collection("clients").doc(clientId);
        const clientSnap = await clientRef.get();
        if (!clientSnap.exists) return;
        const client = clientSnap.data() || {};

        // Mirrors the validity check on the terminal: is there a payment for the
        // month of the scan, and is the card still active. Service cards carry a
        // record for every month, so they read as valid.
        const month = at.slice(0, 7);
        const renewalHistory = Array.isArray(client.renewalHistory) ? client.renewalHistory : [];
        const hasPaid = renewalHistory.some((rh: { month?: string }) => rh && rh.month === month);
        const isCanceled = client.isCanceled === true;
        if (hasPaid && !isCanceled) return;

        const now = Date.now();
        let shouldAlert = false;
        await db().runTransaction(async (tx) => {
            const fresh = await tx.get(clientRef);
            const last = (fresh.data()?.lastUnpaidAlertAt as number) || 0;
            if (now - last >= UNPAID_ALERT_THROTTLE_MS) {
                shouldAlert = true;
                tx.update(clientRef, { lastUnpaidAlertAt: now });
            }
        });
        if (!shouldAlert) return;

        const tokensSnap = await tenantRef(tenantId)
            .collection("admin_push_tokens")
            .where("unpaidAlerts", "==", true)
            .get();
        const tokens: string[] = [];
        tokensSnap.forEach((t) => { const tok = t.data().token; if (tok) tokens.push(tok); });
        if (tokens.length === 0) return;

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
                    tokensSnap.docs[i].ref.delete().catch(() => { /* ignore */ });
                }
            }
        });
    });
