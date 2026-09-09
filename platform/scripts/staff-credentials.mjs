/**
 * Issues the staff of one company their logins, on paper.
 *
 * A password is never stored anywhere this project can read: Firebase keeps a
 * hash, the app keeps nothing, and the panel has no screen that shows one. That
 * is the right way round — it means a copied database is not a copied company —
 * but it also means a lost password cannot be looked up, only replaced. So this
 * writes the document and sets the passwords in the same run: what is printed is
 * true because it was made true a moment earlier.
 *
 * Usage, from the `platform` directory:
 *
 *   node scripts/staff-credentials.mjs scripts/companies/<file>.json
 *   node scripts/staff-credentials.mjs scripts/companies/<file>.json --apply
 *
 * Without `--apply` nothing is touched: it prints who would be issued and writes
 * a sample document with the passwords struck through, so the paper can be
 * looked at before four people's accounts are changed.
 *
 * A password already known is passed in the environment as TF_PW_<username with
 * non-letters as underscores>, the same convention the provisioning script uses.
 * It is still written to the account, so the sheet cannot be wrong about it.
 *
 * Credentials — the Admin SDK bypasses the security rules, so this needs an
 * account with real access to the project:
 *
 *   gcloud auth application-default login
 *
 * The document is one protocol sheet, which the client signs, followed by a slip
 * per person to be cut off and handed over separately. They are separate on
 * purpose: a single sheet listing four passwords hands every one of them to
 * whoever picks the sheet up, and after that the system's own record of who did
 * what is worth nothing.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// firebase-admin is a dependency of the functions, not of the web app.
const require = createRequire(resolve(here, '../functions/package.json'));
const admin = require('firebase-admin');

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://app.transitflow.org';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'pokanipro';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROLE_LABELS = {
    admin: 'Администратор',
    moderator: 'Модератор',
    inspector: 'Проверяващ',
};

/** What each role may do, in the one line there is room for on a slip. */
const ROLE_SCOPE = {
    admin: 'пълен достъп, включително цени, отчети и потребители',
    moderator: 'издава и подновява карти на гишето',
    inspector: 'проверява карти, без достъп до плащанията',
};

const [specPath, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');

if (!specPath) {
    console.error('Липсва файл със спецификация.\n  node scripts/staff-credentials.mjs scripts/companies/<file>.json [--apply]');
    process.exit(1);
}

const spec = JSON.parse(readFileSync(resolve(process.cwd(), specPath), 'utf8'));

/** The same rule the app uses: a name without an `@` is a login, not an inbox. */
const emailOf = (username) => (username.includes('@') ? username : `${username}@transitflow.bg`).toLowerCase();

/** Sixteen characters a person can read off paper without mistaking l for 1. */
const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(randomBytes(16), b => alphabet[b % alphabet.length]).join('');
};

const passwordFor = (username) => {
    const key = 'TF_PW_' + username.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
    return { value: process.env[key] || generatePassword(), fromEnv: !!process.env[key], key };
};

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LEGAL_FORMS = ['ЕООД', 'ООД', 'ЕАД', 'АД', 'ЕТ', 'СД', 'КД'];

/**
 * The company as a document writes it: „ЦВЕТИНА – МЕЗДРА“ ЕООД.
 *
 * The registry spells it flat and in capitals — ЦВЕТИНА - МЕЗДРА ЕООД — and
 * copying that onto a contract puts the legal form inside the quotation marks,
 * which is not how a Bulgarian company is named in writing. The form belongs
 * outside them, and the hyphen between two place names is a dash.
 */
const formatCompany = (raw) => {
    const flat = String(raw || '').trim().replace(/\s+/g, ' ');
    for (const form of LEGAL_FORMS) {
        const tail = new RegExp('\\s+' + form + '$');
        if (tail.test(flat)) {
            return '„' + flat.replace(tail, '').replace(/\s+-\s+/g, ' – ') + '“ ' + form;
        }
    }
    return flat;
};

const clientName = spec.company && spec.company.name ? formatCompany(spec.company.name) : spec.name;

// ─────────────────────────────────────────────────────────────────────────────
// The paper
// ─────────────────────────────────────────────────────────────────────────────

const logo = 'data:image/png;base64,' + readFileSync(join(here, 'assets', 'logo-print.png')).toString('base64');

const fill = (w) => `<span class="fill" style="min-width:${w}"></span>`;

/**
 * A slip is what one person is handed. It carries their own password and nothing
 * about anybody else, and it is signed for on the protocol, so the handover can
 * be proved without the protocol itself carrying the passwords.
 */
