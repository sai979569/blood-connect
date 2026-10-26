import React, { useEffect, useState } from 'react';
import { ShieldAlert, Users, Heart, CheckCircle2, Clock, Activity, RefreshCw } from 'lucide-react';
import api from '../services/api.js';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, reqRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/requests'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
      ]);

      setStats(statsRes.data.stats);
      setRequests(reqRes.data.requests || []);
      setUsers(usersRes.data.users || []);
      setAuditLogs(logsRes.data.logs || []);
    } catch (err) {
      console.warn('[AdminDashboard] Error loading data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin & Moderation Console</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Real-time platform metrics, donor matching analytics, and system audit logs
            </p>
          </div>
        </div>

        <button onClick={fetchAdminData} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'pulse-glow' : ''} />
          Refresh Metrics
        </button>
      </div>

      {/* Analytics Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>REGISTERED USERS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {stats?.totalUsers || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
            {stats?.activeDonors || 0} Active Donors
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE REQUESTS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {stats?.activeRequests || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            {stats?.totalRequests || 0} Total Requests
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>DONOR MATCHES</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
            {stats?.totalMatches || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '4px' }}>
            {stats?.acceptedMatches || 0} Accepted Commitments
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>FULFILLMENT SUCCESS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {stats?.fulfillmentRate || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px' }}>
            {stats?.fulfilledRequests || 0} Successful Cases
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>All Blood Requests (Live Moderation)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Blood Group</th>
                <th style={{ padding: '10px' }}>Hospital</th>
                <th style={{ padding: '10px' }}>Requester</th>
                <th style={{ padding: '10px' }}>Current Radius</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Responses</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <span className="badge-blood" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>
                      {req.bloodGroup}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#f8fafc', fontWeight: 600 }}>{req.hospitalName}</td>
                  <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{req.requester?.username || 'Attendant'}</td>
                  <td style={{ padding: '12px 10px', color: '#60a5fa', fontWeight: 700 }}>{req.currentRadiusKm} km</td>
                  <td style={{ padding: '12px 10px' }}>
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
                  </td>
                  <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: 700 }}>
                    {req.positiveResponsesCount || 0} accepted
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Registered Donor & User Accounts</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Email</th>
                <th style={{ padding: '10px' }}>Mobile</th>
                <th style={{ padding: '10px' }}>Blood Group</th>
                <th style={{ padding: '10px' }}>Donor Status</th>
                <th style={{ padding: '10px' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 10px', color: '#f8fafc', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{u.email}</td>
                  <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{u.mobile}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className="badge-blood" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>
                      {u.bloodGroup}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ color: u.isDonorAvailable ? '#10b981' : '#64748b', fontWeight: 700 }}>
                      {u.isDonorAvailable ? 'Available' : 'Paused'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', textTransform: 'uppercase', color: u.role === 'admin' ? '#f59e0b' : '#94a3b8', fontWeight: 700 }}>
                    {u.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
