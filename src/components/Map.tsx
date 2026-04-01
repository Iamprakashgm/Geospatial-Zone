import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapLayer } from '../types';

interface MapProps {
  layers: MapLayer[];
}

function MapResizer({ layers }: { layers: MapLayer[] }) {
  const map = useMap();

  useEffect(() => {
    if (layers.length > 0) {
      const bounds = L.featureGroup(
        layers
          .filter(l => l.visible)
          .map(l => L.geoJSON(l.data))
      ).getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [layers, map]);

  return null;
}

export default function Map({ layers }: MapProps) {
  return (
    <MapContainer 
      center={[0, 0]} 
      zoom={2} 
      className="w-full h-full bg-[#E4E3E0]"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {layers.map(layer => (
        layer.visible && (
          <GeoJSON 
            key={layer.id} 
            data={layer.data} 
            style={{
              color: layer.color,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.2,
              fillColor: layer.color
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const props = feature.properties;
                const content = Object.entries(props)
                  .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
                  .join('<br/>');
                layer.bindPopup(`<div class="text-xs font-sans">${content || 'No attributes'}</div>`);
              }
            }}
            pointToLayer={(feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 6,
                fillColor: layer.color,
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
              });
            }}
          />
        )
      ))}
      <MapResizer layers={layers} />
    </MapContainer>
  );
}
