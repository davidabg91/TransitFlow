/**
 * TransitFlow Cookie Consent System
 * GDPR / ePrivacy Directive compliant
 * 
 * Consent categories:
 *   - necessary   : always on (cannot be disabled)
 *   - analytics   : usage statistics
 *   - marketing   : retargeting / ads
 *   - preferences : language, UI preferences
 * 
 * Storage key: tf_cookie_consent (JSON)
 * Shows:  on first visit (no prior consent stored)
 * Hides:  when user accepts / rejects all / saves custom
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'tf_cookie_consent';
    const CONSENT_VERSION = '1.0';

    /* ── Helpers ───────────────────────────────────────────── */
    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Re-show if schema version changed
            if (parsed.version !== CONSENT_VERSION) return null;
            return parsed;
        } catch (e) { return null; }
    }

    /* The gtag snippet in <head> defaults every consent signal to 'denied'.
       Google only re-evaluates it when it receives an explicit 'update', so
       without this bridge analytics_storage stays denied for the whole session,
       GA4 never sets _ga cookies and the property reports no traffic at all. */
    function applyConsent(categories) {
        if (typeof window.gtag !== 'function') return;
        const yes = 'granted', no = 'denied';
        window.gtag('consent', 'update', {
            analytics_storage:       categories.analytics   ? yes : no,
            ad_storage:              categories.marketing   ? yes : no,
            ad_user_data:            categories.marketing   ? yes : no,
            ad_personalization:      categories.marketing   ? yes : no,
            functionality_storage:   categories.preferences ? yes : no,
            personalization_storage: categories.preferences ? yes : no
        });
    }

    function saveConsent(categories) {
        const payload = {
            version: CONSENT_VERSION,
            timestamp: new Date().toISOString(),
            categories
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        applyConsent(categories);
    }

    function isLang(code) {
        return (localStorage.getItem('tf_language') || 'bg') === code;
    }

    /* ── Strings ───────────────────────────────────────────── */
    const t = {
        bg: {
            title:         'Ние уважаваме Вашата поверителност',
            desc:          'Използваме бисквитки, за да подобрим Вашето преживяване, да анализираме трафика и да персонализираме съдържанието. Можете да изберете кои категории да приемете.',
            necessary:     'Необходими',
            necessaryDesc: 'Задължителни за работата на сайта. Не могат да бъдат изключени.',
            analytics:     'Аналитични',
            analyticsDesc: 'Помагат ни да разберем как се използва сайтът (Google Analytics и др.).',
            marketing:     'Маркетингови',
            marketingDesc: 'Използват се за персонализирани реклами и ремаркетинг.',
            prefs:         'Предпочитания',
            prefsDesc:     'Запазват настройки като език и тема на интерфейса.',
            acceptAll:     'Приемам всички',
            rejectAll:     'Само необходими',
            customize:     'Настрой бисквитките',
            savePrefs:     'Запази настройките',
            back:          '← Назад',
            learnMore:     'Научете повече',
            alwaysOn:      'Винаги активни',
            policy:        'Политика за бисквитки'
        },
        en: {
            title:         'We value your privacy',
            desc:          'We use cookies to improve your experience, analyse traffic, and personalise content. Choose which categories you accept.',
            necessary:     'Necessary',
            necessaryDesc: 'Required for the site to function. Cannot be disabled.',
            analytics:     'Analytics',
            analyticsDesc: 'Help us understand how the site is used (Google Analytics etc.).',
            marketing:     'Marketing',
            marketingDesc: 'Used for personalised ads and remarketing.',
            prefs:         'Preferences',
            prefsDesc:     'Store settings such as language and UI theme.',
            acceptAll:     'Accept All',
            rejectAll:     'Necessary Only',
            customize:     'Customize',
            savePrefs:     'Save Preferences',
            back:          '← Back',
            learnMore:     'Learn more',
            alwaysOn:      'Always on',
            policy:        'Cookie Policy'
        }
    };

    /* ── Build Banner HTML ─────────────────────────────────── */
    function buildBanner() {
        const lang = isLang('en') ? 'en' : 'bg';
        const s = t[lang];

        const wrap = document.createElement('div');
        wrap.id = 'tf-cookie-wrap';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-label', s.title);

        wrap.innerHTML = `
<div id="tf-cookie-overlay"></div>

<!-- ── Main Banner ── -->
<div id="tf-cookie-banner">
  <div id="tf-cookie-inner">

    <!-- Header -->
    <div id="tf-cookie-header">
      <div id="tf-cookie-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
          <path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/>
        </svg>
      </div>
      <h2 id="tf-cookie-title">${s.title}</h2>
    </div>

    <!-- Body -->
    <p id="tf-cookie-desc">${s.desc} <a href="cookies.html" id="tf-cookie-policy-link">${s.policy}</a>.</p>

    <!-- Actions -->
    <div id="tf-cookie-actions">
      <button id="tf-btn-accept-all" class="tf-btn tf-btn-primary" type="button">${s.acceptAll}</button>
      <button id="tf-btn-reject-all" class="tf-btn tf-btn-ghost" type="button">${s.rejectAll}</button>
      <button id="tf-btn-customize" class="tf-btn tf-btn-link" type="button">${s.customize}</button>
    </div>
  </div>
</div>

<!-- ── Preferences Panel ── -->
<div id="tf-cookie-panel" aria-hidden="true">
  <div id="tf-cookie-panel-inner">

    <div id="tf-panel-header">
      <button id="tf-btn-back" class="tf-btn tf-btn-link" type="button">${s.back}</button>
      <h3>${s.customize}</h3>
    </div>

    <div id="tf-categories">

      <!-- Necessary -->
      <div class="tf-category">
        <div class="tf-cat-head">
          <div class="tf-cat-info">
            <span class="tf-cat-name">${s.necessary}</span>
            <span class="tf-cat-desc">${s.necessaryDesc}</span>
          </div>
          <span class="tf-always-on">${s.alwaysOn}</span>
        </div>
      </div>

      <!-- Analytics -->
      <div class="tf-category">
        <div class="tf-cat-head">
          <div class="tf-cat-info">
            <span class="tf-cat-name">${s.analytics}</span>
            <span class="tf-cat-desc">${s.analyticsDesc}</span>
          </div>
          <label class="tf-toggle" aria-label="${s.analytics}">
            <input type="checkbox" id="tf-chk-analytics">
            <span class="tf-track"><span class="tf-thumb"></span></span>
          </label>
        </div>
      </div>

      <!-- Marketing -->
      <div class="tf-category">
        <div class="tf-cat-head">
          <div class="tf-cat-info">
            <span class="tf-cat-name">${s.marketing}</span>
            <span class="tf-cat-desc">${s.marketingDesc}</span>
          </div>
          <label class="tf-toggle" aria-label="${s.marketing}">
            <input type="checkbox" id="tf-chk-marketing">
            <span class="tf-track"><span class="tf-thumb"></span></span>
          </label>
        </div>
      </div>

      <!-- Preferences -->
      <div class="tf-category">
        <div class="tf-cat-head">
          <div class="tf-cat-info">
            <span class="tf-cat-name">${s.prefs}</span>
            <span class="tf-cat-desc">${s.prefsDesc}</span>
          </div>
          <label class="tf-toggle" aria-label="${s.prefs}">
            <input type="checkbox" id="tf-chk-prefs" checked>
            <span class="tf-track"><span class="tf-thumb"></span></span>
          </label>
        </div>
      </div>

    </div>

    <div id="tf-panel-actions">
      <button id="tf-btn-save" class="tf-btn tf-btn-primary" type="button">${s.savePrefs}</button>
    </div>

  </div>
</div>
`;
        return wrap;
    }

    /* ── Styles ────────────────────────────────────────────── */
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'tf-cookie-styles';
        style.textContent = `
/* ── Cookie Consent System ─────────────────────────────── */
#tf-cookie-wrap * { box-sizing: border-box; }

#tf-cookie-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 99997;
    opacity: 0;
    transition: opacity 0.3s ease;
}

#tf-cookie-overlay.visible { display: block; opacity: 1; }

/* ── Banner (bottom bar) ─ */
#tf-cookie-banner {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(120%);
    z-index: 99998;
    width: min(760px, calc(100vw - 32px));
    border-radius: 20px;
    background: rgba(10, 15, 30, 0.92);
    border: 1px solid rgba(34, 211, 238, 0.18);
    box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.08),
        0 24px 60px rgba(0, 0, 0, 0.6),
        0 4px 12px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    transition: transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1),
                opacity 0.4s ease;
    opacity: 0;
}

#tf-cookie-banner.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

#tf-cookie-inner {
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

#tf-cookie-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

#tf-cookie-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(34, 211, 238, 0.12);
    border: 1px solid rgba(34, 211, 238, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #22d3ee;
    flex-shrink: 0;
}

#tf-cookie-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.1rem;
    font-weight: 800;
    color: #f8fafc;
    margin: 0;
    letter-spacing: -0.3px;
}

#tf-cookie-desc {
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    color: #94a3b8;
    line-height: 1.65;
    margin: 0;
}

#tf-cookie-policy-link {
    color: #22d3ee;
    text-decoration: underline;
    text-underline-offset: 2px;
}

#tf-cookie-policy-link:hover { color: #67e8f9; }

#tf-cookie-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

/* ── Buttons ─ */
.tf-btn {
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    border: none;
    border-radius: 10px;
    padding: 11px 22px;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.2s ease,
                background 0.2s ease;
    touch-action: manipulation;
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
}

.tf-btn:active { transform: scale(0.96) !important; }

.tf-btn-primary {
    background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%);
    color: #020617;
    font-weight: 800;
    box-shadow: 0 4px 16px rgba(34, 211, 238, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tf-btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%);
    transform: translateX(-120%);
    transition: transform 0.55s ease;
}

.tf-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(34, 211, 238, 0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
.tf-btn-primary:hover::before { transform: translateX(120%); }

.tf-btn-ghost {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.tf-btn-ghost:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(34, 211, 238, 0.3);
    color: #f8fafc;
    transform: translateY(-1px);
}

.tf-btn-link {
    background: transparent;
    color: #64748b;
    padding: 11px 14px;
    font-weight: 600;
}

.tf-btn-link:hover { color: #22d3ee; }

/* ── Preferences Panel ─ */
#tf-cookie-panel {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
}

#tf-cookie-panel.visible {
    pointer-events: all;
    opacity: 1;
}

#tf-cookie-panel-inner {
    width: min(560px, 100%);
    border-radius: 22px;
    background: rgba(10, 15, 30, 0.97);
    border: 1px solid rgba(34, 211, 238, 0.2);
    box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.1),
        0 32px 80px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    padding: 30px;
    transform: scale(0.95) translateY(12px);
    transition: transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
}

#tf-cookie-panel.visible #tf-cookie-panel-inner {
    transform: scale(1) translateY(0);
}

#tf-panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
}

#tf-panel-header h3 {
    font-family: 'Outfit', sans-serif;
    font-size: 1.05rem;
    font-weight: 800;
    color: #f8fafc;
    margin: 0;
    flex: 1;
    letter-spacing: -0.3px;
}

#tf-categories {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
}

.tf-category {
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    padding: 16px 18px;
    transition: border-color 0.2s ease;
}

.tf-category:hover { border-color: rgba(34, 211, 238, 0.15); }

.tf-cat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.tf-cat-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
}

.tf-cat-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: #f1f5f9;
}

.tf-cat-desc {
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    color: #64748b;
    line-height: 1.5;
}

.tf-always-on {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #22d3ee;
    background: rgba(34, 211, 238, 0.1);
    border: 1px solid rgba(34, 211, 238, 0.2);
    border-radius: 50px;
    padding: 3px 10px;
    white-space: nowrap;
    flex-shrink: 0;
}

/* Toggle Switch */
.tf-toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
    cursor: pointer;
}

.tf-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }

.tf-track {
    position: absolute;
    inset: 0;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition: background 0.25s ease, border-color 0.25s ease,
                box-shadow 0.25s ease;
}

.tf-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #64748b;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                background 0.2s ease;
}

.tf-toggle input:checked + .tf-track {
    background: rgba(34, 211, 238, 0.2);
    border-color: rgba(34, 211, 238, 0.4);
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.25);
}

.tf-toggle input:checked + .tf-track .tf-thumb {
    transform: translateX(20px);
    background: #22d3ee;
    box-shadow: 0 0 8px rgba(34, 211, 238, 0.5);
}

.tf-toggle input:focus-visible + .tf-track {
    outline: 2px solid rgba(34, 211, 238, 0.7);
    outline-offset: 2px;
}

#tf-panel-actions { display: flex; justify-content: flex-end; }
#tf-btn-save { min-width: 160px; }

/* ── Exit animation ─ */
#tf-cookie-wrap.hiding #tf-cookie-banner {
    transform: translateX(-50%) translateY(120%);
    opacity: 0;
}

/* ── Mobile ─ */
@media (max-width: 600px) {
    #tf-cookie-inner { padding: 22px 20px; gap: 14px; }
    #tf-cookie-actions { flex-direction: column; align-items: stretch; }
    .tf-btn-primary, .tf-btn-ghost { text-align: center; }
    #tf-cookie-panel { padding: 12px; align-items: flex-end; }
    #tf-cookie-panel-inner { border-radius: 18px 18px 0 0; }
}

@media (prefers-reduced-motion: reduce) {
    #tf-cookie-banner, #tf-cookie-panel, #tf-cookie-panel-inner,
    .tf-btn, .tf-track, .tf-thumb, .tf-btn-primary::before {
        transition: none !important;
        animation: none !important;
    }
}
`;
        document.head.appendChild(style);
    }

    /* ── Logic ─────────────────────────────────────────────── */
    function hideBanner(wrap) {
        wrap.classList.add('hiding');
        setTimeout(() => { wrap.remove(); }, 500);
    }

    function showPanel(wrap) {
        const overlay = wrap.querySelector('#tf-cookie-overlay');
        const banner  = wrap.querySelector('#tf-cookie-banner');
        const panel   = wrap.querySelector('#tf-cookie-panel');

        banner.classList.remove('visible');
        overlay.classList.add('visible');
        panel.classList.add('visible');
        panel.setAttribute('aria-hidden', 'false');
        panel.querySelector('button').focus();
    }

    function closePanel(wrap) {
        const banner = wrap.querySelector('#tf-cookie-banner');
        const panel  = wrap.querySelector('#tf-cookie-panel');

        panel.classList.remove('visible');
        panel.setAttribute('aria-hidden', 'true');
        banner.classList.add('visible');
        banner.querySelector('button').focus();
    }

    function acceptAll(wrap) {
        saveConsent({ necessary: true, analytics: true, marketing: true, preferences: true });
        hideBanner(wrap);
    }

    function rejectAll(wrap) {
        saveConsent({ necessary: true, analytics: false, marketing: false, preferences: false });
        hideBanner(wrap);
    }

    function saveCustom(wrap) {
        saveConsent({
            necessary:   true,
            analytics:   wrap.querySelector('#tf-chk-analytics').checked,
            marketing:   wrap.querySelector('#tf-chk-marketing').checked,
            preferences: wrap.querySelector('#tf-chk-prefs').checked
        });
        hideBanner(wrap);
    }

    function bindEvents(wrap) {
        wrap.querySelector('#tf-btn-accept-all').addEventListener('click', () => acceptAll(wrap));
        wrap.querySelector('#tf-btn-reject-all').addEventListener('click', () => rejectAll(wrap));
        wrap.querySelector('#tf-btn-customize').addEventListener('click', () => showPanel(wrap));
        wrap.querySelector('#tf-btn-back').addEventListener('click', () => closePanel(wrap));
        wrap.querySelector('#tf-btn-save').addEventListener('click', () => saveCustom(wrap));

        // Keyboard trap inside panel
        wrap.querySelector('#tf-cookie-panel').addEventListener('keydown', function(e) {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(this.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled);
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }

    /* ── Init ──────────────────────────────────────────────── */

    // Replay stored consent to gtag as early as this script runs, rather than
    // waiting for DOMContentLoaded. Consent lives in localStorage but gtag
    // restarts every page load at 'denied', so returning visitors who already
    // accepted would otherwise go unmeasured -- and the earlier the update
    // lands, the less of the visit GA misses.
    const storedConsent = getConsent();
    if (storedConsent) applyConsent(storedConsent.categories);

    function init() {
        // Banner is only for visitors who have not chosen yet.
        if (storedConsent) return;

        injectStyles();
        const wrap = buildBanner();
        document.body.appendChild(wrap);

        // Animate in after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                wrap.querySelector('#tf-cookie-banner').classList.add('visible');
                wrap.querySelector('#tf-cookie-banner').setAttribute('aria-hidden', 'false');
            });
        });

        bindEvents(wrap);
    }

    // Run after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API so other scripts can read consent
    window.TFConsent = {
        get: getConsent,
        hasCategory: function(cat) {
            const c = getConsent();
            return c ? !!c.categories[cat] : false;
        },
        reset: function() {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    };

})();
