/**
 * Sets up a company from a written spec: the registry entry, its staff
 * accounts, the subscriptions it sells and the lines it runs, with their fares.
 *
 * The panels can do all of this by hand — /platform creates the company,
 * ПОТРЕБИТЕЛИ adds the staff, НАСТРОЙКИ fills the fare matrix. That is a few
 * dozen typed cells per company, and a mistyped fare is money. Here the fares
 * live in a file that can be read, reviewed against the operator's own list and
 * re-run, and the run itself is a diff rather than an act of typing.
 *
 * Usage, from the `platform` directory:
 *
 *   node scripts/provision-company.mjs scripts/companies/<file>.json
 *   node scripts/provision-company.mjs scripts/companies/<file>.json --apply
 *
 * Without `--apply` nothing is written — it reads the current state and prints
 * what would change. Re-running with `--apply` is safe: an account that already
 * exists is left alone apart from its role, and a line is written to the same
 * document id it had before.
 *
 * Credentials — the Admin SDK bypasses the security rules, so this needs an
 * account with real access to the project. Either:
 *
 *   gcloud auth application-default login       (once, as the project owner)
 *   set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file
 *
 * Passwords are never kept in the spec file. A password is taken from the
 * environment as TF_PW_<username with non-letters as underscores>, and when
 * there is none a strong one is generated and printed once, at the end of the
 * run. Nothing in the app lets a member of staff change their own password, so
 * whatever is set here is what they will keep — hand it over directly.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// firebase-admin is a dependency of the functions, not of the web app.
const require = createRequire(resolve(here, '../functions/package.json'));
const admin = require('firebase-admin');

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://app.transitflow.org';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'pokanipro';
const ROLES = ['admin', 'moderator', 'inspector'];

const [specPath, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');

if (!specPath) {
    console.error('Липсва файл със спецификация.\n  node scripts/provision-company.mjs scripts/companies/<file>.json [--apply]');
    process.exit(1);
}

const spec = JSON.parse(readFileSync(resolve(process.cwd(), specPath), 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// Checking the spec before touching anything
// ─────────────────────────────────────────────────────────────────────────────

/** The same rule the app uses: a name without an `@` is a login, not an inbox. */
const emailOf = (username) => (username.includes('@') ? username : `${username}@transitflow.bg`).toLowerCase();

const problems = [];

if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(spec.tenantId || '')) {
    problems.push(`Идентификаторът „${spec.tenantId}“ не е допустим — само малки латински букви, цифри и тире.`);
}
if (!spec.name) problems.push('Липсва име на фирмата.');

const admins = (spec.staff || []).filter(s => s.role === 'admin');
if (admins.length === 0) problems.push('Няма нито един администратор — фирмата не би могла да се управлява.');

const seen = new Map();
for (const person of spec.staff || []) {
    if (!ROLES.includes(person.role)) {
        problems.push(`${person.person || person.username}: непозната роля „${person.role}“.`);
    }
    const email = emailOf(person.username || '');
    if (seen.has(email)) {
        problems.push(
            `Двама души искат едно и също потребителско име „${email}“ ` +
            `(${seen.get(email)} и ${person.person}). Всеки акаунт е отделен човек в одита — дайте им различни имена.`
        );
    }
    seen.set(email, person.person);
}

const offered = new Set(spec.settings?.periods || []);
for (const route of spec.routes || []) {
    for (const [cardType, byPeriod] of Object.entries(route.prices || {})) {
        if (!(spec.settings?.cardTypes || []).includes(cardType)) {
            problems.push(`Линия „${route.name}“: цена за „${cardType}“, който не е сред продаваните видове карти.`);
        }
        for (const [period, value] of Object.entries(byPeriod)) {
            if (!offered.has(period)) {
                problems.push(`Линия „${route.name}“: цена за период „${period}“, който фирмата не предлага.`);
            }
            if (typeof value !== 'number' || !(value > 0)) {
                problems.push(`Линия „${route.name}“, ${cardType}/${period}: „${value}“ не е цена.`);
            }
        }
    }
}

if (problems.length) {
    console.error('\nСпецификацията не е изрядна:\n');
    problems.forEach(p => console.error('  • ' + p));
    console.error('');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Running it
// ─────────────────────────────────────────────────────────────────────────────

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();
const tenantRef = db.collection('tenants').doc(spec.tenantId);
const nowIso = () => new Date().toISOString();

const plan = [];
const note = (line) => { plan.push(line); console.log('  ' + line); };

/** Sixteen characters a person can read off paper without mistaking l for 1. */
const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(randomBytes(16), b => alphabet[b % alphabet.length]).join('');
};

const passwordFor = (username) => {
    const key = 'TF_PW_' + username.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
    return { value: process.env[key] || generatePassword(), fromEnv: !!process.env[key], key };
};

