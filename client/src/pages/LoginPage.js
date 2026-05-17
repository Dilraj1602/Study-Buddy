import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import './css/login.css';
import { googleLogin } from '../api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, refreshUser, isAuthenticated, authLoading } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.email || !form.password) {
      alert('Please fill in all fields.');
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      alert('Please enter a valid email.');
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-heading">Log in</h2>
        <p className="login-subtitle">
          Continue tracking your study progress exactly where you left off.
        </p>

        {message && (
          <div className={`auth-message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="form-group">
          <div className="auth-input-shell">
            <Mail size={18} className="auth-input-icon" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="form-input"
              placeholder="Enter your email address"
            />
          </div>
        </div>

        <div className="form-group">
          <div className="password-input-container">
            <Lock size={18} className="auth-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="form-input"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="password-toggle-icon"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-google-row">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setLoading(true);
                const response = await googleLogin(credentialResponse.credential);
                if (response.data.success) {
                  await refreshUser();
                  navigate('/dashboard');
                }
              } catch (error) {
                alert('Google login failed. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            onError={() => {
              alert('Google login failed. Please try again.');
            }}
            text="signin"
            size="large"
          />
        </div>

        <div className="auth-links-row">
          <Link to="/reset-password" className="link-text">
            Forgot password?
          </Link>
          <span>Don't have an account?</span>
          <Link to="/register" className="link-text">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
