import React, { useState } from 'react';
import { User, MapPin, Droplet, Shield, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import LeafletMap from '../components/LeafletMap.jsx';
import LocationSearchBar from '../components/LocationSearchBar.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    bloodGroup: user?.bloodGroup || 'A+',
    address: user?.address || '',
    contactSharingPreference: user?.contactSharingPreference || 'on_accept',
    coordinates: user?.location?.coordinates || [77.209, 28.5672],
    isDonorAvailable: user?.isDonorAvailable ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLocationSelect = (newCoords) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: newCoords,
    }));
  };

  const handleLocationSearchResult = ({ address, coordinates }) => {
    setFormData((prev) => ({
      ...prev,
      coordinates,
      address: address || prev.address,
    }));
  };

  const handleAddressResolve = (resolvedAddress) => {
    if (resolvedAddress) {
      setFormData((prev) => ({
        ...prev,
        address: resolvedAddress,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const [profileRes, locRes, availRes] = await Promise.all([
        api.patch('/users/me', {
          username: formData.username,
          address: formData.address,
          bloodGroup: formData.bloodGroup,
          contactSharingPreference: formData.contactSharingPreference,
        }),
        api.patch('/users/me/location', {
          coordinates: formData.coordinates,
          address: formData.address,
        }),
        api.patch('/users/me/donor-availability', {
          isDonorAvailable: formData.isDonorAvailable,
        }),
      ]);

      updateUserProfile({
        ...profileRes.data.user,
        location: locRes.data.location,
        isDonorAvailable: availRes.data.isDonorAvailable,
      });

      setSuccessMsg('Profile and donor coordinates updated successfully!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '36px 30px' }}>
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
            }}
          >
            <User size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Profile & Donor Settings</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Manage your personal information, registered blood group, and geolocation
            </p>
          </div>
        </div>

        {successMsg && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#34d399',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
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
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Account ID)</label>
              <input
                type="email"
                disabled
                className="form-input"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                value={formData.email}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                disabled
                className="form-input"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                value={formData.mobile}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Group</label>
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
          </div>

          {/* Donor Availability Toggle */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Donor Availability Status</strong>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Toggle off if you recently donated or are currently unavailable for requests
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, isDonorAvailable: !formData.isDonorAvailable })}
              className={`btn ${formData.isDonorAvailable ? 'btn-success' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              {formData.isDonorAvailable ? 'Available' : 'Unavailable'}
            </button>
          </div>

          {/* Primary Home Location Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Primary Donor Location (Search Locality, Click Map, or GPS)
              </label>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                [{formData.coordinates[1].toFixed(4)}, {formData.coordinates[0].toFixed(4)}]
              </span>
            </div>

            <LocationSearchBar
              onSelectLocation={handleLocationSearchResult}
              placeholder="Search your city, area, locality, or landmark..."
              initialValue={formData.address}
            />

            <LeafletMap
              center={formData.coordinates}
              pickerMode={true}
              onLocationSelect={handleLocationSelect}
              onAddressResolve={handleAddressResolve}
              height="240px"
              showRadius={false}
              centerTitle="Your Donor Location"
            />

            <input
              type="text"
              className="form-input"
              style={{ marginTop: '10px', fontSize: '0.85rem' }}
              value={formData.address}
              placeholder="Full detailed address (street, flat/door number, landmark)"
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
          >
            <Save size={16} />
            {saving ? 'Updating Profile...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
