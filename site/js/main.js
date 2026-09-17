// =====================================================================
//  CONTENT — edit these arrays to update the site. No other code changes needed.
// =====================================================================

const tracksData = [
    { name: "Problem Solving", icon: "fa-code", text: "C++, algorithms, and ICPC training." },
    { name: "Web Development", icon: "fa-globe", text: "Front-end, back-end, and deployment." },
    { name: "Mobile Apps", icon: "fa-mobile-screen", text: "Build and publish real apps." },
    { name: "AI & Data Science", icon: "fa-brain", text: "Python, ML, and real datasets." },
    { name: "Cyber Security", icon: "fa-shield-halved", text: "Networks, Linux, and CTFs." },
    { name: "UI/UX Design", icon: "fa-pen-ruler", text: "Research, Figma, and prototyping." },
    { name: "Embedded & IoT", icon: "fa-microchip", text: "Microcontrollers and sensors." },
    { name: "Cloud & DevOps", icon: "fa-cloud", text: "Docker, CI/CD, and the cloud." },
];

// date: YYYY-MM-DD. formLink / meetingLink are only shown while the event is upcoming.
const eventsData = [
    {
        title: "AI Generated Content Session",
        date: "2026-02-16",
        image: "img/events/ai-generated-content.webp",
        description: "Learn how to leverage AI tools to create stunning content in seconds.",
        formLink: "",
        meetingLink: ""
    },
    {
        title: "Intro to Cyber Security Session",
        date: "2025-12-22",
        image: "img/events/intro-cyber-security.webp",
        description: "Discover the fundamentals of cyber security and how to protect against online threats.",
        formLink: "",
        meetingLink: ""
    },
    {
        title: "Design Session",
        date: "2026-03-24",
        image: "img/events/design-journey.webp",
        description: "Master the principles of design and learn how to create visually stunning projects.",
        formLink: "",
        meetingLink: ""
    },
    {
        title: "Web Development Career Session",
        date: "2026-03-30",
        image: "img/events/web-development-career.webp",
        description: "Explore the world of web development and learn how to kickstart your career in this exciting field.",
        formLink: "",
        meetingLink: ""
    },
    {
        title: "Cloud Computing Session",
        date: "2026-04-23",
        image: "img/events/cloud-career.webp",
        description: "Dive into the world of cloud computing and learn how to leverage cloud technologies for your projects.",
        formLink: "",
        meetingLink: ""
    }
];

// Each album: cover + photos. thumb is the small version shown in the strip.
const galleryAlbums = [
    {
        title: "Member Cards",
        date: "2025",
        cover: "img/gallery/member-cards/acm-letters-thumb.webp",
        photos: [
            { src: "img/gallery/member-cards/acm-letters.webp", thumb: "img/gallery/member-cards/acm-letters-thumb.webp", caption: "ACM spelled with our members' cards" },
            { src: "img/gallery/member-cards/team-cards.webp", thumb: "img/gallery/member-cards/team-cards-thumb.webp", caption: "The ACM Sinai team" }
        ]
    },
    {
        title: "Sessions 2025 / 2026",
        date: "Dec 2025 – Apr 2026",
        cover: "img/gallery/posters/web-development-career-thumb.webp",
        photos: [
            { src: "img/gallery/posters/intro-cyber-security.webp", thumb: "img/gallery/posters/intro-cyber-security-thumb.webp", caption: "Intro to Cyber Security · Dec 2025" },
            { src: "img/gallery/posters/ai-generated-content.webp", thumb: "img/gallery/posters/ai-generated-content-thumb.webp", caption: "AI Generated Content · Feb 2026" },
            { src: "img/gallery/posters/design-journey.webp", thumb: "img/gallery/posters/design-journey-thumb.webp", caption: "Design Journey · Mar 2026" },
            { src: "img/gallery/posters/web-development-career.webp", thumb: "img/gallery/posters/web-development-career-thumb.webp", caption: "Web Development Career · Mar 2026" },
            { src: "img/gallery/posters/cloud-career.webp", thumb: "img/gallery/posters/cloud-career-thumb.webp", caption: "Navigate Your Cloud Career · Apr 2026" }
        ]
    }
];

