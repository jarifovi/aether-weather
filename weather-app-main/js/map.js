class MapManager {
    constructor(containerId) {
        this.map = L.map(containerId, {
            zoomControl: false // We can position it later or hide it
        }).setView([20, 0], 2); // Default view (world)

        // Add Dark Mode Tiles (CartoDB Dark Matter)
        this.baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // Move zoom control to top right
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        this.markers = L.layerGroup().addTo(this.map);
        this.heatmapLayer = null;
        this.radarLayer = null;
        this.heatmapData = [];
        
        this.initRadar();
    }

    async initRadar() {
        try {
            const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await resp.json();
            const lastTimestamp = data.radar.past[data.radar.past.length - 1].time;
            
            this.radarLayer = L.tileLayer(`https://tilecache.rainviewer.com/v2/radar/${lastTimestamp}/256/{z}/{x}/{y}/2/1_1.png`, {
                opacity: 0.65,
                zIndex: 400,
                maxNativeZoom: 7, // RainViewer free tier limit as of 2026
                maxZoom: 20
            });
        } catch (e) {
            console.error("Failed to init radar:", e);
        }
    }

    flyTo(lat, lon, zoom = 10) {
        this.map.flyTo([lat, lon], zoom, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    }

    addMarker(lat, lon, title, temp, description) {
        // Create custom icon or simple marker
        const marker = L.marker([lat, lon]).addTo(this.markers);
        
        // Popup content
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; color: #333;">
                <h3 style="margin: 0 0 5px 0;">${title}</h3>
                <p style="margin: 0; font-size: 1.2rem; font-weight: bold;">${temp}°C</p>
                <p style="margin: 0; text-transform: capitalize;">${description}</p>
            </div>
        `;
        
        marker.bindPopup(popupContent).openPopup();
        return marker;
    }

    clearMarkers() {
        this.markers.clearLayers();
    }

    // Initialize/Update Heatmap
    // points should be array of [lat, lon, intensity]
    updateHeatmap(points) {
        this.heatmapData = points;
        
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }

        // The intensity (3rd parameter) should be scaled appropriately.
        // Let's assume points are [lat, lon, temperature]. We map temp to intensity.
        const heatPoints = points.map(p => {
            const lat = p[0];
            const lon = p[1];
            const temp = p[2];
            
            // Normalize temp roughly (e.g. -20 to 40 C) to 0.0 - 1.0 intensity
            // Just a visual approximation
            let intensity = (temp + 20) / 60; 
            if (intensity < 0) intensity = 0;
            if (intensity > 1) intensity = 1;
            
            return [lat, lon, intensity];
        });

        // Use leaflet-heat plugin (must be loaded in HTML)
        if (typeof L.heatLayer !== 'undefined') {
            this.heatmapLayer = L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                max: 1.0,
                gradient: {
                    0.0: '#0000ff', // Cold (Blue)
                    0.4: '#00ffff', // Cool (Cyan)
                    0.6: '#00ff00', // Mild (Green)
                    0.8: '#ffff00', // Warm (Yellow)
                    1.0: '#ff0000'  // Hot (Red)
                }
            });
            this.heatmapLayer.addTo(this.map);
        } else {
            console.warn('Leaflet.heat plugin not loaded.');
        }
    }

    toggleHeatmap(show) {
        if (!this.heatmapLayer) return;
        
        if (show) {
            if (!this.map.hasLayer(this.heatmapLayer)) {
                this.heatmapLayer.addTo(this.map);
            }
        } else {
            if (this.map.hasLayer(this.heatmapLayer)) {
                this.map.removeLayer(this.heatmapLayer);
            }
        }
    }

    toggleRadar(show) {
        if (!this.radarLayer) return;
        
        if (show) {
            if (!this.map.hasLayer(this.radarLayer)) {
                this.radarLayer.addTo(this.map);
            }
        } else {
            if (this.map.hasLayer(this.radarLayer)) {
                this.map.removeLayer(this.radarLayer);
            }
        }
    }

    setTheme(isLight) {
        const url = isLight 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
        if (this.baseLayer) this.map.removeLayer(this.baseLayer);
        this.baseLayer = L.tileLayer(url, {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);
    }
}
