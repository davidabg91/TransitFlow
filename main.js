document.addEventListener('DOMContentLoaded', () => {
    // Language Management
    const langSwitchBtn = document.querySelector('.lang-switch');
    let currentLang = localStorage.getItem('transitflow_lang');

    // Auto-detect language if not set
    if (!currentLang) {
        const userLang = navigator.language || navigator.userLanguage || 'bg';
        currentLang = userLang.startsWith('bg') ? 'bg' : 'en';
    }

    const updateLanguage = (lang) => {
        if (!window.translations || !window.translations[lang]) {
            console.error('Translations not loaded for lang:', lang);
            return;
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = window.translations[lang][key];
            if (translation) {
                el.innerHTML = translation;
            }
        });

        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            const translation = window.translations[lang][key];
            if (translation) {
                el.placeholder = translation;
            }
        });

        // Update button text
        if (langSwitchBtn) {
            langSwitchBtn.innerHTML = lang === 'bg' ? 'BG | <span>EN</span>' : '<span>BG</span> | EN';
        }

        // Update HTML lang attribute
        document.documentElement.lang = lang;
        localStorage.setItem('transitflow_lang', lang);
        currentLang = lang; // Crucial: sync the outer variable
    };

    // Initial load
    updateLanguage(currentLang);

    // Toggle event
    if (langSwitchBtn) {
        langSwitchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newLang = currentLang === 'bg' ? 'en' : 'bg';
            updateLanguage(newLang);
        });
    }

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Intersection Observer for Reveal Animations
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Animates only once
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.15
    });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => revealObserver.observe(el));

    // Smooth Scrolling & Plan Selection for Pricing Buttons
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Auto-select plan if the button has a data-plan attribute
                const planValue = this.getAttribute('data-plan');
                if (planValue) {
                    const planSelect = document.getElementById('plan-select');
                    if (planSelect) {
                        planSelect.value = planValue;
                        
                        // Brief highlight effect
                        planSelect.style.borderColor = 'var(--primary)';
                        planSelect.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.4)';
                        setTimeout(() => {
                            planSelect.style.borderColor = '';
                            planSelect.style.boxShadow = '';
                        }, 2000);
                    }
                }
            }
        });
    });

    // Form Submission (Simulated)
    const contactForm = document.querySelector('form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            
            const waitText = (window.translations[currentLang] && window.translations[currentLang]["form-submit-wait"]) || 'Sending...';
            btn.innerText = waitText;
            btn.disabled = true;

            setTimeout(() => {
                const successMsg = (window.translations[currentLang] && window.translations[currentLang]["form-success"]) || 'Success!';
                alert(successMsg);
                contactForm.reset();
                btn.innerText = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }

    // Route Map Background Logic
    const routesContainer = document.getElementById('routes');
    if (routesContainer) {
        const createRoutes = () => {
            const count = 12;
            for (let i = 0; i < count; i++) {
                // Vertical lines
                const vLine = document.createElement('div');
                vLine.className = 'route-line route-v';
                vLine.style.left = `${(i * 100) / count}%`;
                routesContainer.appendChild(vLine);

                // Horizontal lines
                const hLine = document.createElement('div');
                hLine.className = 'route-line route-h';
                hLine.style.top = `${(i * 100) / count}%`;
                routesContainer.appendChild(hLine);
            }
        };

        const spawnSpark = () => {
            const isVertical = Math.random() > 0.5;
            const pos = Math.floor(Math.random() * 12) * (100 / 12);
            const spark = document.createElement('div');
            spark.className = 'spark';
            
            const duration = 5 + Math.random() * 10;
            spark.style.animationDuration = `${duration}s`;

            if (isVertical) {
                spark.style.left = `${pos}%`;
                spark.style.offsetPath = `path('M 0 0 L 0 ${window.innerHeight}')`;
            } else {
                spark.style.top = `${pos}%`;
                spark.style.offsetPath = `path('M 0 0 L ${window.innerWidth} 0')`;
            }

            routesContainer.appendChild(spark);
            setTimeout(() => spark.remove(), duration * 1000);
        };

        createRoutes();
        setInterval(spawnSpark, 800);
    }
});
