import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  Droplet,
  Bell,
  User,
  LogOut,
  ShieldAlert,
  Compass,
  Menu,
  X,
  Radio,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useOffline } from '../context/OfflineContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isOnline } = useOffline();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        background: 'rgba(11, 15, 25, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 20px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.5)',
            }}
          >
            <Droplet size={22} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Blood<span style={{ color: '#ef4444' }}>Connect</span>
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                PWA
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              <span style={{ fontSize: '0.7rem', color: isOnline ? '#10b981' : '#f87171' }}>
                {isOnline ? 'Live Network' : 'Offline Engine'}
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        {isAuthenticated && (
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
            }}
            className="md-flex"
          >
            <Link
              to="/dashboard"
              className={`btn ${isActive('/dashboard') ? 'btn-secondary' : ''}`}
              style={{
                color: isActive('/dashboard') ? '#ffffff' : '#94a3b8',
                background: isActive('/dashboard') ? '#1e293b' : 'transparent',
                padding: '8px 14px',
                fontSize: '0.875rem',
              }}
            >
              <Activity size={16} />
              Dashboard
            </Link>

            <Link
              to="/requests/create"
              className={`btn ${isActive('/requests/create') ? 'btn-secondary' : ''}`}
              style={{
                color: isActive('/requests/create') ? '#ffffff' : '#94a3b8',
                background: isActive('/requests/create') ? '#1e293b' : 'transparent',
                padding: '8px 14px',
                fontSize: '0.875rem',
              }}
            >
              <Heart size={16} style={{ color: '#ef4444' }} />
              I Need Blood
            </Link>

            <Link
              to="/donations"
              className={`btn ${isActive('/donations') ? 'btn-secondary' : ''}`}
              style={{
                color: isActive('/donations') ? '#ffffff' : '#94a3b8',
                background: isActive('/donations') ? '#1e293b' : 'transparent',
                padding: '8px 14px',
                fontSize: '0.875rem',
              }}
            >
              <Radio size={16} style={{ color: '#38bdf8' }} />
              Donor Feed
            </Link>

            <Link
              to="/my-requests"
              className={`btn ${isActive('/my-requests') ? 'btn-secondary' : ''}`}
              style={{
                color: isActive('/my-requests') ? '#ffffff' : '#94a3b8',
                background: isActive('/my-requests') ? '#1e293b' : 'transparent',
                padding: '8px 14px',
                fontSize: '0.875rem',
              }}
            >
              <Layers size={16} />
              My Requests
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`btn ${isActive('/admin') ? 'btn-secondary' : ''}`}
                style={{
                  color: isActive('/admin') ? '#ffffff' : '#f59e0b',
                  background: isActive('/admin') ? '#1e293b' : 'transparent',
                  padding: '8px 14px',
                  fontSize: '0.875rem',
                }}
              >
                <ShieldAlert size={16} />
                Admin
              </Link>
            )}
          </div>
        )}

        {/* Right User Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated ? (
            <>
              {/* Blood group indicator */}
              <div className="badge-blood" title="Your Registered Blood Group">
                {user?.bloodGroup || 'A+'}
              </div>

              {/* Notifications bell */}
              <Link
                to="/notifications"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isActive('/notifications') ? '#1e293b' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Profile Link */}
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <User size={16} style={{ color: '#94a3b8' }} />
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#f1f5f9',
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.username}
                </span>
              </Link>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md-hidden"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                cursor: 'pointer',
                padding: '6px',
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isAuthenticated && mobileMenuOpen && (
        <div
          style={{
            background: '#0f172a',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          className="md-hidden"
        >
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            <Activity size={18} /> Dashboard
          </Link>
          <Link
            to="/requests/create"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-primary"
            style={{ justifyContent: 'flex-start' }}
          >
            <Heart size={18} /> I Need Blood
          </Link>
          <Link
            to="/donations"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            <Radio size={18} /> Donor Feed
          </Link>
          <Link
            to="/my-requests"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            <Layers size={18} /> My Requests
          </Link>
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            <User size={18} /> My Profile
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', color: '#f59e0b' }}
            >
              <ShieldAlert size={18} /> Admin Dashboard
            </Link>
          )}
        </div>
      )}

      {/* Responsive helper style */}
      <style>{`
        @media (min-width: 768px) {
          .md-flex { display: flex !important; }
          .md-hidden { display: none !important; }
        }
        @media (max-width: 767px) {
          .md-flex { display: none !important; }
          .md-hidden { display: block !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