const slip = (person, sample) => `
    <div class="slip">
      <div class="slip-head">
        <img src="${logo}" alt="TransitFlow">
        <div class="slip-for">Личен достъп &middot; ${esc(clientName)}</div>
      </div>

      <div class="slip-name">${esc(person.person)}</div>
      <div class="slip-role">${esc(ROLE_LABELS[person.role] || person.role)} &mdash; ${esc(ROLE_SCOPE[person.role] || '')}</div>

      <table class="creds">
        <tr><th>Адрес</th><td class="mono">${esc(PLATFORM_URL.replace(/^https?:\/\//, ''))}</td></tr>
        <tr><th>Потребител</th><td class="mono">${esc(person.username)}</td></tr>
        <tr><th>Парола</th><td class="mono pw${sample ? ' pw-sample' : ''}">${esc(person.password)}</td></tr>
      </table>

      <ol class="slip-rules">
        <li>Сменете паролата при първото влизане: <strong>Настройки &rarr; Моята парола</strong>.</li>
        <li>Паролата е лична. Всичко, направено с това име, се води на Ваше име.</li>
        <li>Не я казвайте на никого &mdash; включително на човек, който се представя за поддръжка.</li>
      </ol>

      <div class="slip-sign">Получих: подпис ${fill('8.5rem')} дата ${fill('5.5rem')}</div>
    </div>`;

/** Two slips to a sheet. */
const pairs = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
    return out;
};