const issued = [];

const run = async () => {
    console.log(`\n${apply ? 'ЗАПИС' : 'ПРОБА (нищо не се записва)'} — проект ${PROJECT_ID}\n`);
    console.log(`Фирма: ${spec.name}  [${spec.tenantId}]`);
    console.log(`Адрес на картите: ${PLATFORM_URL}/t/${spec.tenantId}/client/…\n`);

    // ---- The company itself ----
    console.log('Фирма');
    const existing = await tenantRef.get();
    if (existing.exists) {
        note(`вече съществува от ${existing.data().createdAt || '—'} — оставя се непроменена`);
    } else {
        note('създава се');
        if (apply) {
            await tenantRef.set({
                name: spec.name,
                tenant: spec.tenantId,
                createdAt: nowIso(),
                createdBy: 'scripts/provision-company.mjs',
                cardUrlPrefix: `${PLATFORM_URL}/t/${spec.tenantId}/client/`,
                active: true,
            });
        }
    }

    // ---- Staff ----
    console.log('\nПерсонал');
    for (const person of spec.staff) {
        const email = emailOf(person.username);
        const label = `${person.person} — ${email} (${person.role})`;

        let record = null;
        try {
            record = await auth.getUserByEmail(email);
        } catch { /* not there yet */ }

        if (record) {
            const claims = record.customClaims || {};
            if (claims.tenant && claims.tenant !== spec.tenantId) {
                note(`${label}: ПРОПУСНАТ — този акаунт е зачислен към „${claims.tenant}“`);
                continue;
            }
            if (claims.role === person.role) {
                note(`${label}: вече съществува`);
            } else {
                note(`${label}: съществува, ролята се променя от „${claims.role || '—'}“`);
                if (apply) {
                    await auth.setCustomUserClaims(record.uid, { tenant: spec.tenantId, role: person.role });
                    await tenantRef.collection('users').doc(record.uid).set(
                        { username: email, role: person.role, tenant: spec.tenantId }, { merge: true }
                    );
                }
            }
            continue;
        }

        const password = passwordFor(person.username);
        note(`${label}: създава се${password.fromEnv ? ` (парола от ${password.key})` : ' (нова парола)'}`);
        if (apply) {
            const created = await auth.createUser({ email, password: password.value });
            await auth.setCustomUserClaims(created.uid, { tenant: spec.tenantId, role: person.role });
            await tenantRef.collection('users').doc(created.uid).set({
                username: email,
                role: person.role,
                tenant: spec.tenantId,
                createdAt: nowIso(),
            });
        }
        if (!password.fromEnv) issued.push({ person: person.person, login: person.username, password: password.value });
    }

    // ---- What the company sells ----
    console.log('\nНастройки');
    note(`абонаменти: ${spec.settings.periods.join(', ')}`);
    note(`видове карти: ${spec.settings.cardTypes.join(', ')}`);
    if (apply) {
        await tenantRef.collection('settings').doc('general').set({
            periods: spec.settings.periods,
            cardTypes: spec.settings.cardTypes,
            tenant: spec.tenantId,
        }, { merge: true });
    }

    // ---- Lines and fares ----
    console.log('\nЛинии');
    for (const route of spec.routes) {
        // The panels key a line by its name — the same id the НАСТРОЙКИ form uses,
        // so a line written here and one edited there are the same document.
        const id = route.name.trim();
        const body = {
            name: id,
            stops: route.stops || [],
            singleTicket: route.singleTicket ?? null,
            prices: route.prices || {},
            active: route.active !== false,
            tenant: spec.tenantId,
        };
        if (route.order !== undefined) body.order = route.order;

        const fares = Object.entries(body.prices)
            .flatMap(([type, byPeriod]) =>
                Object.entries(byPeriod).map(([period, value]) => `${type}/${period} ${value} €`))
            .join(', ');
        note(`${id}: ${fares || 'без цени'}`);
        if (apply) await tenantRef.collection('routes').doc(id).set(body);
    }

    if (!apply) {
        console.log(`\n${plan.length} промени. Пуснете отново с --apply, за да се запишат.\n`);
        return;
    }

    console.log('\nГотово.\n');
    if (issued.length) {
        console.log('Пароли — показват се само сега, никъде не се записват:\n');
        for (const account of issued) {
            console.log(`  ${account.person}`);
            console.log(`    вход:   ${account.login}`);
            console.log(`    парола: ${account.password}\n`);
        }
        console.log('В системата няма смяна на парола — предайте ги лично и ги пазете.\n');
    }
};

run().then(() => process.exit(0)).catch(err => {
    console.error('\nНеуспех:', err.message || err, '\n');
    process.exit(1);
});