// photo: leave "" to show initials instead.
// High Board = the chapter founders.
const highBoard = [
    { name: "Youseef Hani", role: "Founder", photo: "img/team/youseef-hani.webp" },
    { name: "Mohamed Amin", role: "Founder", photo: "img/team/mohamed-amin.webp" },
];

const facultySponsor = { name: "Prof. Ahmed Sharaf Eldeen", role: "Faculty Sponsor", photo: "img/team/ahmed-sharaf-eldeen.webp" };

const currentBoard = [
    { name: "Roqia Waael", role: "Secretary", photo: "" },
    { name: "Eslam Abdelbaky", role: "Treasurer", photo: "img/team/eslam-abdelbaky.webp" },
    { name: "Ammar Enany", role: "Head of HR", photo: "img/team/ammar-enany.webp" },
    { name: "Abdelsabour Ashraf", role: "Tech Team", photo: "img/team/abdelsabour-ashraf.webp" },
    { name: "Mohamed Amein", role: "Marketing", photo: "img/team/mohamed-amein.webp" },
    { name: "Ahmed Gomaa", role: "Media & Design", photo: "img/team/ahmed-gomaa.webp" },
    { name: "Malak Ibrahim", role: "PR", photo: "" },
];

// =====================================================================
//  RENDERING
// =====================================================================

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = name => name.replace(/^(Prof|Dr|Eng)\.\s*/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// --- MOBILE MENU ---
const openMenuBtn = document.getElementById('open-menu');
const mobileMenu = document.getElementById('mobile-menu');
const closeMenu = () => { mobileMenu.classList.add('menu-hidden'); mobileMenu.classList.remove('menu-visible'); };
openMenuBtn.addEventListener('click', e => {
    e.stopPropagation();
    mobileMenu.classList.toggle('menu-hidden');
    mobileMenu.classList.toggle('menu-visible');
});
document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', e => { if (!mobileMenu.contains(e.target) && !openMenuBtn.contains(e.target)) closeMenu(); });

// --- TRACKS ---
document.getElementById('tracks-grid').innerHTML = tracksData.map(t => `
    <div class="glass-card rounded-3xl p-5 md:p-8 hover:-translate-y-2 transition-transform">
        <div class="w-12 h-12 md:w-16 md:h-16 bg-blue-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4 md:mb-6 text-acmBlue dark:text-acmCyan text-xl md:text-3xl"><i class="fas ${t.icon}"></i></div>
        <h3 class="text-base md:text-xl font-bold text-acmTextLight dark:text-white leading-tight">${esc(t.name)}</h3>
        <p class="hidden sm:block mt-2 text-slate-600 dark:text-slate-400 text-sm font-medium">${esc(t.text)}</p>
    </div>`).join('');

// --- EVENTS ---
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = new Date(); today.setHours(0, 0, 0, 0);

function eventCard(event, isEnded) {
    const formattedDate = parseDate(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    let actions = '';
    if (!isEnded) {
        if (event.formLink) {
            actions = `<a href="${esc(event.formLink)}" target="_blank" rel="noopener" class="block w-full py-4 bg-acmBlue dark:bg-acmCyan text-white dark:text-slate-900 font-bold rounded-2xl text-center hover:shadow-xl transition-all">Register Now</a>`;
            if (event.meetingLink) actions += `<a href="${esc(event.meetingLink)}" target="_blank" rel="noopener" class="block w-full py-4 mt-3 border-2 border-acmBlue dark:border-acmCyan text-acmBlue dark:text-acmCyan font-bold rounded-2xl text-center transition-all">Join Meeting</a>`;
        } else {
            actions = `<div class="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl text-center">Registration Opens Soon</div>`;
        }
    }
    return `
    <article class="glass-card rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-300 group flex flex-col h-full border border-white/5 dark:border-slate-800">
        <div class="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-800">
            <img src="${esc(event.image)}" alt="${esc(event.title)}" width="900" height="506" class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy">
            <div class="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold shadow-md text-acmBlue dark:text-white uppercase tracking-wider">${formattedDate}</div>
            ${isEnded ? '<div class="absolute top-4 left-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Ended</div>' : ''}
        </div>
        <div class="p-8 flex-grow flex flex-col">
            <h3 class="text-xl font-bold mb-2 text-acmTextLight dark:text-white leading-tight group-hover:text-acmBlue dark:group-hover:text-acmCyan transition-colors">${esc(event.title)}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm font-medium line-clamp-2">${esc(event.description || '')}</p>
            ${actions ? `<div class="mt-auto pt-6">${actions}</div>` : ''}
        </div>
    </article>`;
}

const byDate = (a, b) => parseDate(a.date) - parseDate(b.date);
const upcoming = eventsData.filter(e => parseDate(e.date) >= today).sort(byDate);
const past = eventsData.filter(e => parseDate(e.date) < today).sort(byDate).reverse();
if (upcoming.length) {
    document.getElementById('upcoming-block').classList.remove('hidden');
    document.getElementById('upcoming-grid').innerHTML = upcoming.map(e => eventCard(e, false)).join('');
}
document.getElementById('past-grid').innerHTML = past.map(e => eventCard(e, true)).join('');

// --- TEAM ---
function avatar(member, sizeClasses, ring) {
    if (member.photo) {
        return `<img src="${esc(member.photo)}" alt="${esc(member.name)}" width="160" height="160" loading="lazy" class="${sizeClasses} rounded-full object-cover ${ring}">`;
    }
    return `<div role="img" aria-label="${esc(member.name)}" class="${sizeClasses} rounded-full ${ring} grid place-items-center bg-gradient-to-br from-acmBlue to-sky-400 dark:from-sky-600 dark:to-acmCyan text-white font-black text-xl md:text-3xl">${initials(member.name)}</div>`;
}

document.getElementById('high-board').innerHTML = highBoard.map((m, i) => `
    <div class="group relative ${highBoard.length % 2 && i === highBoard.length - 1 ? 'col-span-2 md:col-span-1' : ''}">
        <div class="w-28 h-28 md:w-40 md:h-40 rounded-full p-1.5 bg-gradient-to-tr from-acmBlue to-sky-300 mx-auto mb-4 overflow-hidden shadow-xl shadow-blue-200 dark:shadow-none">
            ${avatar(m, 'w-full h-full group-hover:scale-110 transition-transform duration-500', '')}
        </div>
        <h4 class="text-sm md:text-2xl font-bold text-acmTextLight dark:text-white">${esc(m.name)}</h4>
        <p class="text-[11px] md:text-sm text-acmBlue dark:text-acmCyan font-extrabold uppercase tracking-wider mt-1">${esc(m.role)}</p>
    </div>`).join('');

document.getElementById('faculty-sponsor').innerHTML = `
    <div class="inline-flex items-center gap-4 md:gap-6 glass-card rounded-3xl px-5 py-4 md:px-8 md:py-5 text-left">
        ${avatar(facultySponsor, 'w-16 h-16 md:w-20 md:h-20', 'border-4 border-white dark:border-slate-600 shadow-md')}
        <div>
            <h4 class="font-bold text-acmTextLight dark:text-white text-base md:text-xl">${esc(facultySponsor.name)}</h4>
            <p class="text-[11px] md:text-sm text-acmBlue dark:text-acmCyan font-extrabold uppercase tracking-wider mt-1">${esc(facultySponsor.role)}</p>
        </div>
    </div>`;

document.getElementById('current-board').innerHTML = currentBoard.map((m, i) => {
    const lastOdd = currentBoard.length % 2 && i === currentBoard.length - 1;
    return `
    <div class="${lastOdd ? 'col-span-2 w-1/2 mx-auto md:col-span-1' : 'w-full'} md:w-56 p-4 md:p-6 glass-card rounded-3xl hover:-translate-y-2 transition-transform">
        <div class="mb-3 md:mb-5">${avatar(m, 'w-16 h-16 md:w-24 md:h-24 mx-auto', 'border-4 border-white dark:border-slate-600 shadow-md')}</div>
        <h4 class="font-bold text-acmTextLight dark:text-white text-sm md:text-lg">${esc(m.name)}</h4>
        <p class="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">${esc(m.role)}</p>
    </div>`;
}).join('');

// --- GALLERY ---
document.getElementById('gallery-grid').innerHTML = galleryAlbums.map((a, i) => `
    <button type="button" data-album="${i}" class="album-card text-left glass-card rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-acmCyan">
        <div class="relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800">
            <img src="${esc(a.cover)}" alt="${esc(a.title)}" width="480" height="360" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent"></div>
            <div class="absolute bottom-4 left-4 flex items-center gap-2 text-white text-sm font-bold bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-lg"><i class="fas fa-images"></i> ${a.photos.length} photos</div>
        </div>
        <div class="p-6">
            <h3 class="text-xl font-bold text-acmTextLight dark:text-white group-hover:text-acmBlue dark:group-hover:text-acmCyan transition-colors">${esc(a.title)}</h3>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">${esc(a.date)}</p>
        </div>
    </button>`).join('');

const lb = {
    root: document.getElementById('lightbox'),
    img: document.getElementById('lb-image'),
    title: document.getElementById('lb-title'),
    counter: document.getElementById('lb-counter'),
    caption: document.getElementById('lb-caption'),
    thumbs: document.getElementById('lb-thumbs'),
    album: null, index: 0, lastFocus: null,
};

function lbShow(index) {
    const photos = lb.album.photos;
    lb.index = (index + photos.length) % photos.length;
    const p = photos[lb.index];
    lb.img.style.opacity = 0;
    lb.img.onload = () => { lb.img.style.opacity = 1; };
    lb.img.src = p.src;
    lb.img.alt = p.caption || lb.album.title;
    lb.caption.textContent = p.caption || '';
    lb.counter.textContent = `${lb.index + 1} / ${photos.length}`;
    lb.thumbs.querySelectorAll('button').forEach((b, i) => {
        b.classList.toggle('ring-4', i === lb.index);
        b.classList.toggle('opacity-50', i !== lb.index);
        if (i === lb.index) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    // preload neighbours
    [lb.index + 1, lb.index - 1].forEach(i => { const n = photos[(i + photos.length) % photos.length]; new Image().src = n.src; });
}

function lbOpen(albumIndex) {
    lb.album = galleryAlbums[albumIndex];
    lb.lastFocus = document.activeElement;
    lb.title.textContent = lb.album.title;
    lb.thumbs.innerHTML = lb.album.photos.map((p, i) => `
        <button type="button" data-i="${i}" aria-label="Photo ${i + 1}" class="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden ring-acmCyan transition-opacity">
            <img src="${esc(p.thumb || p.src)}" alt="" class="w-full h-full object-cover" loading="lazy">
        </button>`).join('');
    const single = lb.album.photos.length < 2;
    document.getElementById('lb-prev').classList.toggle('hidden', single);
    document.getElementById('lb-next').classList.toggle('hidden', single);
    lb.root.classList.remove('lb-hidden');
    document.body.classList.add('lb-open');
    lbShow(0);
    document.getElementById('lb-close').focus();
}

function lbClose() {
    lb.root.classList.add('lb-hidden');
    document.body.classList.remove('lb-open');
    lb.album = null;
    if (lb.lastFocus) lb.lastFocus.focus();
}

document.getElementById('gallery-grid').addEventListener('click', e => {
    const card = e.target.closest('.album-card');
    if (card) lbOpen(+card.dataset.album);
});
lb.thumbs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) lbShow(+b.dataset.i); });
document.getElementById('lb-close').addEventListener('click', lbClose);
document.getElementById('lb-prev').addEventListener('click', () => lbShow(lb.index - 1));
document.getElementById('lb-next').addEventListener('click', () => lbShow(lb.index + 1));
document.getElementById('lb-stage').addEventListener('click', e => { if (e.target.id === 'lb-stage') lbClose(); });
document.addEventListener('keydown', e => {
    if (!lb.album) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowRight') lbShow(lb.index + 1);
    else if (e.key === 'ArrowLeft') lbShow(lb.index - 1);
});
let touchX = null;
lb.img.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lb.img.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) lbShow(lb.index + (dx < 0 ? 1 : -1));
    touchX = null;
});

