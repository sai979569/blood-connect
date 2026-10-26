import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { OfflineProvider } from './context/OfflineContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

import Navbar from './components/Navbar.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ToastAlert from './components/ToastAlert.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CreateRequestPage from './pages/CreateRequestPage.jsx';
import RequestDetailsPage from './pages/RequestDetailsPage.jsx';
import DonorDashboardPage from './pages/DonorDashboardPage.jsx';
import MyRequestsPage from './pages/MyRequestsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <OfflineProvider>
            <NotificationProvider>
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <OfflineBanner />
                <Navbar />

                <main style={{ flex: 1, paddingBottom: '60px' }}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/requests/create"
                      element={
                        <ProtectedRoute>
                          <CreateRequestPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/requests/:id"
                      element={
                        <ProtectedRoute>
                          <RequestDetailsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/donations"
                      element={
                        <ProtectedRoute>
                          <DonorDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/my-requests"
                      element={
                        <ProtectedRoute>
                          <MyRequestsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                <ToastAlert />
              </div>
            </NotificationProvider>
          </OfflineProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
