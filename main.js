document.addEventListener('DOMContentLoaded', () => {
    // Language Management
    const langSwitchBtn = document.querySelector('.lang-switch');
    let currentLang = localStorage.getItem('transitflow_lang');

    // Auto-detect language if not set
    if (!currentLang) {
        const languages = navigator.languages || [navigator.language || navigator.userLanguage];
        const hasBulgarian = languages.some(l => l.toLowerCase().startsWith('bg'));
        
        // Use Intl API to check for Bulgaria timezone as a fallback hint
        const isSofiaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Sofia';
        
        currentLang = (hasBulgarian || isSofiaTimezone) ? 'bg' : 'en';
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

    // Mobile Menu Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (navToggle && mobileMenu) {
        const toggleIcon = navToggle.querySelector('i');
        
        // Dynamically inject close button inside mobile menu overlay
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-menu-close';
        closeBtn.setAttribute('aria-label', 'Затвори');
        closeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
        mobileMenu.prepend(closeBtn);

        const closeMenu = () => {
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
            if (toggleIcon) toggleIcon.className = 'fas fa-bars';
        };

        navToggle.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('open');
            document.body.style.overflow = isOpen ? 'hidden' : '';
            if (toggleIcon) toggleIcon.className = isOpen ? 'fas fa-xmark' : 'fas fa-bars';
        });

        closeBtn.addEventListener('click', closeMenu);
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
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

    // Live Reference Widget Simulation
    const refValidations = document.getElementById('ref-validations');
    const refFeed = document.getElementById('ref-feed');
    if (refValidations && refFeed) {
        let count = 42851;
        const linesBg = [
            'София – Самоков',
            'Пловдив – Асеновград',
            'София – Дупница',
            'София – Боровец',
            'Хасково – Димитровград',
            'Варна – Добрич'
        ];
        const linesEn = [
            'Sofia – Samokov',
            'Plovdiv – Asenovgrad',
            'Sofia – Dupnitsa',
            'Sofia – Borovets',
            'Haskovo – Dimitrovgrad',
            'Varna – Dobrich'
        ];
        
        const updateFeed = () => {
            const isBg = document.documentElement.lang === 'bg';
            const lines = isBg ? linesBg : linesEn;
            
            // Increment counter
            const increment = Math.floor(Math.random() * 2) + 1;
            count += increment;
            refValidations.textContent = count.toLocaleString(isBg ? 'bg-BG' : 'en-US');
            
            // Generate random validation
            const isCard = Math.random() > 0.3;
            const type = isCard ? (isBg ? 'Карта' : 'Card') : (isBg ? 'Билет' : 'Ticket');
            const status = isBg ? 'Валидирана' : 'Validated';
            const statusTicket = isBg ? 'Валидиран' : 'Validated';
            const lineText = isBg ? 'Линия' : 'Line';
            const timeText = isBg ? 'Време' : 'Time';
            const nowText = isBg ? 'сега' : 'now';
            
            const num = Math.floor(Math.random() * 9000) + 1000;
            const line = lines[Math.floor(Math.random() * lines.length)];
            const time = (0.5 + Math.random() * 0.4).toFixed(1); // 0.5s to 0.9s
            
            // Create item element
            const item = document.createElement('div');
            item.className = 'feed-item';
            item.innerHTML = `
                <div class="feed-icon success"><i class="fas fa-check-circle"></i></div>
                <div class="feed-info">
                    <strong>${type} #${num} - ${isCard ? status : statusTicket}</strong>
                    <span>${lineText}: ${line} | ${timeText}: ${time}s</span>
                </div>
                <div class="feed-time">${nowText}</div>
            `;
            
            // Update timestamps of existing items
            const items = refFeed.querySelectorAll('.feed-item');
            if (items.length > 0) {
                items[0].querySelector('.feed-time').textContent = isBg ? 'преди 3с' : '3s ago';
            }
            if (items.length > 1) {
                items[1].querySelector('.feed-time').textContent = isBg ? 'преди 7с' : '7s ago';
            }
            if (items.length > 2) {
                items[2].querySelector('.feed-time').textContent = isBg ? 'преди 15с' : '15s ago';
            }
            
            // Prepend new item
            refFeed.insertBefore(item, refFeed.firstChild);
            
            // Remove last item if too many
            if (items.length >= 3) {
                refFeed.removeChild(items[items.length - 1]);
            }
        };
        
        setInterval(updateFeed, 3000);
    }
});
