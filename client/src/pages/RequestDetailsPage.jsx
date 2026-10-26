import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  UserCheck,
  Shield,
  RefreshCw,
  XCircle,
  Radio,
  MapPin,
  Sparkles,
  MessageSquare,
  Check,
} from 'lucide-react';
import api from '../services/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import LeafletMap from '../components/LeafletMap.jsx';

export const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinRequestRoom, leaveRequestRoom } = useSocket();

  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanding, setExpanding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    try {
      const reqRes = await api.get(`/requests/${id}`);
      setRequest(reqRes.data.request);

      try {
        const matchesRes = await api.get(`/requests/${id}/matches`);
        setMatches(matchesRes.data.matches || []);
      } catch (matchErr) {
        // If not authorized to view all matches, set matches to empty array gracefully
        setMatches([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch request details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  // Real-time socket room subscription
  useEffect(() => {
    joinRequestRoom(id);

    if (socket) {
      const handleRadiusUpdate = (data) => {
        console.log('[LiveRadar] Radius updated in real-time:', data);
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                currentRadiusKm: data.currentRadiusKm,
                matchedDonorsCount: data.matchedDonorsCount,
                expansionHistory: data.expansionHistory || prev.expansionHistory,
              }
            : prev
        );
        // Refresh matches list to load new donors
        api.get(`/requests/${id}/matches`).then((res) => setMatches(res.data.matches || []));
      };

      const handleDonorResponse = (data) => {
        console.log('[LiveRadar] Donor response received:', data);
        fetchRequestDetails();
      };

      const handleContactShared = (data) => {
        console.log('[LiveRadar] Donor contact shared:', data);
        fetchRequestDetails();
      };

      const handleStatusChange = () => {
        fetchRequestDetails();
      };

      socket.on('request:radius_updated', handleRadiusUpdate);
      socket.on('request:donor_response', handleDonorResponse);
      socket.on('request:contact_shared', handleContactShared);
      socket.on('request:fulfilled', handleStatusChange);
      socket.on('request:cancelled', handleStatusChange);

      return () => {
        leaveRequestRoom(id);
        socket.off('request:radius_updated', handleRadiusUpdate);
        socket.off('request:donor_response', handleDonorResponse);
        socket.off('request:contact_shared', handleContactShared);
        socket.off('request:fulfilled', handleStatusChange);
        socket.off('request:cancelled', handleStatusChange);
      };
    }
  }, [id, socket, joinRequestRoom, leaveRequestRoom, fetchRequestDetails]);

  // Controlled test feature: manual radius expansion trigger
  const handleTriggerExpansion = async () => {
    setExpanding(true);
    try {
      const res = await api.post(`/requests/${id}/evaluate-radius`, { forceExpand: true });
      setRequest(res.data.request);
      // Refresh matches
      const matchesRes = await api.get(`/requests/${id}/matches`);
      setMatches(matchesRes.data.matches || []);
    } catch (err) {
      alert('Radius expansion error: ' + (err.response?.data?.message || err.message));
    } finally {
      setExpanding(false);
    }
  };

  const handleFulfill = async () => {
    if (!window.confirm('Mark this blood request as fulfilled?')) return;
    setActionLoading(true);
    try {
      await api.post(`/requests/${id}/fulfill`);
      await fetchRequestDetails();
    } catch (err) {
      alert('Error fulfilling request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Reason for cancellation (optional):', 'Arranged alternative source');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await api.post(`/requests/${id}/cancel`, { reason });
      await fetchRequestDetails();
    } catch (err) {
      alert('Error cancelling request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDonorRespond = async (matchId, status) => {
    setActionLoading(true);
    try {
      await api.post(`/matches/${matchId}/respond`, {
        status,
        contactConsentGiven: status === 'accepted',
      });
      await fetchRequestDetails();
    } catch (err) {
      alert('Error updating response: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleConsent = async (matchId, currentConsent) => {
    setActionLoading(true);
    try {
      await api.post(`/matches/${matchId}/contact-consent`, {
        consent: !currentConsent,
      });
      await fetchRequestDetails();
    } catch (err) {
      alert('Error toggling contact consent: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
        <RefreshCw size={36} className="pulse-glow" style={{ margin: '0 auto 12px' }} />
        <p>Loading Live Radar and geospatial matching data...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <h3>Error Loading Blood Request</h3>
          <p style={{ color: '#94a3b8', marginTop: '6px' }}>{error || 'Request not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginTop: '20px' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = request.status === 'fulfilled' || request.status === 'cancelled';
  const isMaxRadius = request.currentRadiusKm >= request.maxRadiusKm;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Top Banner: Status & Key Indicators */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
            }}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {request.bloodGroup}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {request.units} Unit(s) {request.bloodComponent} Needed
              </h2>
              <span
                className={`badge-status ${
                  request.status === 'active'
                    ? 'badge-active'
                    : request.status === 'fulfilled'
                    ? 'badge-fulfilled'
                    : 'badge-radius'
                }`}
              >
                {request.status}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                }}
              >
                {request.urgency} Urgency
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
              <MapPin size={14} style={{ color: '#ef4444' }} />
              <strong>{request.hospitalName}</strong> &bull; {request.hospitalAddress}
            </div>
          </div>
        </div>

        {/* Action Buttons for Requester */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {request.status === 'active' && (
            <>
              <button
                onClick={handleFulfill}
                disabled={actionLoading}
                className="btn btn-success"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <CheckCircle2 size={16} />
                Mark as Fulfilled
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-danger-outline"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <XCircle size={16} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid: Map Live Radar & Adaptive Metrics Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Left: Leaflet Map with Search Radius & Donors */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Geospatial Search Perimeter</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot online" />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Socket Feed</span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '360px' }}>
            <LeafletMap
              center={request.location.coordinates}
              radiusKm={request.currentRadiusKm}
              donors={matches}
              height="380px"
              showRadius={true}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <span>* Red pulsing pin = Hospital location</span>
            <span>* Red dashed circle = Active search radius</span>
            <span>* Green pins = Accepted donors</span>
          </div>
        </div>

        {/* Right: Adaptive Search Deck & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metrics summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                Search Radius
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
                {request.currentRadiusKm} <span style={{ fontSize: '1rem', fontWeight: 600 }}>km</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Max Limit: {request.maxRadiusKm} km</div>
            </div>

            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                Matched Donors
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
                {request.matchedDonorsCount || matches.length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Target: {request.donorTarget}</div>
            </div>

            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                Responses
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                {request.positiveResponsesCount || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {request.declinedResponsesCount || 0} Declined
              </div>
            </div>
          </div>

          {/* Adaptive Radius Engine Control Box */}
          <div
            className="glass-card"
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} style={{ color: '#ef4444' }} />
                <h4 style={{ fontSize: '1rem' }}>Adaptive Perimeter Engine</h4>
              </div>

              {isMaxRadius && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                  }}
                >
                  MAX LIMIT REACHED (10 KM)
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
              The background evaluation scheduler evaluates responses every few minutes. If additional donors are
              needed, it increments the radius (1km &rarr; 2km &rarr; 4km &rarr; 10km) and notifies newly eligible donors.
            </p>

            {/* Test Trigger Button for immediate demonstration */}
            {request.status === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleTriggerExpansion}
                  disabled={expanding || isMaxRadius}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: '0.85rem',
                    padding: '10px',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                  }}
                >
                  <Sparkles size={16} style={{ color: '#f59e0b' }} />
                  {expanding ? 'Scanning & Expanding...' : 'Expand Search Radius Now (Dev Test)'}
                </button>
              </div>
            )}

            {isMaxRadius && request.positiveResponsesCount < request.donorTarget && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                }}
              >
                <strong>Maximum Search Radius Reached (10 km):</strong> We recommend reaching out to hospital blood banks,
                Red Cross, or emergency helplines directly.
              </div>
            )}
          </div>

          {/* Expansion History Timeline */}
          <div className="glass-card" style={{ padding: '20px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} style={{ color: '#60a5fa' }} />
              <h4 style={{ fontSize: '0.95rem' }}>Expansion History Timeline</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(request.expansionHistory || []).map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.8rem',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span className="badge-blood" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                    {step.radiusKm} km
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{step.reason}</div>
                    <div style={{ color: '#64748b', fontSize: '0.725rem' }}>
                      {new Date(step.expandedAt).toLocaleTimeString()} &bull; Discovered {step.donorsFound} donor(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Matched Donors Deck with Privacy-Controlled Disclosure */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={22} style={{ color: '#10b981' }} />
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Matched Donors Summary</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
                Contact information is strictly shielded until the donor explicitly accepts and gives consent
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 12px',
              borderRadius: '9999px',
              color: '#cbd5e1',
            }}
          >
            {matches.length} Total Matched
          </span>
        </div>

        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <Clock size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '6px' }}>
              No Donors Found Within Current {request.currentRadiusKm} km Radius
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
              There are currently no compatible available donors within the immediate {request.currentRadiusKm} km perimeter.
              {request.status === 'active' && !isMaxRadius && (
                <span> The adaptive engine will expand the boundary automatically in steps (up to {request.maxRadiusKm} km) to notify eligible donors.</span>
              )}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {matches.map((item) => {
              const isAccepted = item.status === 'accepted';
              const isDeclined = item.status === 'declined';
              const isPending = item.status === 'notified';
              const hasConsented = item.contactConsentGiven && isAccepted;
              const contact = item.donor?.contact;
              const isCurrentUserDonor = user && (user._id === item.donor?._id || user._id === item.donorId);

              const statusBadgeConfig = {
                accepted: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Accepted' },
                declined: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', label: 'Declined' },
                withdrawn: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', label: 'Withdrawn' },
                notified: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'Awaiting Response' },
              }[item.status] || { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: item.status };

              return (
                <div
                  key={item.matchId}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    borderColor: isAccepted
                      ? 'rgba(16, 185, 129, 0.4)'
                      : isDeclined
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    background: isAccepted
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'rgba(30, 41, 59, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge-blood" style={{ padding: '4px 10px', fontSize: '0.9rem' }}>
                        {item.donor?.bloodGroup || 'A+'}
                      </span>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                          {item.donor?.username || 'Registered Donor'}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                            ~{item.distanceKm} km away
                          </span>
                          &bull;
                          <span style={{ color: item.donor?.isAvailable ? '#10b981' : '#f59e0b' }}>
                            {item.donor?.isAvailable ? 'Available' : 'Busy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: statusBadgeConfig.bg,
                        color: statusBadgeConfig.text,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusBadgeConfig.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} />
                    <span>Notified: {new Date(item.notifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.respondedAt && (
                      <span>&bull; Responded: {new Date(item.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>

                  {/* Donor Action Controls if current viewer is the matched donor */}
                  {isCurrentUserDonor && request.status === 'active' && (
                    <div
                      style={{
                        background: 'rgba(2, 132, 199, 0.1)',
                        border: '1px solid rgba(2, 132, 199, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                        You are matched to this emergency request!
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleDonorRespond(item.matchId, 'accepted')}
                              disabled={actionLoading}
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              <CheckCircle2 size={14} /> Accept & Donate
                            </button>
                            <button
                              onClick={() => handleDonorRespond(item.matchId, 'declined')}
                              disabled={actionLoading}
                              className="btn btn-danger-outline"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              <XCircle size={14} /> Decline
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                                <Check size={14} style={{ display: 'inline' }} /> You accepted this request
                              </span>
                              <button
                                onClick={() => handleDonorRespond(item.matchId, 'withdrawn')}
                                disabled={actionLoading}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.725rem' }}
                              >
                                Withdraw
                              </button>
                            </div>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.8rem',
                                color: item.contactConsentGiven ? '#34d399' : '#94a3b8',
                                cursor: 'pointer',
                                marginTop: '8px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={item.contactConsentGiven}
                                onChange={() => handleToggleConsent(item.matchId, item.contactConsentGiven)}
                                style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                              />
                              <Shield size={14} /> Share my contact number with requester
                            </label>
                          </div>
                        )}

                        {isDeclined && (
                          <button
                            onClick={() => handleDonorRespond(item.matchId, 'accepted')}
                            disabled={actionLoading}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Change to Accept
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Privacy Controlled Contact Block */}
                  {hasConsented && contact ? (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        padding: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#34d399',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          marginBottom: '4px',
                        }}
                      >
                        <Shield size={14} />
                        Donor Shared Contact Details:
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                        {contact.username}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {contact.mobile && (
                          <a
                            href={`tel:${contact.mobile}`}
                            className="btn btn-success"
                            style={{ flex: 1, minWidth: '130px', padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center' }}
                          >
                            <Phone size={14} />
                            Call {contact.mobile}
                          </a>
                        )}
                        {contact.mobile && (
                          <a
                            href={`https://wa.me/${contact.mobile.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ flex: 1, minWidth: '130px', padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.4)' }}
                          >
                            <MessageSquare size={14} />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px dashed rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '10px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '0.775rem',
                      }}
                    >
                      <Shield size={14} style={{ margin: '0 auto 4px', color: '#94a3b8' }} />
                      Contact details protected under privacy consent protocol until donor accepts.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailsPage;