const buildDocument = (people, sample) => `<!-- generated by scripts/staff-credentials.mjs -->
<title>Протокол за предаване на достъп — TransitFlow</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&amp;family=PT+Sans:wght@400;700&amp;family=PT+Mono&amp;display=swap">

<style>
  /*
    One ink, like the contract this belongs beside.

    Printed on a black-and-white laser, so nothing carries meaning in colour:
    weight, size and black hairlines do the work, and all of it survives being
    photocopied. The password is set in a monospace face, letter-spaced, at a
    size that can be typed from across a desk — a password read wrong is a
    support call, and an l read as a 1 is the usual way it happens.
  */
  :root {
    --paper:     #ffffff;
    --ink:       #000000;
    --ink-soft:  #3d3d3d;
    --ink-faint: #6e6e6e;
    --rule:      #c9cdd2;
    --serif: "PT Serif", Georgia, "Times New Roman", serif;
    --sans:  "PT Sans", "Segoe UI", system-ui, sans-serif;
    --mono:  "PT Mono", Consolas, "Courier New", monospace;
  }

  * { box-sizing: border-box; }
  body {
    background: #e9ecef; color: var(--ink); font-family: var(--serif);
    font-size: 16px; line-height: 1.55; margin: 0;
    -webkit-font-smoothing: antialiased;
  }
  .sheet {
    background: var(--paper); max-width: 46rem; margin: 2.5rem auto;
    padding: 3.5rem 4rem 4rem;
    box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 40px -12px rgba(0,0,0,.18);
  }
  .fill {
    display: inline-block; border-bottom: 0.75px solid var(--ink-soft);
    min-width: 5rem; height: .95em;
  }

  /* ── Letterhead ───────────────────────────────────────────────────── */
  .mast {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 2rem; padding-bottom: .95rem;
    border-bottom: 2.5px solid var(--ink); margin-bottom: 1.5rem;
  }
  .mast img { width: 186px; height: auto; display: block; }
  .issuer {
    font-family: var(--sans); font-size: .71rem; letter-spacing: .09em;
    text-transform: uppercase; color: var(--ink-faint); margin-top: .55rem;
  }
  .meta {
    font-family: var(--sans); font-size: .74rem; line-height: 1.9;
    color: var(--ink-soft); text-align: right; white-space: nowrap;
  }

  h1 {
    font-family: var(--sans); font-weight: 700; font-size: 1.3rem;
    line-height: 1.2; letter-spacing: -.015em; text-wrap: balance;
    margin: 0 0 .28rem;
  }
  .subtitle {
    font-family: var(--sans); font-size: .81rem; color: var(--ink-soft);
    margin: 0 0 1.2rem;
  }

  .preamble p { margin: 0 0 .46rem; }
  .party { padding-left: 1.5rem; text-indent: -1.5rem; }
  .term { font-family: var(--sans); font-size: .82rem; font-weight: 700; letter-spacing: .04em; }

  h2 {
    font-family: var(--sans); font-weight: 700; font-size: .84rem;
    letter-spacing: .09em; text-transform: uppercase; color: var(--ink);
    margin: 1.15rem 0 .5rem; padding-bottom: .26rem;
    border-bottom: 1.5px solid var(--ink);
    break-after: avoid; page-break-after: avoid;
  }

  /* ── The register of accounts ─────────────────────────────────────── */
  table.register { width: 100%; border-collapse: collapse; font-size: .82rem; }
  table.register th {
    font-family: var(--sans); font-size: .68rem; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase; color: var(--ink-faint);
    text-align: left; padding: 0 .5rem .35rem 0;
    border-bottom: 1px solid var(--ink);
  }
  table.register td {
    padding: .42rem .5rem .42rem 0; vertical-align: bottom;
    border-bottom: 0.75px solid var(--rule);
  }
  table.register td.num { color: var(--ink-faint); font-variant-numeric: tabular-nums; width: 1.6rem; }
  table.register td.who { font-family: var(--sans); font-weight: 700; white-space: nowrap; }
  table.register td.login { font-family: var(--mono); font-size: .75rem; }
  table.register td.sign { width: 9rem; }

  ol.rules { margin: 0; padding-left: 1.3rem; }
  ol.rules > li { margin-bottom: .26rem; padding-left: .25rem; }

  .note {
    font-family: var(--sans); font-size: .75rem; color: var(--ink-soft);
    border-left: 2.5px solid var(--ink); padding: .06rem 0 .06rem .7rem;
    margin: .7rem 0 0;
  }

  .signatures {
    display: flex; justify-content: space-between; gap: 3rem; margin-top: 1.2rem;
    break-inside: avoid; page-break-inside: avoid;
  }
  .signatures > div { flex: 1; }
  .sig-role {
    font-family: var(--sans); font-size: .72rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint);
    margin-bottom: .2rem;
  }
  .sig-who { font-family: var(--sans); font-size: .84rem; font-weight: 700; }
  .sig-line { border-bottom: 0.75px solid var(--ink); margin-top: 1.25rem; }
  .sig-cap { font-family: var(--sans); font-size: .7rem; color: var(--ink-faint); margin-top: .3rem; }

  /* ── The slips ────────────────────────────────────────────────────── */
  /* Two to a sheet, cut apart along the middle. Which slip lands on which sheet
     is decided here rather than left to whatever happens to fit, so the cut line
     is always in the same place and can never fall across a password. */
  .slip-page { break-before: page; page-break-before: always; }
  .slip {
    border: 1.25px solid var(--ink); padding: 1.5rem 1.7rem 1.3rem;
    break-inside: avoid; page-break-inside: avoid;
    display: flex; flex-direction: column;
  }
  .slip-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1.5rem; padding-bottom: .7rem; margin-bottom: .85rem;
    border-bottom: 0.75px solid var(--rule);
  }
  .slip-head img { width: 128px; height: auto; display: block; }
  .slip-for {
    font-family: var(--sans); font-size: .68rem; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ink-faint); text-align: right;
  }
  .slip-name { font-family: var(--sans); font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
  .slip-role { font-family: var(--sans); font-size: .74rem; color: var(--ink-soft); margin-bottom: .8rem; }

  /* Shrink-wrapped, or the flex column stretches it and the box drawn round the
     password runs the whole width of the slip with a short word rattling in it. */
  table.creds { border-collapse: collapse; margin-bottom: .8rem; align-self: flex-start; }
  table.creds th {
    font-family: var(--sans); font-size: .68rem; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase; color: var(--ink-faint);
    text-align: left; padding: .24rem 1.1rem .24rem 0; vertical-align: middle;
    white-space: nowrap;
  }
  table.creds td { padding: .24rem 0; }
  .mono { font-family: var(--mono); }
  td.pw {
    font-size: 1.22rem; font-weight: 700; letter-spacing: .12em;
    padding: .34rem .7rem; border: 0.75px solid var(--ink); white-space: nowrap;
  }
  td.pw-sample { text-decoration: line-through; color: var(--ink-faint); border-style: dashed; }

  ol.slip-rules {
    margin: 0 0 .85rem; padding-left: 1.2rem;
    font-size: .78rem; color: var(--ink-soft);
  }
  ol.slip-rules > li { margin-bottom: .18rem; }
  .slip-sign {
    font-family: var(--sans); font-size: .74rem; color: var(--ink-soft);
    padding-top: .7rem; border-top: 0.75px solid var(--rule);
  }

  .cut {
    font-family: var(--sans); font-size: .63rem; letter-spacing: .18em;
    text-transform: uppercase; color: var(--ink-faint);
    border-top: 1px dashed #9aa0a6; text-align: center;
    padding-top: .28rem; margin: .9rem 0 .75rem;
  }

  .stamp {
    font-family: var(--sans); font-size: .72rem; font-weight: 700;
    letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint);
    border: 1.25px dashed var(--ink-faint); padding: .35rem .8rem;
    text-align: center; margin-bottom: 1rem;
  }

  @media print {
    @page { size: A4; margin: 15mm; }
    /* Everything above is sized in rem, which answers to the root and not to
       the body — so this one line is what scales the whole document onto its
       sheet. The protocol has to end on the page it starts on: a signature
       block alone on a second sheet is the thing that makes a document look
       like it was printed rather than typeset. */
    html { font-size: 14.5px; }
    body { background: #fff; font-size: 9.4pt; line-height: 1.42; }
    /* The sheet is claimed in full and the free space shared out between four
       automatic margins, which lands the cut line across the middle of the paper
       and each slip in the middle of its own half. Stretching the slips to fill
       the halves instead would leave a hole inside every card. */
    .slip-page { min-height: 264mm; display: flex; flex-direction: column; }
    .slip-page > .slip:first-child { margin-top: auto; }
    .slip-page > .slip:last-child { margin-bottom: auto; }
    .slip-page > .cut { margin-top: auto; margin-bottom: auto; }
    .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; }
  }
</style>

<div class="sheet">
${sample ? '  <div class="stamp">Проба &middot; паролите по-долу не са издадени</div>\n' : ''}
  <div class="mast">
    <div>
      <img src="${logo}" alt="TransitFlow">
      <div class="issuer">„ДАВИДА БГ“ ЕООД &middot; ПЛЕВЕН</div>
    </div>
    <div class="meta">
      Протокол № ${fill('4.5rem')}<br>
      Дата: ${fill('4.5rem')}<br>
      Място: ${fill('4.5rem')}
    </div>
  </div>

  <h1>Протокол за предаване на достъп до системата TransitFlow</h1>
  <p class="subtitle">Индивидуални потребителски имена и пароли за персонала на ${esc(clientName)}</p>

  <div class="preamble">
    <p>Днес, ${fill('5.5rem')}, в гр. ${fill('5.5rem')}, на основание сключения между страните
      договор за предоставяне на софтуер като услуга,</p>

    <p class="party"><strong>1.</strong> <strong>„ДАВИДА БГ“ ЕООД</strong>, ЕИК <strong>204356138</strong>,
      със седалище и адрес на управление: гр. Плевен 5802, жк. „Сторгозия“, ул. „Цар Самуил“ —
      паркинга срещу бл. 34А, представлявано от управителя ${fill('9.5rem')},
      наричано по-долу <span class="term">ДОСТАВЧИКЪТ</span>, <strong>предаде</strong>, а</p>

    <p class="party"><strong>2.</strong> <strong>${esc(clientName)}</strong>,
      ЕИК <strong>${esc(spec.company && spec.company.eik)}</strong>${spec.company && spec.company.vatNumber ? `, рег. по ЗДДС № ${esc(spec.company.vatNumber)}` : ''},
      със седалище и адрес на управление: ${esc(spec.company && spec.company.address)},
      представлявано от управителя ${fill('9.5rem')}, наричано по-долу
      <span class="term">КЛИЕНТЪТ</span>, <strong>прие</strong> достъпа до системата, както следва:</p>
  </div>

  <h2>Адрес за вход</h2>
  <p class="mono" style="font-size:.95rem; margin:0">${esc(PLATFORM_URL)}</p>
  <p style="font-size:.84rem; color:var(--ink-soft); margin:.28rem 0 0">
    Отваря се от всяко устройство с интернет. Потребителското име се въвежда изцяло.</p>

  <h2>Издадени потребители</h2>
  <table class="register">
    <tr>
      <th></th><th>Служител</th><th>Роля</th><th>Потребителско име</th><th>Подпис за получаване</th>
    </tr>
${people.map((p, i) => `    <tr>
      <td class="num">${i + 1}.</td>
      <td class="who">${esc(p.person)}</td>
      <td>${esc(ROLE_LABELS[p.role] || p.role)}</td>
      <td class="login">${esc(p.username)}</td>
      <td class="sign"></td>
    </tr>`).join('\n')}
  </table>

  <p class="note">Паролите не се вписват в този протокол. Всеки служител получава своята на
    отделен личен фиш, приложен към него, и се подписва тук, че я е получил.</p>

  <h2>Условия за ползване на достъпа</h2>
  <ol class="rules">
    <li>Достъпът е личен. Всяко действие се записва с името на потребителя, който го е извършил,
      и КЛИЕНТЪТ отговаря за действията, извършени с предадените му имена.</li>
    <li>Паролата се сменя от служителя при първото влизане, от <strong>Настройки &rarr; Моята
      парола</strong>. ДОСТАВЧИКЪТ няма достъп до паролите и не може да ги възстанови —
      забравена парола се издава наново.</li>
    <li>Паролата не се съобщава на друго лице, включително на служител на ДОСТАВЧИКА.
      Поддръжката никога не иска парола.</li>
    <li>При съмнение, че паролата е узната от друг, тя се сменя незабавно и ДОСТАВЧИКЪТ се уведомява.</li>
    <li>При напускане или промяна на длъжност КЛИЕНТЪТ уведомява ДОСТАВЧИКА, за да бъде закрит
      или променен достъпът.</li>
  </ol>

  <div class="signatures">
    <div>
      <div class="sig-role">Предал &middot; Доставчик</div>
      <div class="sig-who">„ДАВИДА БГ“ ЕООД</div>
      <div class="sig-line"></div>
      <div class="sig-cap">подпис и печат</div>
    </div>
    <div>
      <div class="sig-role">Приел &middot; Клиент</div>
      <div class="sig-who">${esc(clientName)}</div>
      <div class="sig-line"></div>
      <div class="sig-cap">подпис и печат</div>
    </div>
  </div>

${pairs(people).map(pair => `  <div class="slip-page">
${pair.map(p => slip(p, sample)).join('\n    <div class="cut">режете тук</div>\n')}
  </div>`).join('\n')}

</div>
`;

