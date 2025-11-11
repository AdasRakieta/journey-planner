import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from '../contexts/ThemeContext';

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

const JourneyMap: React.FC<JourneyMapProps> = ({
  locations,
  onLocationClick,
  onMapClick,
  center = [51.505, -0.09],
  zoom = 6,
}) => {
  const { theme } = useTheme();
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  // Choose tile layer based on theme - use lighter dark tiles
  const tileLayerUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  
  const tileLayerAttribution = theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  useEffect(() => {
    // Update center when prop changes
    setMapCenter(center);
  }, [center]);

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
      className={`z-0 ${theme === 'dark' ? 'apple-dark-map' : ''}`}
    >
      <TileLayer
        key={`base-${theme}`}
        attribution={tileLayerAttribution}
        url={tileLayerUrl}
        className={theme === 'dark' ? 'dark-map-tiles' : ''}
      />
      {theme === 'dark' && (
        <TileLayer
          key={`labels-${theme}`}
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution=""
        />
      )}
      <MapCenterUpdater center={mapCenter} />
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
              <strong className="dark:text-white">{location.city || 'Unknown Location'}</strong>
              {location.country && <p className="text-xs text-gray-600 dark:text-gray-400">{location.country}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default JourneyMap;
