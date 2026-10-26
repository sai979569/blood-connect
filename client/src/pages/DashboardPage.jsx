import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Radio,
  Clock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  RefreshCw,
  Bell,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export const DashboardPage = () => {
  const { user, updateUserProfile } = useAuth();
  const [activeRequests, setActiveRequests] = useState([]);
  const [matchedRequests, setMatchedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [myReqRes, matchesRes] = await Promise.all([
          api.get('/requests/mine'),
          api.get('/matches/mine'),
        ]);

        setActiveRequests(myReqRes.data.requests || []);
        setMatchedRequests(matchesRes.data.matches || []);
      } catch (err) {
        console.warn('[DashboardPage] Error loading dashboard items:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleToggleAvailability = async () => {
    setTogglingAvailability(true);
    const newStatus = !user.isDonorAvailable;
    try {
      await api.patch('/users/me/donor-availability', { isDonorAvailable: newStatus });
      updateUserProfile({ isDonorAvailable: newStatus });
    } catch (err) {
      alert('Could not update donor availability: ' + err.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Top Welcome & Profile Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
            }}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
              {user?.bloodGroup || 'A+'}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome, {user?.username}!</h2>
              <span className="badge-blood" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                {user?.bloodGroup} Registered
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
              <MapPin size={14} style={{ color: '#ef4444' }} />
              <span>{user?.address || 'Location registered via GPS'}</span>
            </div>
          </div>
        </div>

        {/* Donor Availability Switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>DONOR STATUS</div>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: user?.isDonorAvailable ? '#10b981' : '#94a3b8',
              }}
            >
              {user?.isDonorAvailable ? 'Active & Available to Donate' : 'Temporarily Unavailable'}
            </div>
          </div>

          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`btn ${user?.isDonorAvailable ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            {user?.isDonorAvailable ? 'Available' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Two Primary Action Banners */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '36px',
        }}
      >
        {/* Action A: I Need Blood */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={22} style={{ color: '#f87171' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fca5a5', letterSpacing: '0.05em' }}>
                EMERGENCY MEDICAL ASSISTANCE
              </span>
              <h3 style={{ fontSize: '1.4rem' }}>I Need Blood</h3>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            Create an urgent blood request with GPS matching. Our adaptive search perimeter expands automatically
            from 1 km to 10 km until donors respond.
          </p>
          <Link
            to="/requests/create"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
          >
            <Heart size={18} />
            Post Blood Request Now
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Action B: I Want to Donate */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={22} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#bae6fd', letterSpacing: '0.05em' }}>
                COMMUNITY DONATION FEED
              </span>
              <h3 style={{ fontSize: '1.4rem' }}>I Want to Donate</h3>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            View emergency requests matched to your blood group and location. Express interest, accept donation
            commitments, and manage contact sharing.
          </p>
          <Link
            to="/donations"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
          >
            <Radio size={18} style={{ color: '#38bdf8' }} />
            Open Donor Request Feed
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Grid: My Requests Radar + Nearby Donor Matches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Column 1: Active Blood Requests (Created by User) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '1.15rem' }}>My Created Requests</h3>
            </div>
            <Link to="/my-requests" style={{ fontSize: '0.8rem', color: '#f87171', textDecoration: 'none', fontWeight: 600 }}>
              View All ({activeRequests.length}) &rarr;
            </Link>
          </div>

          {activeRequests.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <Heart size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>You have not posted any active blood requests yet.</p>
              <Link to="/requests/create" className="btn btn-primary" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                Create New Request
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeRequests.slice(0, 3).map((req) => (
                <div key={req._id} className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-blood">{req.bloodGroup}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{req.units} Unit(s) {req.bloodComponent}</span>
                    </div>
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

                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '8px' }}>
                    <strong>{req.hospitalName}</strong> &bull; {req.hospitalAddress}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Compass size={14} style={{ color: '#60a5fa' }} />
                      <span>Radius: <strong style={{ color: '#f8fafc' }}>{req.currentRadiusKm} km</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      <span>{req.positiveResponsesCount || 0} Accepted</span>
                    </div>

                    <Link
                      to={`/requests/${req._id}`}
                      style={{ color: '#f87171', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Live Radar &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Requests Matched to You (As Donor) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} style={{ color: '#38bdf8' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Nearby Alerts for You</h3>
            </div>
            <Link to="/donations" style={{ fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
              Donor Feed ({matchedRequests.length}) &rarr;
            </Link>
          </div>

          {matchedRequests.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <Radio size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No pending donor requests within your current radius.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                You will receive instant alerts here when someone nearby needs your blood group ({user?.bloodGroup}).
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matchedRequests.slice(0, 3).map((match) => (
                <div key={match._id} className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-blood">{match.requestId?.bloodGroup || 'A+'}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {match.requestId?.hospitalName || 'Emergency Hospital'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {match.distanceKm} km away
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
                    Urgency: <strong style={{ textTransform: 'uppercase', color: '#ef4444' }}>{match.requestId?.urgency || 'High'}</strong> &bull; Current Status: <strong style={{ textTransform: 'capitalize' }}>{match.status}</strong>
                  </div>

                  <Link
                    to="/donations"
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                  >
                    Respond to this Request
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
