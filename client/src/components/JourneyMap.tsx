import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapLocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

interface JourneyMapProps {
  locations: MapLocation[];
  onLocationClick?: (location: MapLocation) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
}

function LocationMarker({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const JourneyMap: React.FC<JourneyMapProps> = ({
  locations,
  onLocationClick,
  onMapClick,
  center = [51.505, -0.09],
  zoom = 6,
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  useEffect(() => {
    if (locations.length > 0) {
      const lastLocation = locations[locations.length - 1];
      setMapCenter([lastLocation.lat, lastLocation.lng]);
    }
  }, [locations]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '10px' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <LocationMarker onMapClick={onMapClick} />}
      {locations.map((location, index) => (
        <Marker
          key={index}
          position={[location.lat, location.lng]}
          eventHandlers={{
            click: () => onLocationClick && onLocationClick(location),
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{location.city || 'Unknown Location'}</strong>
              {location.country && <p className="text-xs text-gray-600">{location.country}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default JourneyMap;
