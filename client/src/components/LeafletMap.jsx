import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Loader2 } from 'lucide-react';
import { reverseGeocode } from '../services/geocoding.js';

// Custom modern SVG marker icons for Leaflet
const createCustomIcon = (color = '#ef4444', pulse = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        ${
          pulse
            ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: pulseGlow 1.8s infinite;"></div>`
            : ''
        }
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

const centerIcon = createCustomIcon('#ef4444', true);
const donorIcon = createCustomIcon('#10b981', false);
const outOfRangeDonorIcon = createCustomIcon('#38bdf8', false);

// Component to handle clicks when in location-picker mode
const MapLocationPicker = ({ onLocationSelect, onAddressResolve }) => {
  useMapEvents({
    async click(e) {
      const coords = [e.latlng.lng, e.latlng.lat]; // [longitude, latitude]
      if (onLocationSelect) {
        onLocationSelect(coords);
      }
      if (onAddressResolve) {
        const address = await reverseGeocode(coords);
        if (address) {
          onAddressResolve(address, coords);
        }
      }
    },
  });
  return null;
};

// Component to recenter map when center changes
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === 'number' && typeof center[1] === 'number') {
      map.setView([center[1], center[0]], zoom || 14, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

export const LeafletMap = ({
  center = [77.209, 28.5672], // [lng, lat]
  radiusKm = 1,
  donors = [],
  pickerMode = false,
  onLocationSelect = null,
  onAddressResolve = null,
  height = '380px',
  showRadius = true,
  centerTitle = 'Request Center Point',
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);

  // Leaflet expects [latitude, longitude]
  const leafletCenter = [center[1], center[0]];

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported in this browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsLoading(false);
        const coords = [pos.coords.longitude, pos.coords.latitude];
        if (onLocationSelect) {
          onLocationSelect(coords);
        }
        if (onAddressResolve) {
          const address = await reverseGeocode(coords);
          if (address) {
            onAddressResolve(address, coords);
          }
        }
      },
      (err) => {
        setGpsLoading(false);
        let msg = 'Could not access location';
        if (err.code === 1) msg = 'Location permission denied by user.';
        else if (err.code === 2) msg = 'Location position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ position: 'relative', height, width: '100%', borderRadius: '14px', overflow: 'hidden' }}>
      <MapContainer
        center={leafletCenter}
        zoom={radiusKm > 5 ? 12 : 14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} zoom={radiusKm > 5 ? 12 : 14} />

        {pickerMode && (
          <MapLocationPicker
            onLocationSelect={onLocationSelect}
            onAddressResolve={onAddressResolve}
          />
        )}

        {/* Center / Request Marker */}
        <Marker position={leafletCenter} icon={centerIcon}>
          <Popup>
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <strong style={{ color: '#ef4444' }}>{centerTitle}</strong>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Lat: {center[1].toFixed(4)}, Lng: {center[0].toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Adaptive Radius Circle */}
        {showRadius && radiusKm > 0 && (
          <Circle
            center={leafletCenter}
            radius={radiusKm * 1000} // meters
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '4, 8',
            }}
          />
        )}

        {/* Matched Donors Markers */}
        {donors.map((item, idx) => {
          const donorCoords =
            item.donor?.location?.coordinates ||
            item.location?.coordinates ||
            item.donor?.coordinates ||
            item.coordinates;

          if (!donorCoords || donorCoords.length !== 2) return null;

          const donorLeafletPos = [donorCoords[1], donorCoords[0]];
          const isAccepted = item.status === 'accepted';
          const donorName = item.donor?.username || 'Compatible Donor';

          return (
            <Marker
              key={item.matchId || item.donor?._id || idx}
              position={donorLeafletPos}
              icon={isAccepted ? donorIcon : outOfRangeDonorIcon}
            >
              <Popup>
                <div style={{ minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span className="badge-blood" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                      {item.donor?.bloodGroup || item.bloodGroup || 'A+'}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isAccepted ? '#10b981' : '#38bdf8' }}>
                      {item.distanceKm !== undefined ? `${item.distanceKm} km` : 'Nearby'}
                    </span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    {donorName}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Status: <strong style={{ textTransform: 'capitalize', color: isAccepted ? '#34d399' : '#94a3b8' }}>{item.status || 'Notified'}</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* GPS Locate Me Button for Location Picker */}
      {pickerMode && (
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gpsLoading}
          className="btn btn-secondary"
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 800,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontSize: '0.8rem',
            padding: '8px 12px',
          }}
        >
          {gpsLoading ? (
            <Loader2 size={14} className="pulse-glow" style={{ color: '#ef4444' }} />
          ) : (
            <Navigation size={14} style={{ color: '#ef4444' }} />
          )}
          {gpsLoading ? 'Detecting GPS...' : 'Use My GPS Location'}
        </button>
      )}
    </div>
  );
};

export default LeafletMap;
