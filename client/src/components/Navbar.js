import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, authLoading, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  // Conditional rendering logic
  const isLanding = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';

  // Smooth scroll handler for anchor links
  const handleSmoothScroll = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Not logged in: show only on landing page
  if (authLoading) return null;
  if (!isAuthenticated && !isLanding) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 100,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '0 2.5rem',
          borderRadius: '16px',
          background: '#fff',
          boxSizing: 'border-box',
        }}
      >
        <Link to="/" style={{
          fontWeight: 900,
          fontSize: '1.7rem',
          color: '#2563eb',
          letterSpacing: '1px',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          textDecoration: 'none',
          textShadow: '0 2px 8px rgba(37,99,235,0.07)'
        }}>
          StudyTrack
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {/* Not logged in, on landing: Features, How it Works, Login/Sign Up */}
          {!isAuthenticated && isLanding && (
            <>
              <a href="#features" onClick={e => handleSmoothScroll(e, 'features')} style={{ color: '#222', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
              <a href="#testinomials" onClick={e => handleSmoothScroll(e, 'Testimonials')} style={{ color: '#222', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Testimonials</a>
              <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', border: '1.5px solid #2563eb', borderRadius: 8, padding: '0.4rem 1.1rem', marginLeft: 8 }}>Login / Sign Up</Link>
            </>
          )}
          {/* Logged in: Dashboard, Leaderboard, and Profile */}
          {isAuthenticated && (
            <>
              {!isDashboard && (
                <Link to="/dashboard" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', border: '1.5px solid #2563eb', borderRadius: 8, padding: '0.4rem 1.1rem' }}>Dashboard</Link>
              )}
              <Link to="/leaderboard" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', border: '1.5px solid #2563eb', borderRadius: 8, padding: '0.4rem 1.1rem' }}>Leaderboard</Link>
              <Link to="/tracking" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', border: '1.5px solid #2563eb', borderRadius: 8, padding: '0.4rem 1.1rem' }}>AI Insights</Link>
              <ProfileDropdown user={user} onLogout={handleSignOut} />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
