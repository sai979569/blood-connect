import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplet, AlertCircle, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LeafletMap from '../components/LeafletMap.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    bloodGroup: 'A+',
    address: 'AIIMS Complex, New Delhi',
    coordinates: [77.209, 28.5672], // [lng, lat]
    privacyConsent: false,
    contactSharingPreference: 'on_accept',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleLocationSelect = (newCoords) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: newCoords,
      address: `Selected GPS (${newCoords[1].toFixed(4)}, ${newCoords[0].toFixed(4)})`,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.privacyConsent) {
      setError('You must consent to location use and privacy terms to register');
      return;
    }

    setSubmitting(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        location: {
          type: 'Point',
          coordinates: formData.coordinates,
        },
        privacyConsent: formData.privacyConsent,
        contactSharingPreference: formData.contactSharingPreference,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '40px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
              marginBottom: '12px',
            }}
          >
            <Droplet size={26} color="#ffffff" fill="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.75rem' }}>Join the Blood Donor Network</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Register to donate or request blood during critical medical emergencies
          </p>
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Rahul Sharma"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                required
                className="form-input"
                placeholder="+91 98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Blood Group</label>
              <select
                className="form-select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} {bg === 'O-' ? '(Universal Donor)' : bg === 'AB+' ? '(Universal Recipient)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div style={{ marginTop: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Set Primary Donor / Home Location (Click map or use GPS)
              </label>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                [{formData.coordinates[1].toFixed(4)}, {formData.coordinates[0].toFixed(4)}]
              </span>
            </div>

            <LeafletMap
              center={formData.coordinates}
              pickerMode={true}
              onLocationSelect={handleLocationSelect}
              height="260px"
              showRadius={false}
            />

            <input
              type="text"
              className="form-input"
              style={{ marginTop: '10px', fontSize: '0.85rem' }}
              placeholder="Locality / Address description"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Privacy Consent Checkbox */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '24px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                fontSize: '0.85rem',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                required
                checked={formData.privacyConsent}
                onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked })}
                style={{ marginTop: '3px', accentColor: '#ef4444', width: '18px', height: '18px' }}
              />
              <span>
                I consent to the use of my approximate location for emergency blood donor matching.
                I understand my phone number and email remain{' '}
                <strong style={{ color: '#f8fafc' }}>
                  strictly private until I explicitly accept a donation request
                </strong>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {submitting ? 'Creating Profile...' : 'Complete Registration'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#94a3b8' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
