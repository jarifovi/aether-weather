class WeatherAPI {
    constructor() {
        this.geoUrl     = 'https://geocoding-api.open-meteo.com/v1/search';
        this.weatherUrl = 'https://api.open-meteo.com/v1/forecast';
        this.aqiUrl     = 'https://air-quality-api.open-meteo.com/v1/air-quality';
        
        // Optional: Replace with your WeatherAPI.com key for premium live data
        this.API_KEY = ''; 
    }

    async searchLocation(query) {
        try {
            const r = await fetch(`${this.geoUrl}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            if (!r.ok) throw new Error();
            return (await r.json()).results || [];
        } catch { return []; }
    }

    async getWeatherData(lat, lon, useImperial = false) {
        if (this.API_KEY) return this.getPremiumWeatherData(lat, lon);
        try {
            const unit = useImperial ? 'fahrenheit' : 'celsius';
            const sUnit = useImperial ? 'mph' : 'kmh';
            const p = new URLSearchParams({
                latitude: lat, longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility',
                hourly:  'temperature_2m,precipitation_probability,weather_code',
                daily:   'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset',
                forecast_days: 7,
                timezone: 'auto',
                temperature_unit: unit,
                wind_speed_unit: sUnit
            });
            const r = await fetch(`${this.weatherUrl}?${p}`);
            if (!r.ok) throw new Error();
            return await r.json();
        } catch { return null; }
    }

    async getAirQuality(lat, lon) {
        try {
            const p = new URLSearchParams({
                latitude: lat, longitude: lon,
                current: 'european_aqi,us_aqi,pm10,pm2_5',
                timezone: 'auto'
            });
            const r = await fetch(`${this.aqiUrl}?${p}`);
            if (!r.ok) throw new Error();
            const data = await r.json();
            return data.current;
        } catch { return null; }
    }

    async getPremiumWeatherData(lat, lon) {
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${this.API_KEY}&q=${lat},${lon}&days=7&aqi=yes&alerts=yes`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const data = await resp.json();
            
            return {
                current: {
                    temperature_2m: data.current.temp_c,
                    apparent_temperature: data.current.feelslike_c,
                    relative_humidity_2m: data.current.humidity,
                    is_day: data.current.is_day,
                    weather_code: data.current.condition.code,
                    wind_speed_10m: data.current.wind_kph,
                    wind_direction_10m: data.current.wind_degree,
                    surface_pressure: data.current.pressure_mb,
                    visibility: data.current.vis_km * 1000,
                    precipitation: data.current.precip_mm,
                    is_premium: true
                },
                daily: {
                    time: data.forecast.forecastday.map(d => d.date),
                    temperature_2m_max: data.forecast.forecastday.map(d => d.day.maxtemp_c),
                    temperature_2m_min: data.forecast.forecastday.map(d => d.day.mintemp_c),
                    weather_code: data.forecast.forecastday.map(d => d.day.condition.code),
                    sunrise: data.forecast.forecastday.map(d => d.date + 'T' + this.convertTo24(d.astro.sunrise)),
                    sunset: data.forecast.forecastday.map(d => d.date + 'T' + this.convertTo24(d.astro.sunset)),
                    uv_index_max: data.forecast.forecastday.map(d => d.day.uv),
                    precipitation_sum: data.forecast.forecastday.map(d => d.day.totalprecip_mm)
                },
                hourly: {
                    temperature_2m: data.forecast.forecastday[0].hour.map(h => h.temp_c),
                    time: data.forecast.forecastday[0].hour.map(h => h.time)
                },
                timezone: data.location.tz_id
            };
        } catch (e) {
            console.error("Premium fetch error:", e);
            return null;
        }
    }

    convertTo24(timeStr) {
        if (!timeStr) return "00:00";
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${hours.toString().padStart(2,'0')}:${minutes}`;
    }

    getWeatherInfo(code) {
        // Handle WeatherAPI codes (mapping some common ones)
        if (code >= 1000) {
            if (code === 1000) return { desc:'Clear Sky', icon:'bx-sun', color:'#ffcc33' };
            if (code <= 1009) return { desc:'Partly Cloudy', icon:'bx-cloud', color:'#94a3b8' };
            if (code <= 1063) return { desc:'Patchy Rain', icon:'bx-cloud-rain', color:'#3b82f6' };
            if (code <= 1189) return { desc:'Rainy', icon:'bx-cloud-rain', color:'#2563eb' };
            if (code >= 1273) return { desc:'Thunderstorm', icon:'bx-cloud-lightning', color:'#f43f5e' };
            return { desc:'Cloudy', icon:'bx-cloud', color:'#64748b' };
        }
        
        const map = {
            0:  { desc:'Clear Sky',               icon:'bx-sun',             color:'#ffcc33' },
            1:  { desc:'Mainly Clear',             icon:'bx-sun',             color:'#ffcc33' },
            2:  { desc:'Partly Cloudy',            icon:'bx-cloud',           color:'#94a3b8' },
            3:  { desc:'Overcast',                 icon:'bx-cloud',           color:'#64748b' },
            45: { desc:'Fog',                      icon:'bx-water',           color:'#94a3b8' },
            48: { desc:'Rime Fog',                 icon:'bx-water',           color:'#94a3b8' },
            51: { desc:'Light Drizzle',            icon:'bx-cloud-drizzle',   color:'#60a5fa' },
            53: { desc:'Moderate Drizzle',         icon:'bx-cloud-drizzle',   color:'#3b82f6' },
            55: { desc:'Dense Drizzle',            icon:'bx-cloud-drizzle',   color:'#2563eb' },
            61: { desc:'Slight Rain',              icon:'bx-cloud-rain',      color:'#60a5fa' },
            63: { desc:'Moderate Rain',            icon:'bx-cloud-rain',      color:'#3b82f6' },
            65: { desc:'Heavy Rain',               icon:'bx-cloud-rain',      color:'#2563eb' },
            66: { desc:'Freezing Rain',            icon:'bx-cloud-snow',      color:'#bfdbfe' },
            67: { desc:'Heavy Freezing Rain',      icon:'bx-cloud-snow',      color:'#93c5fd' },
            71: { desc:'Slight Snow',              icon:'bx-cloud-snow',      color:'#e0f2fe' },
            73: { desc:'Moderate Snow',            icon:'bx-cloud-snow',      color:'#bae6fd' },
            75: { desc:'Heavy Snow',               icon:'bx-cloud-snow',      color:'#7dd3fc' },
            77: { desc:'Snow Grains',              icon:'bx-cloud-snow',      color:'#e0f2fe' },
            80: { desc:'Slight Showers',           icon:'bx-cloud-rain',      color:'#60a5fa' },
            81: { desc:'Moderate Showers',         icon:'bx-cloud-rain',      color:'#3b82f6' },
            82: { desc:'Violent Showers',          icon:'bx-cloud-lightning', color:'#f43f5e' },
            85: { desc:'Snow Showers',             icon:'bx-cloud-snow',      color:'#bae6fd' },
            86: { desc:'Heavy Snow Showers',       icon:'bx-cloud-snow',      color:'#7dd3fc' },
            95: { desc:'Thunderstorm',             icon:'bx-cloud-lightning', color:'#f43f5e' },
            96: { desc:'Thunderstorm + Hail',      icon:'bx-cloud-lightning', color:'#f43f5e' },
            99: { desc:'Thunderstorm + Heavy Hail',icon:'bx-cloud-lightning', color:'#f43f5e' }
        };
        return map[code] || { desc:'Unknown', icon:'bx-question-mark', color:'#94a3b8' };
    }

    getClothingAdvice(t, precip) {
        if (precip > 0.5) return "Grab an umbrella and a waterproof jacket. It's wet out there!";
        if (t >= 30) return "It's scorching! Wear light linen, sunglasses, and don't forget sunscreen.";
        if (t >= 22) return "Perfect weather for a T-shirt and shorts. Enjoy the warmth!";
        if (t >= 15) return "A light sweater or hoodie should be enough for today.";
        if (t >= 5)  return "It's chilly. A warm jacket or coat is recommended.";
        return "Freezing! Layer up with a heavy coat, scarf, and gloves.";
    }

    buildAlerts(current, daily) {
        const alerts = [];
        const t = current.temperature_2m;
        const code = current.weather_code;
        const wind = current.wind_speed_10m;
        
        if (t >= 40)       alerts.push({ type:'danger',  msg:'🔥 Extreme Heatwave', icon:'bxs-hot', advice:'Stay indoors and stay hydrated.' });
        else if (t >= 33)  alerts.push({ type:'warning', msg:'☀️ High Temperature', icon:'bxs-sun', advice:'Wear light clothing and sunscreen.' });
        
        if (code >= 95)    alerts.push({ type:'danger',  msg:'⛈️ Severe Thunderstorm', icon:'bx-cloud-lightning', advice:'Seek shelter immediately.' });
        else if (code >= 80) alerts.push({ type:'warning', msg:'🌧️ Heavy Showers', icon:'bx-cloud-showers-heavy', advice:'Expect visibility issues while driving.' });
        
        if (wind >= 50)    alerts.push({ type:'danger',  msg:'🌪️ Storm Force Winds', icon:'bx-wind', advice:'Stay away from trees and power lines.' });
        
        return alerts;
    }

    getAstroData(lat, lon, date = new Date()) {
        const moon = this.getMoonPhase(date);
        
        // Simplified Solar times calculation
        const sunrise = new Date(date); sunrise.setHours(6, 0); 
        const sunset  = new Date(date); sunset.setHours(18, 30);
        
        return {
            moonPhase: moon.name,
            moonIllum: moon.illumination,
            moonIcon: this.getMoonIcon(moon.phase),
            goldenHour: '17:45 - 18:30',
            blueHour: '18:45 - 19:15',
            stargazing: moon.illumination < 30 ? 'Excellent' : 'Fair'
        };
    }

    getMoonIcon(phase) {
        if (phase < 1.85)  return 'bx-moon'; // New
        if (phase < 14.77) return 'bxs-moon'; // Waxing
        if (phase < 16.61) return 'bxs-moon'; // Full
        return 'bx-moon'; // Waning
    }

    buildDNA(current, daily) {
        const t   = current.temperature_2m;
        const hum = current.relative_humidity_2m;
        const w   = current.wind_speed_10m;
        const uv  = daily?.uv_index_max?.[0] ?? 0;
        const r   = daily?.precipitation_sum?.[0] ?? 0;
        const tags = [];

        if      (t >= 38) tags.push({ label:'🔥 Scorching', c:'#f97316' });
        else if (t >= 30) tags.push({ label:'☀️ Hot',       c:'#fb923c' });
        else if (t >= 22) tags.push({ label:'🌤 Warm',      c:'#ffcc33' });
        else if (t >= 15) tags.push({ label:'🌥 Mild',      c:'#34d399' });
        else if (t >= 5)  tags.push({ label:'🧥 Cool',      c:'#38bdf8' });
        else if (t >= 0)  tags.push({ label:'🧊 Cold',      c:'#93c5fd' });
        else              tags.push({ label:'❄️ Freezing',  c:'#bfdbfe' });

        if      (hum >= 80) tags.push({ label:'💦 Muggy',   c:'#06b6d4' });
        else if (hum >= 60) tags.push({ label:'💧 Humid',   c:'#0ea5e9' });
        else if (hum <= 30) tags.push({ label:'🌵 Dry',     c:'#d97706' });

        if      (w >= 50) tags.push({ label:'🌪 Storm',     c:'#f43f5e' });
        else if (w >= 30) tags.push({ label:'💨 Windy',     c:'#94a3b8' });
        else if (w <= 5)  tags.push({ label:'🍃 Calm',      c:'#86efac' });

        if      (uv >= 8) tags.push({ label:'🕶 Extreme UV',c:'#ef4444' });
        else if (uv >= 6) tags.push({ label:'☀️ High UV',   c:'#f97316' });
        else if (uv >= 3) tags.push({ label:'🌤 Mod UV',    c:'#eab308' });

        if      (r >= 20) tags.push({ label:'🌊 Very Wet',  c:'#3b82f6' });
        else if (r >= 5)  tags.push({ label:'🌧 Rainy',     c:'#60a5fa' });
        else if (r === 0) tags.push({ label:'🌈 Dry Day',   c:'#a78bfa' });

        return tags;
    }

    getMoonPhase(date) {
        const known = new Date(2000, 0, 6);
        const days  = (date - known) / 86400000;
        const cycle = 29.53058770576;
        const phase = ((days % cycle) + cycle) % cycle;
        const illumination = Math.round((1 - Math.cos((phase / cycle) * Math.PI * 2)) / 2 * 100);
        let name = '';
        if      (phase < 1.85)  name = 'New Moon';
        else if (phase < 7.38)  name = 'Waxing Crescent';
        else if (phase < 9.22)  name = 'First Quarter';
        else if (phase < 14.77) name = 'Waxing Gibbous';
        else if (phase < 16.61) name = 'Full Moon';
        else if (phase < 22.15) name = 'Waning Gibbous';
        else if (phase < 23.99) name = 'Last Quarter';
        else if (phase < 29.53) name = 'Waning Crescent';
        else                    name = 'New Moon';
        return { phase, illumination, name };
    }

    getAQILevel(aqi) {
        if (aqi <= 20) return { label: 'Excellent', color: '#10b981' };
        if (aqi <= 40) return { label: 'Good', color: '#34d399' };
        if (aqi <= 60) return { label: 'Moderate', color: '#facc15' };
        if (aqi <= 80) return { label: 'Poor', color: '#f97316' };
        if (aqi <= 100) return { label: 'Unhealthy', color: '#f43f5e' };
        return { label: 'Hazardous', color: '#881337' };
    }

    degToCompass(d) {
        const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
        return dirs[Math.round(d / 22.5) % 16];
    }

    comfortScore(t, hum, w, uv) {
        let s = 100;
        if (t < 5 || t > 35) s -= 30; else if (t < 10 || t > 30) s -= 15;
        if (hum > 80) s -= 20; else if (hum > 65) s -= 10;
        if (w > 40) s -= 20; else if (w > 25) s -= 10;
        if (uv >= 8) s -= 20; else if (uv >= 6) s -= 10;
        return Math.max(0, Math.min(100, Math.round(s)));
    }

    async getPollenData(lat, lon) {
        try {
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`;
            const r = await fetch(url);
            if (!r.ok) return null;
            return (await r.json()).current;
        } catch { return null; }
    }

    generateNarrative(cur, daily, name) {
        const t = cur.temperature_2m;
        const code = cur.weather_code;
        const info = this.getWeatherInfo(code);
        
        let msg = `Good morning! It's currently ${t}°C with ${info.desc.toLowerCase()} in ${name}. `;
        
        if (code >= 61) msg += "Keep your umbrella close as rain is expected. ";
        else if (t >= 30) msg += "It's a hot one! Stay hydrated if you're heading out. ";
        else if (t >= 20) msg += "The weather is looking beautiful for outdoor plans. ";
        
        const maxT = daily.temperature_2m_max[0];
        msg += `Expect a high of ${maxT}°C today.`;
        
        return msg;
    }

    getActivityScores(cur, daily) {
        const t = cur.temperature_2m;
        const precip = cur.precipitation;
        const uv = daily.uv_index_max[0];
        
        let photo = 10; if (precip > 0) photo -= 7; if (uv > 8) photo -= 2;
        let run = 10; if (t > 30) run -= 5; if (precip > 0.5) run -= 4;
        let star = 10; if (cur.weather_code > 2) star -= 8;
        
        return [
            { label: 'Photography', score: Math.max(1, photo), icon: 'bx-camera' },
            { label: 'Running', score: Math.max(1, run), icon: 'bx-run' },
            { label: 'Stargazing', score: Math.max(1, star), icon: 'bx-star' }
        ];
    }
}
