document.addEventListener('DOMContentLoaded', () => {
    const api = new WeatherAPI();
    const map = new MapManager('map');

    // ── DOM refs ──────────────────────────────────────────
    const searchInput    = document.getElementById('searchInput');
    const searchResults  = document.getElementById('searchResults');
    const locationBtn    = document.getElementById('locationBtn');
    const initialMsg     = document.getElementById('initialMessage');
    const weatherPanel   = document.getElementById('weatherPanel');
    const heatmapBtn     = document.getElementById('toggleHeatmapBtn');
    const radarBtn       = document.getElementById('toggleRadarBtn');
    const forecastBar    = document.getElementById('forecastBar');
    const forecastBarInner = document.getElementById('forecastBarInner');
    const gravityToggle  = document.getElementById('gravityToggle');
    const themeToggle    = document.getElementById('themeToggle');
    const soundToggle    = document.getElementById('soundToggle');
    const saveCityBtn    = document.getElementById('saveCityBtn');
    const sidebar        = document.getElementById('sidebar');
    const mapToggleBtn   = document.getElementById('mapToggleBtn');
    const mainArea       = document.querySelector('.main-area');

    // Weather display
    const locationNameEl = document.getElementById('locationName');
    const dateTimeEl     = document.getElementById('currentDateTime');
    const tempEl         = document.getElementById('currentTemp');
    const feelsEl        = document.getElementById('feelsLike');
    const descEl         = document.getElementById('weatherDesc');
    const mainIconEl     = document.getElementById('mainWeatherIcon');
    const dayBadgeEl     = document.getElementById('dayNightBadge');
    const dayLabelEl     = document.getElementById('dayNightLabel');
    const heroGlowEl     = document.getElementById('heroGlow');
    const precipEl       = document.getElementById('precipVal');
    const windEl         = document.getElementById('windVal');
    const humEl          = document.getElementById('humidityVal');
    const pressureEl     = document.getElementById('pressureVal');
    const visEl          = document.getElementById('visibilityVal');
    const uvEl           = document.getElementById('uvVal');
    const uvNumEl        = document.getElementById('uvNum');
    const aqiEl          = document.getElementById('aqiVal');
    const aqiIcoEl       = document.getElementById('aqiIco');
    const clothAdviceEl  = document.getElementById('clothAdvice');
    const clothIconEl    = document.getElementById('clothIcon');
    const alertsEl       = document.getElementById('alertsContainer');
    const dnaPillsEl     = document.getElementById('dnaPills');
    const windDirEl      = document.getElementById('windDirLabel');
    const gustEl         = document.getElementById('gustLabel');
    const sunriseEl      = document.getElementById('sunriseLabel');
    const sunsetEl       = document.getElementById('sunsetLabel');
    const moonNameEl     = document.getElementById('moonPhaseName');
    const moonIllumEl    = document.getElementById('moonIllum');

    let heatmapOn       = true;
    let radarOn         = false;
    let heatPoints      = [];
    let forecastChart   = null;
    let dailyData       = null;
    let hourlyData      = null;
    let activeTab       = 'temp';
    let isSoundOn       = false;
    let currentAudio    = null;
    let useImperial     = false;
    let lastLat         = null;
    let lastLon         = null;
    let lastCityName    = null;

    // ── Temperature-Based Themes ──────────────────────────
    function updateDynamicTheme(temp) {
        let hue = 220; // Default blue
        if (temp >= 35)      hue = 15;  // Red-Orange
        else if (temp >= 28) hue = 35;  // Orange
        else if (temp >= 15) hue = 160; // Teal/Green
        else if (temp < 5)   hue = 200; // Ice Blue
        
        document.documentElement.style.setProperty('--primary', `hsl(${hue}, 100%, 60%)`);
        document.documentElement.style.setProperty('--primary-dim', `hsla(${hue}, 100%, 60%, 0.2)`);
    }

    // ── Theme Toggle ─────────────────────────────────────
    themeToggle.addEventListener('change', () => {
        const isLight = themeToggle.checked;
        if (isLight) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        map.setTheme(isLight);
    });

    // ── Gravity Toggle ───────────────────────────────────
    gravityToggle.addEventListener('change', () => {
        const isGravity = gravityToggle.checked;
        if (isGravity) {
            document.body.classList.add('gravity-on');
        } else {
            document.body.classList.remove('gravity-on');
        }
        if (typeof particles !== 'undefined') particles.setGravityMode(isGravity);
    });

    // ── 3D Tilt on hover ─────────────────────────────────
    function initTilt(el) {
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width  - 0.5;
            const y = (e.clientY - r.top)  / r.height - 0.5;
            el.style.transform = `perspective(900px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg) translateZ(12px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
        });
    }

    document.querySelectorAll('.tilt-card').forEach(initTilt);

    // ── Clock ─────────────────────────────────────────────
    function updateClock(tz) {
        const opts = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        };
        if (tz) opts.timeZone = tz;
        
        try {
            dateTimeEl.textContent = new Intl.DateTimeFormat('en-US', opts).format(new Date());
        } catch (e) {
            delete opts.timeZone;
            dateTimeEl.textContent = new Intl.DateTimeFormat('en-US', opts).format(new Date());
        }
    }
    updateClock(); // Initial call
    setInterval(() => updateClock(), 1000); // Update every second for better feel

    // ── UV Gauge (half-circle) ────────────────────────────
    function drawUVGauge(val) {
        const c = document.getElementById('uvGaugeCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const cx = c.width / 2, cy = c.height - 3, r = c.height - 7;
        ctx.clearRect(0, 0, c.width, c.height);
        // Track
        ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.stroke();
        // Fill
        const color = val >= 8 ? '#f43f5e' : val >= 6 ? '#f97316' : val >= 3 ? '#facc15' : '#10b981';
        const end = Math.PI + Math.min(val, 11) / 11 * Math.PI;
        ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, end);
        ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
        if (uvNumEl) uvNumEl.style.color = color;
    }

    // ── Compass ───────────────────────────────────────────
    function drawCompass(deg) {
        const c = document.getElementById('compassCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const cx = c.width / 2, cy = c.height / 2, r = 50;
        ctx.clearRect(0, 0, c.width, c.height);

        // Background circle
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,204,51,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();

        // Tick marks
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const len = i % 3 === 0 ? 8 : 4;
            ctx.beginPath();
            ctx.moveTo(cx + (r - len) * Math.cos(a), cy + (r - len) * Math.sin(a));
            ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,204,51,0.6)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = i % 3 === 0 ? 2 : 1;
            ctx.stroke();
        }

        // Cardinals
        [['N',0],['E',90],['S',180],['W',270]].forEach(([l, a]) => {
            const rad = (a - 90) * Math.PI / 180;
            const x = cx + (r - 14) * Math.cos(rad);
            const y = cy + (r - 14) * Math.sin(rad);
            ctx.font = `bold 9px Inter`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = l === 'N' ? '#ffcc33' : 'rgba(255,255,255,0.45)';
            ctx.fillText(l, x, y);
        });

        // Needle
        const rad = (deg - 90) * Math.PI / 180;
        const tipX  = cx + (r - 18) * Math.cos(rad);
        const tipY  = cy + (r - 18) * Math.sin(rad);
        const tailX = cx - 14 * Math.cos(rad);
        const tailY = cy - 14 * Math.sin(rad);
        const pw = 5, pr = rad + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(cx + pw * Math.cos(pr), cy + pw * Math.sin(pr));
        ctx.lineTo(tailX, tailY);
        ctx.lineTo(cx - pw * Math.cos(pr), cy - pw * Math.sin(pr));
        ctx.closePath();
        const ng = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
        ng.addColorStop(0, '#334155'); ng.addColorStop(1, '#ffcc33');
        ctx.fillStyle = ng; ctx.fill();

        // Center dot
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc33'; ctx.fill();
    }

    // ── Sun Arc ───────────────────────────────────────────
    function drawSunArc(sunriseStr, sunsetStr, tz) {
        const c = document.getElementById('sunArcCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height;
        const cx = w / 2, cy = h + 4, r = h - 8;
        ctx.clearRect(0, 0, w, h);

        // Arc track
        ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();

        // Parse times
        const now      = new Date();
        const toMin    = s => { const d = new Date(s); return d.getHours() * 60 + d.getMinutes(); };
        const srMin    = toMin(sunriseStr);
        const ssMin    = toMin(sunsetStr);
        const nowMin   = now.getHours() * 60 + now.getMinutes();
        const progress = Math.max(0, Math.min(1, (nowMin - srMin) / (ssMin - srMin)));

        // Gradient arc
        const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        grad.addColorStop(0, 'rgba(255,204,51,0.25)');
        grad.addColorStop(0.5, 'rgba(249,115,22,0.6)');
        grad.addColorStop(1, 'rgba(255,204,51,0.25)');
        ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.strokeStyle = grad; ctx.lineCap = 'round'; ctx.stroke();

        // Sun dot
        const sunRad = Math.PI + progress * Math.PI;
        const sx = cx + r * Math.cos(sunRad);
        const sy = cy + r * Math.sin(sunRad);
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
        sg.addColorStop(0, '#fff'); sg.addColorStop(1, '#ffcc33');
        ctx.fillStyle = sg; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,204,51,0.2)'; ctx.fill();
    }

    // ── Moon Phase Canvas ─────────────────────────────────
    function drawMoon(phase) {
        const c = document.getElementById('moonCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const cx = c.width / 2, cy = c.height / 2, r = 30;
        ctx.clearRect(0, 0, c.width, c.height);

        // Full circle (dark)
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();

        // Illuminated portion
        const cycle = 29.53;
        const waxing = phase < cycle / 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2);
        ctx.fillStyle = '#fffbeb'; ctx.fill();

        const factor = Math.abs(1 - (phase / (cycle / 2)));
        const ex = cx + (waxing ? -1 : 1) * r * (1 - factor * 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(r * factor), r, 0, 0, Math.PI * 2);
        ctx.fillStyle = waxing ? '#0f172a' : '#fffbeb';
        ctx.fill();
        ctx.restore();

        // Glow
        const glowG = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.5);
        glowG.addColorStop(0, 'rgba(255,204,51,0.1)');
        glowG.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glowG; ctx.fill();
    }

    // ── Forecast Chart ────────────────────────────────────
    function getChartData(type) {
        if (!dailyData && !hourlyData) return null;

        if (type === 'hourly' && hourlyData) {
            const now    = new Date();
            const nowH   = now.getHours();
            const times  = hourlyData.time.slice(nowH, nowH + 24);
            const temps  = hourlyData.temperature_2m.slice(nowH, nowH + 24);
            const labels = times.map((_, i) => `${(nowH + i) % 24}:00`);
            return {
                labels,
                datasets: [{
                    label: 'Temp °C', data: temps,
                    borderColor: '#ffcc33',
                    backgroundColor: 'rgba(255,204,51,0.1)',
                    tension: 0.4, fill: true,
                    pointRadius: 3, pointBackgroundColor: '#ffcc33', pointHoverRadius: 7
                }]
            };
        }

        const labels = dailyData.time.slice(0,7).map((d,i) => {
            return i === 0 ? 'Today' : new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(new Date(d));
        });

        if (type === 'temp') return {
            labels,
            datasets: [
                { label:'Max °C', data: dailyData.temperature_2m_max.slice(0,7).map(Math.round),
                  borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.12)',
                  tension:0.45, fill:true, pointBackgroundColor:'#f97316', pointRadius:4, pointHoverRadius:8 },
                { label:'Min °C', data: dailyData.temperature_2m_min.slice(0,7).map(Math.round),
                  borderColor:'#ffcc33', backgroundColor:'rgba(255,204,51,0.08)',
                  tension:0.45, fill:true, pointBackgroundColor:'#ffcc33', pointRadius:4, pointHoverRadius:8 }
            ]
        };

        if (type === 'rain') return {
            labels,
            datasets: [{ label:'Rain mm', data: dailyData.precipitation_sum.slice(0,7).map(v=>+(v||0).toFixed(1)),
                borderColor:'#818cf8', backgroundColor:'rgba(129,140,248,0.18)',
                tension:0.35, fill:true, pointBackgroundColor:'#818cf8', pointRadius:4, pointHoverRadius:8 }]
        };

        if (type === 'uv') return {
            labels,
            datasets: [{ label:'UV Index', data: dailyData.uv_index_max.slice(0,7).map(v=>+(v||0).toFixed(1)),
                borderColor:'#ffcc33', backgroundColor:'rgba(255,204,51,0.12)',
                tension:0.35, fill:true, pointBackgroundColor:'#ffcc33', pointRadius:4, pointHoverRadius:8 }]
        };
        return null;
    }

    function renderChart(type) {
        const canvas = document.getElementById('forecastChart');
        if (!canvas) return;
        const data = getChartData(type);
        if (!data) return;

        if (forecastChart) { forecastChart.destroy(); forecastChart = null; }

        forecastChart = new Chart(canvas, {
            type: 'line',
            data,
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode:'index', intersect:false },
                plugins: {
                    legend: { labels: { color:'rgba(255,255,255,0.5)', font:{family:'Inter',size:10}, boxWidth:10, padding:10 } },
                    tooltip: {
                        backgroundColor:'rgba(2,6,23,0.95)', borderColor:'rgba(255,204,51,0.2)', borderWidth:1,
                        titleColor:'#f8fafc', bodyColor:'rgba(255,255,255,0.65)', padding:12, cornerRadius:14,
                        titleFont:{family:'Space Grotesk', weight:'700'}, bodyFont:{family:'Inter'}
                    }
                },
                scales: {
                    x: { grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'rgba(255,255,255,0.4)',font:{family:'Inter',size:10}} },
                    y: { grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'rgba(255,255,255,0.4)',font:{family:'Inter',size:10}},
                         beginAtZero: type !== 'temp' }
                }
            }
        });
    }

    // Chart tabs
    document.querySelectorAll('.ctab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.chart;
            renderChart(activeTab);
        });
    });

    // ── Main load (unified) ───────────────────────────────
    async function loadWeather(lat, lon, name) {
        // Save coords for unit toggle reload
        lastLat = lat; lastLon = lon; lastCityName = name;

        initialMsg.classList.add('hidden');
        weatherPanel.classList.remove('hidden');
        locationNameEl.textContent = name;
        tempEl.textContent = '--';

        const data = await api.getWeatherData(lat, lon, useImperial);
        if (!data) { alert('Failed to fetch weather data.'); return; }

        // Fetch AQI & Pollen in parallel
        const [aqiData] = await Promise.all([
            api.getAirQuality(lat, lon),
            updatePollen(lat, lon)
        ]);

        const cur    = data.current;
        const daily  = data.daily;
        const hourly = data.hourly;
        dailyData    = daily;
        hourlyData   = hourly;

        // Store for chatbot
        window.lastWeatherData = data;

        // Clock
        updateClock(data.timezone);

        // Map
        map.clearMarkers();
        const wi = api.getWeatherInfo(cur.weather_code);
        map.flyTo(lat, lon, 11);
        map.addMarker(lat, lon, name, Math.round(cur.temperature_2m), wi.desc);
        heatPoints.push([lat, lon, cur.temperature_2m]);
        map.updateHeatmap(heatPoints);

        // Particles weather mode
        particles.setWeather(cur.weather_code);

        // Dynamic theme
        updateDynamicTheme(cur.temperature_2m);

        // Hero card
        const unitS = useImperial ? '°F' : '°C';
        tempEl.innerHTML  = `${Math.round(cur.temperature_2m)}<span class="unit-main">${unitS}</span>`;
        feelsEl.textContent = `${Math.round(cur.apparent_temperature)} ${unitS}`;
        descEl.textContent  = wi.desc;
        mainIconEl.className = `bx ${wi.icon} w-icon-main`;
        mainIconEl.style.color = wi.color;
        mainIconEl.style.filter = `drop-shadow(0 0 20px ${wi.color}88)`;

        // Day/Night badge
        const isDay = !!cur.is_day;
        dayLabelEl.textContent = isDay ? 'Day' : 'Night';
        dayBadgeEl.querySelector('i').className = isDay ? 'bx bx-sun' : 'bx bx-moon';
        heroGlowEl.style.background = `radial-gradient(circle, ${wi.color}22 0%, transparent 70%)`;

        // Clothing Advice
        clothAdviceEl.textContent = api.getClothingAdvice(cur.temperature_2m, cur.precipitation);

        // Stats
        const speedUnit = useImperial ? 'mph' : 'km/h';
        precipEl.textContent   = `${cur.precipitation} mm`;
        windEl.textContent     = `${cur.wind_speed_10m} ${speedUnit}`;
        humEl.textContent      = `${cur.relative_humidity_2m}%`;
        pressureEl.textContent = `${Math.round(cur.surface_pressure)} hPa`;
        visEl.textContent      = cur.visibility >= 1000
            ? `${(cur.visibility / 1000).toFixed(1)} km`
            : `${cur.visibility} m`;

        const uv = daily.uv_index_max[0] ?? 0;
        uvEl.textContent    = (+uv).toFixed(1);
        uvNumEl.textContent = (+uv).toFixed(1);
        drawUVGauge(parseFloat(uv));

        // AQI
        if (aqiData) {
            const aqiVal = aqiData.european_aqi;
            const aqiLvl = api.getAQILevel(aqiVal);
            aqiEl.textContent = `${aqiVal} (${aqiLvl.label})`;
            aqiIcoEl.style.color = aqiLvl.color;
        }

        // Compass
        const dir = cur.wind_direction_10m ?? 0;
        drawCompass(dir);
        windDirEl.textContent = `${api.degToCompass(dir)} (${dir}°)`;
        gustEl.textContent    = `Gusts: ${cur.wind_gusts_10m ?? '--'} ${speedUnit}`;

        // Sun arc
        if (daily.sunrise?.[0] && daily.sunset?.[0]) {
            const srStr = daily.sunrise[0];
            const ssStr = daily.sunset[0];
            const fmt   = t => new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(t));
            sunriseEl.textContent = `🌅 ${fmt(srStr)}`;
            sunsetEl.textContent  = `🌇 ${fmt(ssStr)}`;
            drawSunArc(srStr, ssStr, data.timezone);
        }

        // Moon
        const moon = api.getMoonPhase(new Date());
        drawMoon(moon.phase);
        moonNameEl.textContent  = moon.name;
        moonIllumEl.textContent = `${moon.illumination}% illuminated`;

        // DNA Pills
        dnaPillsEl.innerHTML = '';
        api.buildDNA(cur, daily).forEach(tag => {
            const s = document.createElement('span');
            s.className  = 'dna-pill';
            s.textContent = tag.label;
            s.style.color       = tag.c;
            s.style.borderColor = tag.c;
            s.style.background  = `${tag.c}1a`;
            dnaPillsEl.appendChild(s);
        });

        // Alerts (sidebar badges)
        alertsEl.innerHTML = '';
        const alerts = api.buildAlerts(cur, daily);
        if (alerts.length) {
            alertsEl.classList.remove('hidden');
            alerts.forEach(a => {
                const el = document.createElement('div');
                el.className = `alert-badge ${a.type}`;
                el.innerHTML = `<i class='bx ${a.icon}'></i> ${a.msg}`;
                alertsEl.appendChild(el);
            });
        } else alertsEl.classList.add('hidden');

        // Render alerts panel (detailed)
        renderAlerts(alerts);

        // Chart
        renderChart(activeTab);

        // Forecast bottom bar
        forecastBar.classList.remove('hidden');
        forecastBarInner.innerHTML = '';
        daily.time.slice(0,7).forEach((d, i) => {
            const date = new Date(d);
            const day  = i === 0 ? 'Today' : new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(date);
            const wi2  = api.getWeatherInfo(daily.weather_code[i]);
            const max  = Math.round(daily.temperature_2m_max[i]);
            const min  = Math.round(daily.temperature_2m_min[i]);
            const rain = (daily.precipitation_sum[i] || 0).toFixed(1);
            const card = document.createElement('div');
            card.className = `fday-card${i === 0 ? ' today' : ''}`;
            card.innerHTML = `
                <span class="fday-name">${day}</span>
                <i class='bx ${wi2.icon} fday-icon' style="color:${wi2.color}"></i>
                <span class="fday-max">${max}°</span>
                <span class="fday-min">${min}°</span>
                <span class="fday-rain">🌧 ${rain}mm</span>
            `;
            initTilt(card);
            forecastBarInner.appendChild(card);
        });

        // AI Narrative
        updateNarrative(cur, daily, name);

        // Activity Scores
        renderActivities(cur, daily);

        // Sky View
        renderSkyView(lat, lon);

        // Sound
        weatherPanel.dataset.lastCode = cur.weather_code;
        weatherPanel.dataset.lastCity = name;
        if (isSoundOn) playAmbience(cur.weather_code);
    }

    // ── Search ────────────────────────────────────────────
    let searchTimer;
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        const q = e.target.value.trim();
        if (q.length < 2) { searchResults.classList.add('hidden'); return; }
        searchTimer = setTimeout(async () => {
            const res = await api.searchLocation(q);
            searchResults.innerHTML = '';
            if (res.length) {
                searchResults.classList.remove('hidden');
                res.forEach(r => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}, ${r.country}`;
                    item.addEventListener('click', () => {
                        searchInput.value = '';
                        searchResults.classList.add('hidden');
                        loadWeather(r.latitude, r.longitude, r.name);
                    });
                    searchResults.appendChild(item);
                });
            } else searchResults.classList.add('hidden');
        }, 500);
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrap')) searchResults.classList.add('hidden');
    });

    // ── GPS / Location ────────────────────────────────────

    // IP-based geolocation — works on file://, localhost, https
    // Tries multiple services in order for reliability
    async function ipGeolocate() {
        const services = [
            {
                url: 'https://freeipapi.com/api/json/',
                parse: d => d.latitude ? { lat: d.latitude, lon: d.longitude, city: d.cityName } : null
            },
            {
                url: 'https://geolocation-db.com/json/',
                parse: d => d.latitude ? { lat: d.latitude, lon: d.longitude, city: d.city } : null
            },
            {
                url: 'https://api.ipify.org?format=json',
                parse: async d => {
                    if (!d.ip) return null;
                    const r2 = await fetch(`https://freeipapi.com/api/json/${d.ip}`);
                    const d2 = await r2.json();
                    return d2.latitude ? { lat: d2.latitude, lon: d2.longitude, city: d2.cityName } : null;
                }
            }
        ];
        for (const svc of services) {
            try {
                const r = await fetch(svc.url);
                if (!r.ok) continue;
                const json = await r.json();
                const result = typeof svc.parse === 'function' ? await svc.parse(json) : null;
                if (result && result.lat && result.lon) return result;
            } catch { /* try next */ }
        }
        return null;
    }

    // Real GPS via browser (Promise-based, with timeout)
    function gpsLocate() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) { reject(new Error('not-supported')); return; }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    city: 'Your Location'
                }),
                err => reject(err),
                { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
            );
        });
    }

    // Auto-load on page start: use IP geo (reliable everywhere)
    async function autoLocation() {
        try {
            const loc = await ipGeolocate();
            if (loc) loadWeather(loc.lat, loc.lon, loc.city || 'Your Location');
        } catch { /* user can search manually */ }
    }
    autoLocation();

    // GPS button: try real GPS first, fall back to IP
    locationBtn.addEventListener('click', async () => {
        locationBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";
        try {
            const loc = await gpsLocate();
            locationBtn.innerHTML = "<i class='bx bx-current-location'></i>";
            loadWeather(loc.lat, loc.lon, 'Your Location');
        } catch {
            // GPS failed — try IP fallback silently
            try {
                const loc = await ipGeolocate();
                locationBtn.innerHTML = "<i class='bx bx-current-location'></i>";
                if (loc) {
                    loadWeather(loc.lat, loc.lon, loc.city || 'Your Location');
                } else {
                    alert('Could not detect your location. Please search for a city manually.');
                }
            } catch {
                locationBtn.innerHTML = "<i class='bx bx-current-location'></i>";
                alert('Could not detect your location. Please search for a city manually.');
            }
        }
    });


    // ── Heatmap ───────────────────────────────────────────
    heatmapBtn.addEventListener('click', () => {
        heatmapOn = !heatmapOn;
        map.toggleHeatmap(heatmapOn);
        heatmapBtn.classList.toggle('active', heatmapOn);
    });

    // ── Radar ─────────────────────────────────────────────
    radarBtn.addEventListener('click', () => {
        radarOn = !radarOn;
        map.toggleRadar(radarOn);
        radarBtn.classList.toggle('active', radarOn);
    });

    // ── Mobile Map Toggle ─────────────────────────────────
    if (mapToggleBtn && mainArea) {
        mapToggleBtn.addEventListener('click', () => {
            mainArea.classList.toggle('map-open');
            mapToggleBtn.classList.toggle('map-open');
            const icon = mapToggleBtn.querySelector('i');
            if (mainArea.classList.contains('map-open')) {
                icon.className = 'bx bx-x';
                // Trigger map resize since it was hidden
                setTimeout(() => map.map.invalidateSize(), 300);
            } else {
                icon.className = 'bx bx-map-alt';
            }
        });
    }

    // ── Soundscape ────────────────────────────────────────
    function playAmbience(code) {
        if (!isSoundOn) return;
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        
        let file = '';
        if (code >= 95) file = 'https://www.soundjay.com/nature/thunderstorm-01.mp3';
        else if (code >= 61) file = 'https://www.soundjay.com/nature/rain-07.mp3';
        else if (code <= 2) file = 'https://www.soundjay.com/nature/birds-chirping-01.mp3';
        
        if (file) {
            currentAudio = new Audio(file);
            currentAudio.loop = true;
            currentAudio.play().catch(() => console.log('Audio blocked.'));
        }
    }

    soundToggle.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        soundToggle.classList.toggle('active', isSoundOn);
        soundToggle.innerHTML = isSoundOn ? "<i class='bx bx-volume-full'></i>" : "<i class='bx bx-volume-mute'></i>";
        if (isSoundOn) {
            const data = weatherPanel.dataset.lastCode;
            if (data) playAmbience(parseInt(data));
        } else if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    });

    // ── Save City ─────────────────────────────────────────
    saveCityBtn.addEventListener('click', () => {
        const city = weatherPanel.dataset.lastCity;
        if (!city) return;
        let favs = JSON.parse(localStorage.getItem('favCities') || '[]');
        if (!favs.includes(city)) {
            favs.push(city);
            localStorage.setItem('favCities', JSON.stringify(favs));
            alert(`${city} saved to favorites!`);
        }
    });

    // ── Alerts ────────────────────────────────────────────
    function renderAlerts(alerts) {
        const container = document.getElementById('alertsContainer');
        container.innerHTML = '';
        alerts.forEach(a => {
            const el = document.createElement('div');
            el.className = `alert-banner ${a.type}`;
            el.innerHTML = `
                <i class='bx ${a.icon}'></i>
                <div class="alert-content">
                    <h4>${a.msg}</h4>
                    <p>${a.advice}</p>
                </div>
            `;
            container.appendChild(el);
        });
    }

    // ── Sky View ──────────────────────────────────────────
    function renderSkyView(lat, lon) {
        const astro = api.getAstroData(lat, lon);
        document.getElementById('moonIcon').className = `bx ${astro.moonIcon} sky-ico`;
        document.getElementById('moonPhase').textContent = astro.moonPhase;
        document.getElementById('skyMoonIllum').textContent = `${astro.moonIllum}% Illumination`;
        document.getElementById('goldenHour').textContent = astro.goldenHour;
        document.getElementById('stargazing').textContent = astro.stargazing;
    }

    // ── AI Narrative ──────────────────────────────────────
    function updateNarrative(cur, daily, name) {
        const text = api.generateNarrative(cur, daily, name);
        document.getElementById('narrativeText').textContent = text;
    }

    // ── Activity Scores ───────────────────────────────────
    function renderActivities(cur, daily) {
        const scores = api.getActivityScores(cur, daily);
        const list = document.getElementById('activityList');
        list.innerHTML = '';
        scores.forEach(s => {
            const row = document.createElement('div');
            row.className = 'a-row';
            row.innerHTML = `
                <i class='bx ${s.icon} a-icon'></i>
                <div class="a-bar-wrap"><div class="a-bar" style="width:${s.score*10}%"></div></div>
                <span class="a-score">${s.score}</span>
            `;
            list.appendChild(row);
        });
    }

    // ── Pollen ────────────────────────────────────────────
    async function updatePollen(lat, lon) {
        const data = await api.getPollenData(lat, lon);
        if (!data) return;
        document.getElementById('p-grass').textContent = Math.round(data.grass_pollen || 0);
        document.getElementById('p-tree').textContent = Math.round(data.birch_pollen || data.alder_pollen || 0);
        document.getElementById('p-weed').textContent = Math.round(data.mugwort_pollen || data.ragweed_pollen || 0);
    }

    // (loadWeather is now unified — no wrapper needed)

    // ── Unit Switch Logic ─────────────────────────────────
    const unitToggle = document.getElementById('unitToggle');
    if (unitToggle) {
        unitToggle.addEventListener('change', () => {
            useImperial = unitToggle.checked;
            if (lastLat !== null) {
                loadWeather(lastLat, lastLon, lastCityName);
            }
        });
    }

    // ── AI Chatbot ────────────────────────────────────────
    const chatToggle  = document.getElementById('chatToggle');
    const chatWindow  = document.getElementById('chatWindow');
    const closeChat   = document.getElementById('closeChat');
    const chatInput   = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');
    const chatMessages = document.getElementById('chatMessages');

    function appendMsg(text, role) {
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getBotReply(question) {
        const q = question.toLowerCase();
        const d = window.lastWeatherData;
        if (!d) return "Please search for a city first so I can give you weather info!";
        const cur = d.current;
        const city = weatherPanel.dataset.lastCity || 'your city';
        const info = api.getWeatherInfo(cur.weather_code);
        if (q.includes('temp'))    return `It's currently ${Math.round(cur.temperature_2m)}° in ${city}. Feels like ${Math.round(cur.apparent_temperature)}°.`;
        if (q.includes('rain') || q.includes('umbrella')) return cur.precipitation > 0 ? `Yes, it's raining in ${city}. Grab an umbrella!` : `No rain right now in ${city}. You're good to go!`;
        if (q.includes('wind'))    return `Wind is blowing at ${cur.wind_speed_10m} km/h from ${api.degToCompass(cur.wind_direction_10m)}.`;
        if (q.includes('humid'))   return `Humidity is at ${cur.relative_humidity_2m}%.`;
        if (q.includes('wear') || q.includes('cloth')) return api.getClothingAdvice(cur.temperature_2m, cur.precipitation);
        if (q.includes('uv'))      return `UV Index today is ${d.daily.uv_index_max[0]?.toFixed(1) ?? '--'}.`;
        return `Right now in ${city}: ${info.desc}, ${Math.round(cur.temperature_2m)}°. Ask me about temperature, rain, wind, humidity, UV, or what to wear!`;
    }

    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
    });

    closeChat.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMsg(text, 'user');
        chatInput.value = '';
        setTimeout(() => appendMsg(getBotReply(text), 'bot'), 400);
    }

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

});


// -- Master FX: Chrono-Gradient Logic ------------------
function updateChronoGradient() {
    const hour = new Date().getHours();
    let g1, g2;

    if (hour >= 5 && hour < 8) { // Dawn
        g1 = '#2e1065'; g2 = '#fb7185';
    } else if (hour >= 8 && hour < 17) { // Day
        g1 = '#0f172a'; g2 = '#1e293b';
    } else if (hour >= 17 && hour < 20) { // Sunset
        g1 = '#4c1d95'; g2 = '#f59e0b';
    } else { // Night
        g1 = '#020617'; g2 = '#0f172a';
    }

    document.body.style.background = `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`;
}

// Update every minute
updateChronoGradient();
setInterval(updateChronoGradient, 60000);





