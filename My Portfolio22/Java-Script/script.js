// ==========================================================================
// 1. نظام التنقل السلس بين الصفحات والأقسام من الناف بار
// ==========================================================================
function switchPage(pageId) {
    // إخفاء جميع الصفحات
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active-page');
    });

    // إزالة التنشيط من أزرار الناف بار
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // إظهار الصفحة المطلوبة وتنشيط الزر الخاص بها
    const selectedPage = document.getElementById(`page-${pageId}`);
    const selectedTab = document.getElementById(`nav-${pageId}`);

    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        selectedPage.classList.add('active-page');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // تطبيق أنيميشن دخول العناصر باستخدام GSAP
    gsap.from(`#page-${pageId} > *`, { duration: 0.6, y: 25, opacity: 0, stagger: 0.1, ease: "power2.out" });
}

// ==========================================================================
// 2. تتبع حركة مؤشر الماوس بضوء خفيف (Cursor Glow Effect)
// ==========================================================================
const cursorGlow = document.getElementById('cursor-glow');
window.addEventListener('mousemove', (e) => {
    if (cursorGlow) {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
    }
});

// ==========================================================================
// 3. خلفية الجزيئات التفاعلية الحركية (Interactive Canvas Particles)
// ==========================================================================
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

let particlesArray = [];
let mouse = { x: null, y: null, radius: 130 };

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.color = '#00f2fe';
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
            this.x -= dx / 10;
            this.y -= dy / 10;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particlesArray = [];
    const numberOfParticles = Math.floor((canvas.width * canvas.height) / 14000);
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}
initParticles();

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

// ==========================================================================
// 4. تأثير الكتابة الحية للمسميات (Typing Effect)
// ==========================================================================
const words = ["Frontend Development", "UI/UX Design", "High-Converting Websites"];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingElement = document.getElementById('typing-text');

function typeEffect() {
    if (!typingElement) return;
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
        typingElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 400;
    }

    setTimeout(typeEffect, typeSpeed);
}
document.addEventListener('DOMContentLoaded', typeEffect);

// ==========================================================================
// 5. تأثير حركة الـ 3D Tilt للبطاقات عند التحويم
// ==========================================================================
const tiltCards = document.querySelectorAll('.tilt-card');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
});

// ==========================================================================
// 6. فتح نافذة معاينة المشاريع (Project Modal Viewer)
// ==========================================================================
const projectCards = document.querySelectorAll('.project-card');
const modal = document.getElementById('project-modal');
const closeModal = document.getElementById('close-modal');

projectCards.forEach(card => {
    card.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = card.dataset.title;
        document.getElementById('modal-desc').textContent = card.dataset.desc;
        document.getElementById('modal-img').src = card.dataset.img;
        document.getElementById('modal-live').href = card.dataset.live;
        document.getElementById('modal-github').href = card.dataset.github;

        const tagsContainer = document.getElementById('modal-tags');
        tagsContainer.innerHTML = '';
        card.dataset.tags.split(',').forEach(tag => {
            const span = document.createElement('span');
            span.className = 'px-3 py-1 rounded-md bg-white/10 text-xs text-brand-cyan';
            span.textContent = tag.trim();
            tagsContainer.appendChild(span);
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
});

if (closeModal) {
    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
}

// تحديث السنة في الفوتر تلقائياً
document.getElementById('year').textContent = new Date().getFullYear();