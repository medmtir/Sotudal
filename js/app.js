/* ============================================
   SOTUDAL - Main Application JavaScript
   3D Liquid Motion + Scroll Animations
   ============================================ */

// ============ LOADER ============
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.classList.add('hidden');
        document.body.style.overflow = 'auto';
        initAnimations();
    }, 2200);
});

// ============ THREE.JS LIQUID BACKGROUND ============
(function initLiquidBackground() {
    const canvas = document.getElementById('liquid-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Liquid Shader Material
    const liquidShader = {
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uScroll: { value: 0 },
            uColor1: { value: new THREE.Color(0x0d1b2a) },
            uColor2: { value: new THREE.Color(0x1b2838) },
            uColor3: { value: new THREE.Color(0x2c3e50) },
            uAccent: { value: new THREE.Color(0x8a9bae) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform float uTime;
            uniform vec2 uMouse;
            uniform vec2 uResolution;
            uniform float uScroll;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform vec3 uAccent;
            
            varying vec2 vUv;
            
            // Simplex noise functions
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                i = mod289(i);
                vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            // FBM (Fractal Brownian Motion)
            float fbm(vec3 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                for(int i = 0; i < 5; i++) {
                    value += amplitude * snoise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value;
            }
            
            void main() {
                vec2 uv = vUv;
                float aspect = uResolution.x / uResolution.y;
                vec2 p = uv * 2.0 - 1.0;
                p.x *= aspect;
                
                float time = uTime * 0.15;
                float scroll = uScroll * 0.001;
                
                // Mouse interaction
                vec2 mouseEffect = (uMouse - 0.5) * 0.3;
                
                // Create liquid flow
                float n1 = fbm(vec3(p * 1.5 + mouseEffect, time));
                float n2 = fbm(vec3(p * 2.0 + vec2(n1 * 0.5), time * 0.7 + scroll));
                float n3 = fbm(vec3(p * 3.0 + vec2(n2 * 0.3), time * 0.5 - scroll * 0.5));
                
                // Liquid distortion
                float liquid = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
                liquid = liquid * 0.5 + 0.5;
                
                // Create metallic liquid look
                vec3 color = mix(uColor1, uColor2, liquid);
                color = mix(color, uColor3, n2 * 0.5 + 0.5);
                
                // Add subtle metallic highlights
                float highlight = pow(max(0.0, n3 * 0.5 + 0.5), 3.0);
                color += uAccent * highlight * 0.15;
                
                // Specular-like effect near mouse
                float mouseDist = length(uv - uMouse);
                float spec = exp(-mouseDist * 4.0) * 0.08;
                color += vec3(spec);
                
                // Vignette
                float vignette = 1.0 - length(uv - 0.5) * 0.8;
                vignette = smoothstep(0.0, 1.0, vignette);
                color *= vignette;
                
                // Add subtle grain
                float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
                color += grain;
                
                gl_FragColor = vec4(color, 0.85);
            }
        `
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial(liquidShader);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    let mouseX = 0.5, mouseY = 0.5;
    let targetMouseX = 0.5, targetMouseY = 0.5;

    document.addEventListener('mousemove', (e) => {
        targetMouseX = e.clientX / window.innerWidth;
        targetMouseY = 1.0 - e.clientY / window.innerHeight;
    });

    // Scroll tracking
    let scrollY = 0;
    window.addEventListener('scroll', () => {
        scrollY = window.pageYOffset;
    });

    // Resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Smooth mouse lerp
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        material.uniforms.uTime.value = performance.now() * 0.001;
        material.uniforms.uMouse.value.set(mouseX, mouseY);
        material.uniforms.uScroll.value = scrollY;

        renderer.render(scene, camera);
    }

    animate();
})();

// ============ PARTICLES ============
(function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const numParticles = 50;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.3 + 0.1;
            this.pulse = Math.random() * Math.PI * 2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.pulse += 0.02;
            
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        
        draw() {
            const opacity = this.opacity * (0.5 + 0.5 * Math.sin(this.pulse));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(138, 155, 174, ${opacity})`;
            ctx.fill();
        }
    }

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }

    // Draw connections
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 150) {
                    const opacity = (1 - dist / 150) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(138, 155, 174, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        drawConnections();
    }

    animateParticles();
})();

// ============ NAVBAR ============
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Active link tracking
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
})();