// --- DARK MODE ---
const darkIcon = document.getElementById('theme-toggle-dark-icon');
const lightIcon = document.getElementById('theme-toggle-light-icon');
function updateThemeIcons() {
    const dark = document.documentElement.classList.contains('dark');
    darkIcon.classList.toggle('hidden', dark);
    lightIcon.classList.toggle('hidden', !dark);
}
updateThemeIcons();
let updateThreeJSTheme = () => {};
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    updateThemeIcons();
    updateThreeJSTheme();
}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

// --- SCROLL PROGRESS ---
const progressBar = document.getElementById('progress-bar');
window.addEventListener('scroll', () => {
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    progressBar.style.width = (document.documentElement.scrollTop / height) * 100 + '%';
}, { passive: true });

// --- THREE.JS BACKGROUND (desktop only, loaded after the page) ---
const wantsThree = window.matchMedia('(min-width: 768px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (wantsThree) {
    window.addEventListener('load', () => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
        s.onload = startThree;
        document.head.appendChild(s);
    });
}

function startThree() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
    const dotTexture = new THREE.CanvasTexture(canvas);

    const sphereGeo = new THREE.BufferGeometry();
    const count = 1500; const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
        const r = 7 + (Math.random() - 0.5); const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
        positions[i] = r * Math.sin(phi) * Math.cos(theta); positions[i + 1] = r * Math.sin(phi) * Math.sin(theta); positions[i + 2] = r * Math.cos(phi);
    }
    sphereGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sphereMat = new THREE.PointsMaterial({ size: 0.1, map: dotTexture, transparent: true, opacity: 0.8, color: 0x005596, depthWrite: false, blending: THREE.NormalBlending });
    const sphere = new THREE.Points(sphereGeo, sphereMat); scene.add(sphere);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000; const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 80;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.15, map: dotTexture, transparent: true, opacity: 0.4, color: 0x64748b, depthWrite: false });
    const stars = new THREE.Points(starGeo, starMat); scene.add(stars);
    camera.position.z = 15;

    updateThreeJSTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            sphereMat.blending = THREE.AdditiveBlending; sphereMat.color.setHex(0x00d4ff);
            starMat.color.setHex(0xffffff); starMat.opacity = 0.3;
            scene.fog = new THREE.FogExp2(0x0f172a, 0.003);
        } else {
            sphereMat.blending = THREE.NormalBlending; sphereMat.color.setHex(0x005596);
            starMat.color.setHex(0x005596); starMat.opacity = 0.8;
            scene.fog = new THREE.FogExp2(0xe0f2fe, 0.002);
        }
        sphereMat.needsUpdate = true; starMat.needsUpdate = true;
    };
    updateThreeJSTheme();

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => { mouseX = (e.clientX / window.innerWidth) * 2 - 1; mouseY = -(e.clientY / window.innerHeight) * 2 + 1; });
    const clock = new THREE.Clock();
    (function animate() {
        const t = clock.getElapsedTime();
        sphere.rotation.y = t * 0.1 + mouseX * 0.05; sphere.rotation.x = t * 0.02 + mouseY * 0.05;
        stars.rotation.y = -t * 0.02;
        renderer.render(scene, camera); requestAnimationFrame(animate);
    })();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}
