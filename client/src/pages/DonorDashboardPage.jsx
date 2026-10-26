import React, { useEffect, useState, useCallback } from 'react';
import {
  Radio,
  Heart,
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  PhoneCall,
  Check,
} from 'lucide-react';
import api from '../services/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export const DonorDashboardPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.get('/matches/mine');
      setMatches(res.data.matches || []);
    } catch (err) {
      console.warn('[DonorDashboard] Failed to fetch donor matches:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Refresh upon real-time notification
  useEffect(() => {
    if (!socket) return;
    const handleNewAlert = () => fetchMatches();
    socket.on('notification:new', handleNewAlert);
    return () => socket.off('notification:new', handleNewAlert);
  }, [socket, fetchMatches]);

  const handleRespond = async (matchId, status) => {
    setRespondingId(matchId);
    try {
      await api.post(`/matches/${matchId}/respond`, {
        status,
        contactConsentGiven: status === 'accepted',
      });
      await fetchMatches();
    } catch (err) {
      alert('Error updating response: ' + (err.response?.data?.message || err.message));
    } finally {
      setRespondingId(null);
    }
  };

  const handleToggleConsent = async (matchId, currentConsent) => {
    try {
      await api.post(`/matches/${matchId}/contact-consent`, {
        consent: !currentConsent,
      });
      await fetchMatches();
    } catch (err) {
      alert('Error changing consent: ' + err.message);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(2, 132, 199, 0.4)',
            }}
          >
            <Radio size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Donor Coordination Feed</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Emergencies matched to your registered blood group ({user?.bloodGroup})
            </p>
          </div>
        </div>

        <button
          onClick={fetchMatches}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={loading ? 'pulse-glow' : ''} />
          Refresh Feed
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={30} className="pulse-glow" style={{ margin: '0 auto 10px' }} />
          <p>Scanning for nearby emergency matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Radio size={44} style={{ color: '#475569', margin: '0 auto 16px' }} />
          <h3>No Pending Requests in Your Radius</h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '8px auto 0', fontSize: '0.9rem' }}>
            There are currently no active blood requests needing {user?.bloodGroup} within your immediate perimeter.
            When a hospital or patient nearby submits a request, you will receive an instant real-time alert!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {matches.map((item) => {
            const req = item.requestId;
            if (!req) return null;

            const isAccepted = item.status === 'accepted';
            const isDeclined = item.status === 'declined';
            const isPending = item.status === 'notified';

            return (
              <div
                key={item._id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderColor: isAccepted
                    ? 'rgba(16, 185, 129, 0.4)'
                    : isDeclined
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge-blood" style={{ fontSize: '1rem', padding: '6px 14px' }}>
                      {req.bloodGroup}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {req.hospitalName}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Requested by: <strong>{req.requester?.username || 'Attendant'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {item.distanceKm} km away
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background:
                          req.urgency === 'critical'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(245, 158, 11, 0.2)',
                        color: req.urgency === 'critical' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {req.urgency}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '14px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>COMPONENT & UNITS</span>
                    <strong style={{ color: '#f8fafc' }}>{req.units} Unit(s) {req.bloodComponent}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>HOSPITAL ADDRESS</span>
                    <strong style={{ color: '#f8fafc' }}>{req.hospitalAddress}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>YOUR STATUS</span>
                    <strong
                      style={{
                        color: isAccepted ? '#10b981' : isDeclined ? '#f87171' : '#38bdf8',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.status}
                    </strong>
                  </div>
                </div>

                {/* Donor Action Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleRespond(item._id, 'accepted')}
                          disabled={respondingId === item._id}
                          className="btn btn-success"
                          style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                        >
                          <CheckCircle2 size={16} />
                          Accept & Donate
                        </button>
                        <button
                          onClick={() => handleRespond(item._id, 'declined')}
                          disabled={respondingId === item._id}
                          className="btn btn-danger-outline"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          <XCircle size={16} />
                          Decline
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={16} /> You accepted this donation request!
                        </span>
                        <button
                          onClick={() => handleRespond(item._id, 'withdrawn')}
                          disabled={respondingId === item._id}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Withdraw Commitment
                        </button>
                      </div>
                    )}

                    {isDeclined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>You declined this request.</span>
                        <button
                          onClick={() => handleRespond(item._id, 'accepted')}
                          disabled={respondingId === item._id}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Change to Accept
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Privacy-Controlled Contact Sharing Toggle */}
                  {isAccepted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.825rem',
                          color: item.contactConsentGiven ? '#34d399' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.contactConsentGiven}
                          onChange={() => handleToggleConsent(item._id, item.contactConsentGiven)}
                          style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                        />
                        <Shield size={14} />
                        Share my phone number with requester ({user?.mobile})
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonorDashboardPage;