// ============ SCROLL ANIMATIONS ============
function initAnimations() {
    // GSAP ScrollTrigger animations
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // Animate elements on scroll
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    animatedElements.forEach(el => {
        const delay = parseFloat(el.dataset.delay) || 0;
        
        ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            onEnter: () => {
                setTimeout(() => {
                    el.classList.add('animated');
                }, delay * 1000);
            }
        });
    });

    // Hero animations on load
    gsap.timeline()
        .from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, delay: 2.5 })
        .from('.title-word', { opacity: 0, y: 80, duration: 1, ease: 'power3.out' }, '-=0.4')
        .from('.subtitle-main', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4')
        .from('.subtitle-en', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
        .from('.service-tag', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .from('.hero-cta .btn', { opacity: 0, y: 20, duration: 0.5, stagger: 0.15 }, '-=0.2')
        .from('.hero-scroll-indicator', { opacity: 0, duration: 0.8 }, '-=0.2');

    // Process steps 3D animation
    document.querySelectorAll('.process-step').forEach((step, index) => {
        const container = step.querySelector('.step-3d-container');
        const isReverse = container.classList.contains('reverse');
        
        gsap.from(container, {
            scrollTrigger: {
                trigger: step,
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1
            },
            opacity: 0,
            x: isReverse ? 100 : -100,
            rotateY: isReverse ? -15 : 15,
            duration: 1
        });

        // Parallax on step images
        const img = step.querySelector('.step-image img');
        if (img) {
            gsap.to(img, {
                scrollTrigger: {
                    trigger: step,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                },
                y: -30,
                ease: 'none'
            });
        }
    });

    // Service cards 3D tilt effect
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * -8;
            const rotateY = (x - centerX) / centerX * 8;
            
            card.querySelector('.card-3d-wrapper').style.transform = 
                `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.querySelector('.card-3d-wrapper').style.transform = 
                'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // Gallery items 3D tilt
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            const rotateX = (y - 0.5) * -10;
            const rotateY = (x - 0.5) * 10;
            
            item.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
        });
    });

    // Counter animation
    document.querySelectorAll('.stat-number').forEach(counter => {
        ScrollTrigger.create({
            trigger: counter,
            start: 'top 85%',
            onEnter: () => {
                const target = parseInt(counter.dataset.count);
                let current = 0;
                const increment = target / 60;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        counter.textContent = target;
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 30);
            },
            once: true
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                gsap.to(window, {
                    duration: 1,
                    scrollTo: { y: target, offsetY: 80 },
                    ease: 'power3.inOut'
                });
            }
        });
    });
}

// ============ GALLERY FILTER ============
(function initGalleryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            galleryItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.classList.remove('hidden');
                    item.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });
})();

// ============ FORM HANDLING ============
(function initForm() {
    const form = document.getElementById('devisForm');
    const success = document.getElementById('formSuccess');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Build WhatsApp message
        let message = `🏗️ *Nouvelle Demande de Devis - SOTUDAL*\n\n`;
        message += `👤 *Nom:* ${data.nom}\n`;
        message += `📱 *Téléphone:* ${data.telephone}\n`;
        if (data.email) message += `📧 *Email:* ${data.email}\n`;
        if (data.ville) message += `📍 *Ville:* ${data.ville}\n`;
        message += `🔧 *Service:* ${data.service}\n`;
        if (data.surface) message += `📐 *Surface:* ${data.surface} m²\n`;
        if (data.delai) message += `⏰ *Délai:* ${data.delai}\n`;
        if (data.message) message += `📝 *Description:* ${data.message}\n`;
        message += `\n---\nEnvoyé depuis le site web SOTUDAL`;

        // Encode and open WhatsApp
        const encoded = encodeURIComponent(message);
        const whatsappURL = `https://wa.me/21697836606?text=${encoded}`;

        // Show success message
        form.style.display = 'none';
        success.style.display = 'block';

        // Open WhatsApp in new tab
        window.open(whatsappURL, '_blank');

        // Reset after 5 seconds
        setTimeout(() => {
            form.style.display = 'flex';
            success.style.display = 'none';
            form.reset();
        }, 5000);
    });
})();

// ============ PARALLAX EFFECT ON SCROLL ============
(function initParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        // Hero parallax
        const heroContent = document.querySelector('.hero-content');
        if (heroContent && scrolled < window.innerHeight) {
            heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
            heroContent.style.opacity = 1 - scrolled / window.innerHeight;
        }

        // Floating cubes parallax
        document.querySelectorAll('.floating-cube').forEach((cube, i) => {
            const speed = (i + 1) * 0.1;
            cube.style.transform = `rotate(45deg) translateY(${scrolled * speed}px)`;
        });
    });
})();

// ============ MAGNETIC BUTTONS ============
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) translateY(-3px)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});

// ============ CURSOR GLOW EFFECT ============
(function initCursorGlow() {
    const glow = document.createElement('div');
    glow.style.cssText = `
        position: fixed;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(138,155,174,0.06) 0%, transparent 70%);
        pointer-events: none;
        z-index: 2;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });
})();

console.log('🏗️ SOTUDAL Website Loaded Successfully');
console.log('📍 Sousse, Tunisie | contact@sotudal.com');
