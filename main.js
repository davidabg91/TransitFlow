document.addEventListener('DOMContentLoaded', () => {
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

    // Smooth Scrolling for Navigation Links
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
            
            btn.innerText = 'Изпращане...';
            btn.disabled = true;

            setTimeout(() => {
                alert('Благодарим Ви! Вашето запитване е изпратено успешно. Ще се свържем с Вас скоро.');
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
