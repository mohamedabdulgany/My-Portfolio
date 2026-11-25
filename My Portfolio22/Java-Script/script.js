// ==========================================================================
// 1. إعدادات الربط المستقبلي مع الـ API
// ==========================================================================
const API_CONFIG = {
    contactEndpoint: "",
    reviewsEndpoint: ""
};

// ==========================================================================
// 2. منيو الموبايل + شريط السكرول + حالة الهيدر
// ==========================================================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuIcon = document.getElementById('mobile-menu-icon');
const mobileNavLinks = Array.from(document.querySelectorAll('.mobile-nav-link'));
const siteHeader = document.getElementById('site-header');
const scrollProgress = document.getElementById('scroll-progress');

function setMobileMenu(open) {
    if (!mobileMenu || !mobileMenuBtn || !mobileMenuIcon) return;
    mobileMenu.classList.toggle('hidden', !open);
    mobileMenuBtn.setAttribute('aria-expanded', String(open));
    mobileMenuIcon.classList.toggle('fa-bars', !open);
    mobileMenuIcon.classList.toggle('fa-xmark', open);
}

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isOpen = !mobileMenu.classList.contains('hidden');
        setMobileMenu(!isOpen);
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => setMobileMenu(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
            setMobileMenu(false);
        }
    });
}

function handleScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    if (siteHeader) {
        siteHeader.classList.toggle('is-scrolled', scrollTop > 24);
    }

    if (scrollProgress) {
        const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
        scrollProgress.style.width = `${pct}%`;
    }
}

window.addEventListener('scroll', handleScrollUI, { passive: true });
document.addEventListener('DOMContentLoaded', handleScrollUI);

// ==========================================================================
// 3. تمييز رابط الناف بار النشط بـ IntersectionObserver
// ==========================================================================
const sections = Array.from(document.querySelectorAll('main section[id]'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

function setActiveNav(id) {
    if (!id) return;
    navLinks.forEach(link => {
        const isMatch = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isMatch);
        if (isMatch) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

if ('IntersectionObserver' in window && sections.length > 0) {
    const visibleMap = new Map();

    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            visibleMap.set(entry.target.id, entry.isIntersecting ? entry.boundingClientRect.top : null);
        });

        let activeId = null;
        let bestTop = Infinity;

        visibleMap.forEach((topVal, secId) => {
            if (typeof topVal === 'number') {
                const dist = Math.abs(topVal - 140);
                if (dist < bestTop) {
                    bestTop = dist;
                    activeId = secId;
                }
            }
        });

        if (activeId) {
            setActiveNav(activeId);
        } else if ((window.scrollY || 0) < 120) {
            setActiveNav('hero');
        }
    }, {
        rootMargin: '-15% 0px -45% 0px',
        threshold: 0.01
    });

    sections.forEach(sec => navObserver.observe(sec));
}
setActiveNav('hero');

// ==========================================================================
// 4. حركة GSAP آمنة (تضمن بقاء العناصر ظاهرة دائماً)
// ==========================================================================
const prefersReducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
    gsap.fromTo('.hero-content',
        { y: 18, opacity: 0.9 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', clearProps: 'transform,opacity' }
    );

    gsap.fromTo('.hero-image',
        { scale: 0.97, opacity: 0.9 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.1, clearProps: 'transform,opacity' }
    );

    const revealItems = Array.from(document.querySelectorAll('.reveal-item'));
    if ('IntersectionObserver' in window && revealItems.length > 0) {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    gsap.fromTo(entry.target,
                        { y: 16 },
                        { y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform' }
                    );
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        revealItems.forEach(item => revealObserver.observe(item));
    }
}

// ==========================================================================
// 5. تتبع حركة مؤشر الماوس
// ==========================================================================
const cursorGlow = document.getElementById('cursor-glow');
if (cursorGlow && !prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
    }, { passive: true });
}

// ==========================================================================
// 6. خلفية الجزيئات التفاعلية
// ==========================================================================
const canvas = document.getElementById('particles-canvas');
const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

