import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon URLs for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status?: 'DELIVERED' | 'PENDING' | 'CURRENT';
  description?: string;
  onClick?: () => void;
}

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  userLocation?: [number, number] | null;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  center = [23.1815, 79.9864], // Default center
  zoom = 14,
  markers = [],
  userLocation = null,
  className = 'h-72 w-full rounded-xl overflow-hidden',
  onMarkerClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);

      // OpenStreetMap free tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers and center
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Plot user current location if active
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg ring-4 ring-blue-300 animate-pulse"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(userLocation, { icon: userIcon })
        .bindPopup('<b>Your Current Location</b>')
        .addTo(layer);
      bounds.extend(userLocation);
    }

    // 2. Plot customer markers
    markers.forEach((m) => {
      const isDelivered = m.status === 'DELIVERED';
      const color = isDelivered ? '#10b981' : '#f59e0b'; // Emerald or Amber

      const markerIcon = L.divIcon({
        className: 'custom-customer-marker',
        html: `<div style="background-color: ${color}" class="w-6 h-6 border-2 border-white rounded-full shadow-md flex items-center justify-center text-[10px] text-white font-bold">
          ${isDelivered ? '✓' : '•'}
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([m.lat, m.lng], { icon: markerIcon }).addTo(layer);

      marker.bindPopup(
        `<div class="text-xs">
          <p class="font-bold text-slate-900">${m.title}</p>
          <p class="text-slate-600">${m.description || ''}</p>
          <span class="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }">${m.status || 'PENDING'}</span>
        </div>`
      );

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(m));
      }

      bounds.extend([m.lat, m.lng]);
    });

    if (markers.length > 0 || userLocation) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [markers, userLocation]);

  return <div ref={mapContainerRef} className={className} />;
};
