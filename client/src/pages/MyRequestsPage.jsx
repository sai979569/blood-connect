import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Compass, CheckCircle2, Plus, Clock, MapPin, RefreshCw } from 'lucide-react';
import api from '../services/api.js';

export const MyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests/mine');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.warn('[MyRequests] Error fetching requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>My Blood Requests</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Track active live radar perimeters, donor matches, and responses
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={fetchRequests} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'pulse-glow' : ''} />
            Refresh
          </button>
          <Link to="/requests/create" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Plus size={16} />
            New Request
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={30} className="pulse-glow" style={{ margin: '0 auto 10px' }} />
          <p>Loading your blood requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Heart size={44} style={{ color: '#475569', margin: '0 auto 16px' }} />
          <h3>No Requests Created Yet</h3>
          <p style={{ color: '#94a3b8', margin: '8px auto 20px', maxWidth: '400px', fontSize: '0.9rem' }}>
            When you need blood units for surgery or an emergency, post a request to search nearby donors.
          </p>
          <Link to="/requests/create" className="btn btn-primary">
            Create Blood Request
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req) => (
            <div key={req._id} className="glass-panel" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge-blood" style={{ fontSize: '1rem', padding: '6px 12px' }}>
                    {req.bloodGroup}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                      {req.units} Unit(s) {req.bloodComponent}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Created: {new Date(req.createdAt).toLocaleDateString()} at{' '}
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`badge-status ${
                      req.status === 'active'
                        ? 'badge-active'
                        : req.status === 'fulfilled'
                        ? 'badge-fulfilled'
                        : 'badge-radius'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '14px' }}>
                <MapPin size={14} style={{ display: 'inline', color: '#ef4444', marginRight: '6px' }} />
                <strong>{req.hospitalName}</strong> &bull; {req.hospitalAddress}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Compass size={16} style={{ color: '#60a5fa' }} />
                    <span>Search Radius: <strong style={{ color: '#f8fafc' }}>{req.currentRadiusKm} km</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    <span>Accepted: <strong style={{ color: '#10b981' }}>{req.positiveResponsesCount || 0}</strong></span>
                  </div>
                </div>

                <Link
                  to={`/requests/${req._id}`}
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  Open Live Radar &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage;