let particlesArray = [];
const mouse = { x: null, y: null, radius: 130 };
let rafId = null;

function setCanvasSize() {
    if (!canvas) return;
    canvas.width = Math.max(1, window.innerWidth || 1);
    canvas.height = Math.max(1, window.innerHeight || 1);
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1.4;
        this.speedY = (Math.random() - 0.5) * 1.4;
        this.color = '#00f2fe';
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

        if (typeof mouse.x === 'number' && typeof mouse.y === 'number') {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius && distance > 0) {
                this.x -= dx / 12;
                this.y -= dy / 12;
            }
        }
    }

    draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    if (!canvas) return;
    particlesArray = [];
    const count = Math.min(85, Math.max(20, Math.floor((canvas.width * canvas.height) / 16000)));
    for (let i = 0; i < count; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    rafId = requestAnimationFrame(animateParticles);
}

if (canvas && ctx && !prefersReducedMotion) {
    setCanvasSize();
    initParticles();
    if (!rafId) animateParticles();

    window.addEventListener('resize', () => {
        setCanvasSize();
        initParticles();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });
}

// ==========================================================================
// 7. الكتابة المتحركة
// ==========================================================================
const words = ['Frontend Development', 'UI/UX Design'];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimerId = null;
const typingElement = document.getElementById('typing-text');

function typeEffect() {
    if (!typingElement) return;
    const currentWord = words[wordIndex] || '';

    if (isDeleting) {
        typingElement.textContent = currentWord.substring(0, Math.max(0, charIndex - 1));
        charIndex = Math.max(0, charIndex - 1);
    } else {
        typingElement.textContent = currentWord.substring(0, Math.min(currentWord.length, charIndex + 1));
        charIndex = Math.min(currentWord.length, charIndex + 1);
    }

    let speed = isDeleting ? 45 : 85;

    if (!isDeleting && charIndex === currentWord.length) {
        speed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        speed = 400;
    }

    if (typingTimerId) clearTimeout(typingTimerId);
    typingTimerId = setTimeout(typeEffect, speed);
}
document.addEventListener('DOMContentLoaded', typeEffect);

// ==========================================================================
// 8. تأثير 3D للبطاقات (للأجهزة اللي بتدعم Hover)
// ==========================================================================
const supportsHover = Boolean(window.matchMedia && window.matchMedia('(hover: hover)').matches);
const tiltCards = Array.from(document.querySelectorAll('.tilt-card'));

if (supportsHover && !prefersReducedMotion) {
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = (y - rect.height / 2) / 12;
            const rotateY = (rect.width / 2 - x) / 12;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
}

// ==========================================================================
// 9. فلترة المشاريع
// ==========================================================================
const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
const projectItems = Array.from(document.querySelectorAll('.project-item'));
const projectsEmpty = document.getElementById('projects-empty');

function applyProjectFilter(filterValue) {
    const targetFilter = filterValue || 'all';
    let visibleCount = 0;

    filterButtons.forEach(btn => {
        const isSelected = btn.getAttribute('data-filter') === targetFilter;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-pressed', String(isSelected));
    });

    projectItems.forEach(item => {
        const rawCats = (item.getAttribute('data-category') || '').toLowerCase();
        const cats = rawCats.split(/\s+/).filter(Boolean);
        const matches = targetFilter === 'all' || cats.includes(targetFilter);
        item.classList.toggle('hidden', !matches);
        if (matches) visibleCount += 1;
    });

    if (projectsEmpty) {
        projectsEmpty.classList.toggle('hidden', visibleCount > 0);
    }
}

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const filterVal = btn.getAttribute('data-filter');
        applyProjectFilter(filterVal);
    });
});

projectItems.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = (link.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) {
            e.preventDefault();
        }
    });
});

