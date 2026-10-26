import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Radio,
  Compass,
  WifiOff,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Zap,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Hero Section */}
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px 40px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '9999px',
            padding: '6px 16px',
            marginBottom: '24px',
          }}
        >
          <span className="status-dot online" />
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fca5a5' }}>
            Next-Gen Blood Donor Coordination PWA
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
          }}
        >
          Every Second Counts.
          <br />
          <span className="gradient-blood">Connect With Nearby Donors Fast.</span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: '#94a3b8',
            maxWidth: '680px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}
        >
          Blood Connect is a location-aware donor network featuring{' '}
          <strong style={{ color: '#f8fafc' }}>adaptive radius search (1–10 km)</strong>,{' '}
          <strong style={{ color: '#f8fafc' }}>offline PWA request sync</strong>, and{' '}
          <strong style={{ color: '#f8fafc' }}>privacy-controlled contact disclosure</strong>.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to={isAuthenticated ? '/requests/create' : '/register'}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1.05rem' }}
          >
            <Heart size={20} />
            I Need Blood Now
          </Link>

          <Link
            to={isAuthenticated ? '/donations' : '/login'}
            className="btn btn-secondary"
            style={{ padding: '14px 28px', fontSize: '1.05rem' }}
          >
            <Radio size={20} style={{ color: '#38bdf8' }} />
            Register as Donor
          </Link>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '60px',
        }}
      >
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <Compass size={24} style={{ color: '#60a5fa' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Adaptive Radius Engine</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.6 }}>
            Requests begin scanning at 1 km. If responses are insufficient, our background engine
            automatically expands the perimeter up to 10 km without spamming previous donors.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '28px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <WifiOff size={24} style={{ color: '#f87171' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Offline PWA & Sync</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.6 }}>
            Hospital basements often lose connectivity. Draft blood requests locally in IndexedDB with
            cryptographic idempotency keys, replaying safely once internet returns.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '28px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <ShieldCheck size={24} style={{ color: '#34d399' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Privacy-First Consent</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.6 }}>
            Donors are never subjected to public phone number leaks. Donor contact details are strictly
            shielded until the donor explicitly accepts and grants consent.
          </p>
        </div>
      </div>

      {/* Quick Demo Credentials Card */}
      <div
        className="glass-card"
        style={{
          marginTop: '50px',
          borderColor: 'rgba(220, 38, 38, 0.3)',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Zap size={22} style={{ color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1.15rem' }}>Instant Evaluation & Demo Accounts</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
          All seeded accounts use password: <code style={{ color: '#fca5a5' }}>password123</code>.
          You can test every feature immediately:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ background: '#090e1a', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Primary Requester</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              requester@bloodconnect.org
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>A+ Blood Need at AIIMS</div>
          </div>

          <div style={{ background: '#090e1a', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Donor 1 (In 1km Radius)</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              donor.aarav@bloodconnect.org
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>0.6 km away (A+)</div>
          </div>

          <div style={{ background: '#090e1a', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Donor 3 (Expands to 2.2km)</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              donor.vikram@bloodconnect.org
            </div>
            <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>2.2 km away (A+)</div>
          </div>

          <div style={{ background: '#090e1a', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Administrator</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              admin@bloodconnect.org
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Full System Moderation</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
