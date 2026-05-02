/* Particle background + weather ambient FX */
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('bgCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.orbs = [];
        this.weatherParticles = [];
        this.currentWeather = 'clear';
        this.isGravityMode = false;
        this.baseColor = '#020617';
        this.targetColor = '#020617';
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initStars();
        this.initOrbs();
        this.raf = requestAnimationFrame(() => this.loop());
        
        // Mouse gravity well
        this.mouse = { x: -1000, y: -1000 };
        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    resize() {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setGravityMode(enabled) {
        this.isGravityMode = enabled;
        // Shift stars slightly when toggled
        this.stars.forEach(s => {
            if (enabled) s.dy += 0.5;
            else s.dy = (Math.random() - 0.5) * 0.08;
        });
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 1.5 + 0.2,
                alpha: Math.random() * 0.6 + 0.1,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.015 + 0.005,
                dx: (Math.random() - 0.5) * 0.1,
                dy: (Math.random() - 0.5) * 0.08,
                originDy: (Math.random() - 0.5) * 0.08
            });
        }
    }

    initOrbs() {
        this.orbs = [];
        const colors = ['255,204,51', '16,185,129', '124,58,237', '249,115,22'];
        for (let i = 0; i < 6; i++) {
            this.orbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: 100 + Math.random() * 150,
                alpha: 0.03 + Math.random() * 0.03,
                color: colors[i % colors.length],
                dx: (Math.random() - 0.5) * 0.4,
                dy: (Math.random() - 0.5) * 0.3
            });
        }
    }

    setWeather(code) {
        this.weatherParticles = [];
        if ([51,53,55,61,63,65,80,81,82].includes(code)) {
            this.currentWeather = 'rain';
            this.targetColor = '#0f172a'; // Deep slate
        } else if ([71,73,75,77,85,86].includes(code)) {
            this.currentWeather = 'snow';
            this.targetColor = '#1e293b'; // Slate
        } else if ([0,1].includes(code)) {
            this.currentWeather = 'clear';
            this.targetColor = '#020617'; // Rich dark
        } else {
            this.currentWeather = 'other';
            this.targetColor = '#020617';
        }
        this.spawnWeatherParticles();
    }

    spawnWeatherParticles() {
        const count = this.currentWeather === 'rain' ? 80 : this.currentWeather === 'snow' ? 50 : 0;
        for (let i = 0; i < count; i++) {
            if (this.currentWeather === 'rain') {
                this.weatherParticles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    len: 10 + Math.random() * 15,
                    speed: 8 + Math.random() * 8,
                    alpha: 0.15 + Math.random() * 0.2,
                    type: 'rain'
                });
            } else if (this.currentWeather === 'snow') {
                this.weatherParticles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    r: 2 + Math.random() * 3,
                    speed: 0.8 + Math.random() * 1.5,
                    drift: (Math.random() - 0.5) * 0.6,
                    alpha: 0.4 + Math.random() * 0.4,
                    phase: Math.random() * Math.PI * 2,
                    type: 'snow'
                });
            }
        }
    }

    drawBackground() {
        // Smoothly interpolate background color
        const lerp = (a, b, t) => a + (b - a) * t;
        // Simple hex to rgb interpolation would be better but let's keep it simple
        this.ctx.fillStyle = this.targetColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle radial vignette
        const v = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 0, this.canvas.width/2, this.canvas.height/2, this.canvas.width);
        v.addColorStop(0, 'transparent');
        v.addColorStop(1, 'rgba(0,0,0,0.4)');
        this.ctx.fillStyle = v;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loop() {
        this.drawBackground();

        // Draw orbs
        this.orbs.forEach(o => {
            const g = this.ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
            g.addColorStop(0, `rgba(${o.color},${o.alpha})`);
            g.addColorStop(1, `rgba(${o.color},0)`);
            this.ctx.beginPath();
            this.ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
            this.ctx.fillStyle = g;
            this.ctx.fill();
            
            o.x += o.dx; o.y += o.dy;
            if (o.x < -o.r) o.x = this.canvas.width + o.r;
            if (o.x > this.canvas.width + o.r) o.x = -o.r;
            if (o.y < -o.r) o.y = this.canvas.height + o.r;
            if (o.y > this.canvas.height + o.r) o.y = -o.r;
        });

        // Draw stars with Gravity and Mouse reaction
        this.stars.forEach(s => {
            s.phase += s.speed;
            const a = s.alpha * (0.6 + 0.4 * Math.sin(s.phase));
            
            // Mouse reaction (push away)
            const dist = Math.hypot(s.x - this.mouse.x, s.y - this.mouse.y);
            if (dist < 150) {
                const angle = Math.atan2(s.y - this.mouse.y, s.x - this.mouse.x);
                const force = (150 - dist) / 150;
                s.x += Math.cos(angle) * force * 2;
                s.y += Math.sin(angle) * force * 2;
            }

            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255,204,51,${a})`;
            this.ctx.fill();

            if (this.isGravityMode) {
                s.dy += 0.25; // Accelerate downwards
                if (s.y > this.canvas.height - 10) {
                    s.y = this.canvas.height - 10;
                    s.dy *= -0.4; // Bounce with dampening
                }
            } else {
                // Return to original slow drift
                if (Math.abs(s.dy - s.originDy) > 0.01) {
                    s.dy += (s.originDy - s.dy) * 0.05;
                }
            }
            
            s.x += s.dx; s.y += s.dy;
            
            if (s.x < 0) s.x = this.canvas.width;
            if (s.x > this.canvas.width) s.x = 0;
            if (s.y < 0 && !this.isGravityMode) s.y = this.canvas.height;
            if (s.y > this.canvas.height && !this.isGravityMode) s.y = 0;
        });

        // Weather particles
        this.weatherParticles.forEach(p => {
            if (p.type === 'rain') {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - 1, p.y + p.len);
                this.ctx.strokeStyle = `rgba(167,243,208,${p.alpha})`; // Emerald-ish rain
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
                p.y += p.speed;
                p.x -= 0.5;
                if (p.y > this.canvas.height) { p.y = -p.len; p.x = Math.random() * this.canvas.width; }
            } else if (p.type === 'snow') {
                p.phase += 0.02;
                p.x += Math.sin(p.phase) * p.drift;
                p.y += p.speed;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
                this.ctx.fill();
                if (p.y > this.canvas.height) { p.y = -p.r; p.x = Math.random() * this.canvas.width; }
            }
        });

        this.raf = requestAnimationFrame(() => this.loop());
    }
}

// Boot particle system
const particles = new ParticleSystem();