// ==========================================================================
// 10. التقييمات والآراء (حالة تحميل + حالة فارغة + آمن ضد XSS + جاهز للـ API)
// ==========================================================================
const reviewForm = document.getElementById('review-form');
const reviewsContainer = document.getElementById('reviews-container');
const reviewStatus = document.getElementById('review-status');
const reviewSubmitBtn = document.getElementById('review-submit-btn');
const reviewBtnText = document.getElementById('review-btn-text');
const avgRatingEl = document.getElementById('avg-rating');
const reviewsCountEl = document.getElementById('reviews-count');

const STORAGE_KEY = 'portfolio_reviews_v1';

function setReviewFeedback(message, type) {
    if (!reviewStatus) return;
    reviewStatus.textContent = message;
    reviewStatus.className = 'text-center text-sm font-semibold ' + (
        type === 'error' ? 'text-red-400' : 'text-emerald-400'
    );
}

function renderReviewsLoading() {
    if (!reviewsContainer) return;
    reviewsContainer.innerHTML = `
        <div class="p-5 rounded-2xl bg-brand-card border border-white/10 animate-pulse space-y-2">
            <div class="h-4 w-32 bg-white/10 rounded"></div>
            <div class="h-3 w-full bg-white/10 rounded"></div>
        </div>
    `;
}