// ─────────────────────────────────────────────────────────────────────────────

const run = async () => {
    console.log(`\n${apply ? 'ЗАПИС' : 'ПРОБА (нищо не се променя)'} — проект ${PROJECT_ID}\n`);
    console.log(`Фирма: ${spec.name}  [${spec.tenantId}]\n`);

    admin.initializeApp({ projectId: PROJECT_ID });
    const auth = admin.auth();

    const people = [];
    const problems = [];

    for (const person of spec.staff) {
        const email = emailOf(person.username);
        let record = null;
        try {
            record = await auth.getUserByEmail(email);
        } catch {
            problems.push(`${person.person} — ${email}: няма такъв акаунт`);
            continue;
        }

        // A login that belongs to another company must never be reissued from
        // here: the password would change under somebody else's staff.
        const claims = record.customClaims || {};
        if (claims.tenant && claims.tenant !== spec.tenantId) {
            problems.push(`${person.person} — ${email}: акаунтът е на друга фирма (${claims.tenant})`);
            continue;
        }

        const password = passwordFor(person.username);
        console.log(`  ${person.person} — ${email} (${ROLE_LABELS[person.role] || person.role})` +
            (password.fromEnv ? ` — парола от ${password.key}` : ' — нова парола'));

        if (apply) await auth.updateUser(record.uid, { password: password.value });

        people.push({
            ...person,
            username: email,
            password: apply ? password.value : 'XXXXXXXXXXXXXXXX',
        });
    }

    // Nothing is half-issued: a name that cannot be served stops the run before
    // a document is written, rather than printing a protocol with a hole in it.
    if (problems.length) {
        console.error('\nСпира се — тези не могат да получат парола:');
        for (const line of problems) console.error('  ' + line);
        process.exit(1);
    }

    const outDir = resolve(process.cwd(), '..', 'documents');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const stem = `Достъп-TransitFlow-${spec.tenantId}` + (apply ? '' : '-ПРОБА');
    const htmlPath = join(outDir, stem + '.html');
    const pdfPath = join(outDir, stem + '.pdf');

    writeFileSync(htmlPath, buildDocument(people, !apply), 'utf8');

    // Chrome prints it. `--no-pdf-header-footer` is what keeps the browser's own
    // URL and date off the sheet; the virtual time budget is what makes it wait
    // for the web fonts, without which the type is measured before it arrives.
    try {
        execFileSync(CHROME, [
            '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
            '--virtual-time-budget=12000',
            `--print-to-pdf=${pdfPath}`,
            'file:///' + htmlPath.replace(/\\/g, '/'),
        ], { stdio: 'ignore' });
        console.log(`\nГотово:\n  ${pdfPath}`);
    } catch {
        console.log(`\nГотово, но PDF не се получи. Отворете и разпечатайте от браузър:\n  ${htmlPath}`);
    }

    if (apply) {
        console.log('\nПаролите важат от сега. Този документ е единственото им копие —');
        console.log('никъде в системата не могат да бъдат прочетени отново.\n');
    } else {
        console.log('\nТова е проба: паролите на листа са зачертани и не са издадени.');
        console.log('Пуснете отново с --apply, за да бъдат издадени наистина.\n');
    }
};

run().catch(err => { console.error('\n' + (err && err.message ? err.message : err) + '\n'); process.exit(1); });
