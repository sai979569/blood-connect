import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  AlertCircle,
  ArrowRight,
  MapPin,
  WifiOff,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '../services/api.js';
import { useOffline } from '../context/OfflineContext.jsx';
import LeafletMap from '../components/LeafletMap.jsx';
import LocationSearchBar from '../components/LocationSearchBar.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_COMPONENTS = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Plasma'];
const URGENCY_LEVELS = [
  { value: 'critical', label: 'CRITICAL (Immediate surgery / trauma)' },
  { value: 'high', label: 'HIGH (Within 4 hours)' },
  { value: 'medium', label: 'MEDIUM (Within 12 hours)' },
  { value: 'low', label: 'LOW (Scheduled next day)' },
];

export const CreateRequestPage = () => {
  const { isOnline, queueOfflineRequest } = useOffline();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bloodGroup: 'A+',
    bloodComponent: 'Whole Blood',
    units: 2,
    hospitalName: 'AIIMS Main Trauma Center',
    hospitalAddress: 'Ring Road, Safdarjung Enclave, New Delhi',
    coordinates: [77.209, 28.5672], // [lng, lat]
    urgency: 'critical',
    additionalInstructions: 'Emergency surgery scheduled. Attendant available at Desk 3.',
    allowPhoneCall: true,
    allowWhatsApp: true,
    inAppOnly: false,
    donorTarget: 3,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [offlineNotice, setOfflineNotice] = useState(null);

  const handleLocationSelect = (newCoords) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: newCoords,
    }));
  };

  const handleLocationSearchResult = ({ address, shortName, coordinates }) => {
    setFormData((prev) => ({
      ...prev,
      coordinates,
      hospitalAddress: address || prev.hospitalAddress,
      hospitalName: shortName || prev.hospitalName,
    }));
  };

  const handleAddressResolve = (resolvedAddress) => {
    if (resolvedAddress) {
      setFormData((prev) => ({
        ...prev,
        hospitalAddress: resolvedAddress,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOfflineNotice(null);
    setSubmitting(true);

    const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      bloodGroup: formData.bloodGroup,
      bloodComponent: formData.bloodComponent,
      units: Number(formData.units),
      hospitalName: formData.hospitalName.trim(),
      hospitalAddress: formData.hospitalAddress.trim(),
      location: {
        type: 'Point',
        coordinates: formData.coordinates,
      },
      urgency: formData.urgency,
      additionalInstructions: formData.additionalInstructions.trim(),
      contactPreferences: {
        allowPhoneCall: formData.allowPhoneCall,
        allowWhatsApp: formData.allowWhatsApp,
        inAppOnly: formData.inAppOnly,
      },
      donorTarget: Number(formData.donorTarget),
      idempotencyKey,
    };

    // If browser is offline, queue directly into IndexedDB
    if (!isOnline) {
      try {
        await queueOfflineRequest(payload);
        setOfflineNotice({
          key: idempotencyKey,
          message:
            'You are offline. Your blood request draft has been securely stored locally in IndexedDB with idempotency tracking. It will automatically transmit as soon as connectivity restores.',
        });
        setSubmitting(false);
        return;
      } catch (err) {
        setError('Failed to save offline draft in IndexedDB: ' + err.message);
        setSubmitting(false);
        return;
      }
    }

    // Attempt online submission
    try {
      const res = await api.post('/requests', payload);
      const createdRequest = res.data.request;
      navigate(`/requests/${createdRequest._id}`);
    } catch (err) {
      // If network fails during request, fallback gracefully to offline IndexedDB draft
      if (!err.response) {
        await queueOfflineRequest(payload);
        setOfflineNotice({
          key: idempotencyKey,
          message:
            'Network lost during submission. Saved as offline draft in IndexedDB. Will synchronize automatically upon reconnect.',
        });
      } else {
        setError(err.response?.data?.message || 'Failed to create blood request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '30px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '36px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(220, 38, 38, 0.4)',
            }}
          >
            <Heart size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem' }}>Create Urgent Blood Request</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Adaptive geospatial search engine will initialize at 1 km and automatically expand if needed
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {offlineNotice && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', marginBottom: '8px' }}>
              <WifiOff size={20} />
              <strong style={{ fontSize: '0.95rem' }}>Saved to Offline Synchronization Queue</strong>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {offlineNotice.message}
            </p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/my-requests')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Go to My Requests
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Required Blood Group</label>
              <select
                className="form-select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Blood Component</label>
              <select
                className="form-select"
                value={formData.bloodComponent}
                onChange={(e) => setFormData({ ...formData, bloodComponent: e.target.value })}
              >
                {BLOOD_COMPONENTS.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Number of Units Needed</label>
              <input
                type="number"
                min={1}
                max={50}
                required
                className="form-input"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select
                className="form-select"
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hospital / Medical Center Name</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. AIIMS Main Trauma Center"
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hospital Full Address & Ward</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Safdarjung Enclave, Ring Road, ICU Wing 2"
                value={formData.hospitalAddress}
                onChange={(e) => setFormData({ ...formData, hospitalAddress: e.target.value })}
              />
            </div>
          </div>

          {/* Interactive Map Picker & Address Geocoder for Request Coordinates */}
          <div style={{ marginTop: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Hospital Location & Coordinates (Search Area, Click Map, or Use GPS)
              </label>
              <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                Lat: {formData.coordinates[1].toFixed(4)}, Lng: {formData.coordinates[0].toFixed(4)}
              </span>
            </div>

            {/* Geocoding Search Input for places, localities, hospitals, and addresses */}
            <LocationSearchBar
              onSelectLocation={handleLocationSearchResult}
              placeholder="Type hospital, locality, area (e.g. Rohini, Safdarjung, AIIMS, Connaught Place)..."
              initialValue={formData.hospitalAddress}
            />

            <LeafletMap
              center={formData.coordinates}
              pickerMode={true}
              onLocationSelect={handleLocationSelect}
              onAddressResolve={handleAddressResolve}
              height="280px"
              showRadius={true}
              radiusKm={1}
              centerTitle={formData.hospitalName || 'Request Hospital'}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              * Search any place name above, click anywhere on the map, or tap "Use My GPS Location" to resolve coordinates and reposition the initial 1 km search circle.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Instructions / Case Notes (Optional)</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="e.g. Patient undergoing critical surgery. Contact attendant at Desk 4 upon arrival."
              value={formData.additionalInstructions}
              onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
            />
          </div>

          {/* Target Donors & Radius Info */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Clock size={16} style={{ color: '#f59e0b' }} />
              <strong style={{ fontSize: '0.875rem' }}>Adaptive Matching Parameters</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Initial scan radius is set to <strong>1 km</strong>. If fewer than <strong>{formData.donorTarget}</strong> compatible
              donors accept, the backend scheduler will automatically expand the radius in increments (up to 10 km max)
              every evaluation interval without duplicate alerts.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
          >
            {submitting ? 'Broadcasting to Donors...' : 'Launch Adaptive Blood Request'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage;
