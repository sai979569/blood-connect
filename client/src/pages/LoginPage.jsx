import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplet, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response) {
        const resData = err.response.data;
        if (resData?.message) {
          setError(resData.message);
        } else if (err.response.status === 401) {
          setError('Invalid email or password. Please verify credentials.');
        } else if (err.response.status === 403) {
          setError('Account is inactive. Please contact support.');
        } else {
          setError(`Login failed (HTTP ${err.response.status}).`);
        }
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Server request timed out. The backend is waking up, please retry in a moment.');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('You are currently offline. Please check your internet connection.');
      } else {
        setError('Cannot connect to emergency backend server. Please verify your connection or retry shortly.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div
      style={{
        maxWidth: '460px',
        margin: '50px auto',
        padding: '0 20px',
      }}
    >
      <div className="glass-panel" style={{ padding: '36px 30px' }}>
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
          <h2 style={{ fontSize: '1.6rem' }}>Welcome Back</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Sign in to access your blood requests & donor alerts
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
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Instant Demo Quick-Fill Buttons */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
              color: '#f59e0b',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <Sparkles size={14} />
            Quick Demo Autofill:
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillDemoAccount('requester@bloodconnect.org')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Requester (Rahul)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('donor.aarav@bloodconnect.org')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Donor 1 (0.6 km)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('donor.vikram@bloodconnect.org')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Donor 3 (2.2 km)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@bloodconnect.org')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: '#94a3b8' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}>
            Register as a Donor
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
