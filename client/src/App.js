import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AddEditTaskPage from './pages/AddEditTaskPage';
import NotFoundPage from './pages/NotFoundPage';
import DemoPage from './pages/DemoPage';
import LeaderboardPage from './pages/LeaderboardPage';
import TrackingPage from './pages/TrackingPage';
import './styles/global.css';
import ChatWidget from './components/ChatWidget';
import { useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return <div style={{textAlign:'center',marginTop:'3rem'}}>Checking authentication...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <style>{`html, body { overflow-x: hidden !important; width: 100vw !important; }`}</style>
      <div style={{ paddingTop: '4.5rem', width: '100vw', minWidth: 0, overflowX: 'hidden' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/add-task" element={<AddEditTaskPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/tracking" element={<PrivateRoute><TrackingPage /></PrivateRoute>} />
          <Route path="/demo" element={<DemoPage />} />
          {/* Redirect incorrect dashboard/login to login */}
          <Route path="/dashboard/login" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ChatWidget />
      </div>
    </Router>
  );
}

export default App;