function renderEmptyReviews() {
    if (!reviewsContainer) return;
    reviewsContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-brand-card border border-white/10 text-center space-y-2">
            <i class="fa-regular fa-comment-dots text-3xl text-slate-500" aria-hidden="true"></i>
            <p class="text-slate-400 text-sm">لا توجد تقييمات معروضة حالياً. كن أول من يشارك رأيه!</p>
        </div>
    `;
}

function updateReviewsSummary(reviews) {
    if (!avgRatingEl || !reviewsCountEl) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        avgRatingEl.textContent = '0.0';
        reviewsCountEl.textContent = '0';
        return;
    }

    const total = reviews.reduce((sum, item) => {
        const r = parseInt(item && item.rating, 10);
        return sum + (Number.isFinite(r) ? Math.min(5, Math.max(1, r)) : 0);
    }, 0);

    const avg = (total / reviews.length).toFixed(1);
    avgRatingEl.textContent = avg;
    reviewsCountEl.textContent = String(reviews.length);
}

function renderReviews(reviews) {
    if (!reviewsContainer) return;
    const list = Array.isArray(reviews) ? reviews : [];
    updateReviewsSummary(list);

    if (list.length === 0) {
        renderEmptyReviews();
        return;
    }

    reviewsContainer.innerHTML = '';

    list.forEach(rev => {
        if (!rev || typeof rev !== 'object') return;
        const safeRating = Math.min(5, Math.max(1, parseInt(rev.rating, 10) || 5));

        const card = document.createElement('div');
        card.className = 'p-5 rounded-2xl bg-brand-card border border-white/10 space-y-2';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center gap-2';

        const nameEl = document.createElement('h4');
        nameEl.className = 'font-bold text-brand-cyan text-sm sm:text-base';
        nameEl.textContent = String(rev.name || '');

        const starsEl = document.createElement('span');
        starsEl.className = 'text-yellow-400 text-xs sm:text-sm shrink-0';
        starsEl.textContent = '⭐'.repeat(safeRating);

        const commentEl = document.createElement('p');
        commentEl.className = 'text-slate-300 text-sm leading-relaxed';
        commentEl.textContent = String(rev.comment || '');

        header.appendChild(nameEl);
        header.appendChild(starsEl);
        card.appendChild(header);
        card.appendChild(commentEl);
        reviewsContainer.appendChild(card);
    });
}

function getLocalReviews() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function saveLocalReviews(reviews) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch (_) {}
}

async function fetchReviewsFromAPI() {
    if (!API_CONFIG.reviewsEndpoint) return null;
    const res = await fetch(API_CONFIG.reviewsEndpoint, {
        headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    const data = await res.json();
    return Array.isArray(data) ? data : (Array.isArray(data.reviews) ? data.reviews : []);
}

async function submitReviewToAPI(payload) {
    if (!API_CONFIG.reviewsEndpoint) return null;
    const res = await fetch(API_CONFIG.reviewsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit review');
    return res.json();
}

async function initReviews() {
    renderReviewsLoading();
    if (API_CONFIG.reviewsEndpoint) {
        try {
            const apiReviews = await fetchReviewsFromAPI();
            saveLocalReviews(apiReviews);
            renderReviews(apiReviews);
            return;
        } catch (_) {}
    }
    renderReviews(getLocalReviews());
}

initReviews();

if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('reviewer-name');
        const ratingInput = document.getElementById('reviewer-rating');
        const commentInput = document.getElementById('reviewer-comment');

        const name = nameInput ? nameInput.value.trim() : '';
        const rating = ratingInput ? Math.min(5, Math.max(1, parseInt(ratingInput.value, 10) || 5)) : 5;
        const comment = commentInput ? commentInput.value.trim() : '';

        if (!name || !comment) {
            setReviewFeedback('من فضلك أدخل الاسم والتعليق.', 'error');
            return;
        }

        const payload = {
            name,
            rating,
            comment,
            createdAt: new Date().toISOString()
        };

        if (reviewSubmitBtn) reviewSubmitBtn.disabled = true;
        if (reviewBtnText) reviewBtnText.textContent = 'جاري الإرسال...';

        try {
            if (API_CONFIG.reviewsEndpoint) {
                await submitReviewToAPI(payload);
                const updatedFromApi = await fetchReviewsFromAPI();
                saveLocalReviews(updatedFromApi);
                renderReviews(updatedFromApi);
            } else {
                const updatedLocal = [payload, ...getLocalReviews()];
                saveLocalReviews(updatedLocal);
                renderReviews(updatedLocal);
            }

            reviewForm.reset();
            setReviewFeedback('تم إرسال تقييمك بنجاح.', 'success');
        } catch (_) {
            setReviewFeedback('تعذر إرسال التقييم حالياً، حاول مرة أخرى.', 'error');
        } finally {
            if (reviewSubmitBtn) reviewSubmitBtn.disabled = false;
            if (reviewBtnText) reviewBtnText.textContent = 'إرسال التقييم';
        }
    });
}

// ==========================================================================
// 11. نموذج التواصل (جاهز للربط مع الـ API)
// ==========================================================================
const contactForm = document.getElementById('contact-form');
const contactSubmitBtn = document.getElementById('contact-submit-btn');
const contactBtnText = document.getElementById('contact-btn-text');
const contactStatus = document.getElementById('contact-status');

function setContactFeedback(message, type) {
    if (!contactStatus) return;
    contactStatus.textContent = message;
    contactStatus.className = 'text-center text-sm font-semibold ' + (
        type === 'error' ? 'text-red-400' : 'text-emerald-400'
    );
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendContactToAPI(payload) {
    if (!API_CONFIG.contactEndpoint) {
        return { ok: true };
    }

    const res = await fetch(API_CONFIG.contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Contact request failed');
    return res.json();
}

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!name || !email || !message) {
            setContactFeedback('من فضلك املأ جميع الحقول المطلوبة.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            setContactFeedback('من فضلك أدخل بريد إلكتروني صحيح.', 'error');
            return;
        }

        if (contactSubmitBtn) contactSubmitBtn.disabled = true;
        if (contactBtnText) contactBtnText.textContent = 'جاري الإرسال...';

        try {
            await sendContactToAPI({
                name,
                email,
                message,
                sentAt: new Date().toISOString()
            });

            contactForm.reset();
            setContactFeedback('تم تجهيز وإرسال بيانات رسالتك بنجاح.', 'success');
        } catch (_) {
            setContactFeedback('حدث خطأ أثناء الإرسال، يمكنك التواصل عبر واتساب أو البريد.', 'error');
        } finally {
            if (contactSubmitBtn) contactSubmitBtn.disabled = false;
            if (contactBtnText) contactBtnText.textContent = 'إرسال الرسالة';
        }
    });
}

// تحديث السنة
const yearEl = document.getElementById('year');
if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
}