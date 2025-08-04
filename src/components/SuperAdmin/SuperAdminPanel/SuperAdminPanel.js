import React, { useEffect, useState, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { SocketContext } from '../../../App.js';
import AddAdminForm from './AddAdminForm.js';
import ProductList from '../../Product/ProductList.js';
import './SuperAdminPanel.css';
import SuperAdminSidebar from './SuperAdminSidebar';
import CreateDepartment from './CreateDepartment';
import SoldProductsReport from './SoldProductsReport.js';
import FinancialPage from './FinancialPage.js';
import StaffList from './StaffList';
import AppointmentsList from './AppointmentsList';
import LeaveRequests from './LeaveRequests';
import PunchingTimes from './PunchingTimes';
import TerminatedStaff from './TerminatedStaff';
import ProfitAnalysisPage from './ProfitAnalysisPage.js';
import ResetPasswordPage from './ResetPasswordPage.js';
import AddCompanyPage from './AddCompanyPage.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const SuperAdminPanel = () => {
  const socket = useContext(SocketContext);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('connect', () => {
      console.log('WebSocket connected in SuperAdminPanel:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error in SuperAdminPanel:', err.message);
      setMessage({ type: 'error', text: 'Real-time updates unavailable' });
    });

    socket.on('stock-alert', (data) => {
      setNotifications((prevNotifications) => [...prevNotifications, data.message]);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('stock-alert');
    };
  }, [socket]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) throw new Error('Missing authentication data');
        const storedUser = JSON.parse(userStr);
        const decoded = jwtDecode(token);
        if (!decoded || decoded.exp < Date.now() / 1000) throw new Error('Token expired');

        const storedId = storedUser.id || storedUser._id || storedUser.email;
        const decodedId = decoded.id || decoded._id || decoded.email;
        if (storedId !== decodedId) throw new Error('User data mismatch');

        if (storedUser.role !== 'super_admin') throw new Error('Access denied: Not Super Admin');

        setUser(storedUser);
      } catch (err) {
        setError(err.message);
        localStorage.clear();
        navigate('/login');
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    const fetchPermissionRequests = async () => {
      try {
        let token = localStorage.getItem('token');
        if (!token || token.split('.').length !== 3) throw new Error('Invalid token');
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          token = await refreshAccessToken();
          if (!token) throw new Error('Failed to refresh token');
        }

        const response = await axios.get('http://localhost:5000/api/requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPermissionRequests(response.data.data || []);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
        setError('Failed to fetch permission requests. Please try again.');
      }
    };

    const refreshAccessToken = async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('http://localhost:5000/api/auth/refresh-token', { refreshToken });
        const { token } = response.data;
        localStorage.setItem('token', token);
        return token;
      } catch (error) {
        localStorage.clear();
        navigate('/login');
        return null;
      }
    };

    if (user && user.role === 'super_admin') {
      fetchPermissionRequests();
      const interval = setInterval(fetchPermissionRequests, 60000);
      return () => clearInterval(interval);
    }
  }, [navigate, user]);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting('🌅 Good Morning, Super Admin!');
    else if (hours < 18) setGreeting('☀️ Good Afternoon, Super Admin!');
    else setGreeting('🌙 Good Evening, Super Admin!');

    const timer = setTimeout(() => setShowGreeting(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handlePermissionResponse = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          processedBy: user?.email,
          processedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to process permission request');

      setPermissionRequests(permissionRequests.filter((req) => req._id !== requestId));
      setMessage({ type: 'success', text: `Permission request ${status} successfully.` });
    } catch (error) {
      setError('Failed to process permission request. Please try again.');
    }
  };

  return (
    <div className="dashboard">
      <SuperAdminSidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        handleLogout={handleLogout}
        user={user}
        setUser={setUser}
      />

      <div className="notification-container">
        <button className="notification-button" onClick={() => setShowNotifications(!showNotifications)}>
          <i className="fa fa-bell"></i>
          {permissionRequests.length > 0 && (
            <span className="notification-badge">{permissionRequests.length}</span>
          )}
          {notifications.length > 0 && (
            <span className="stock-alert-badge">{notifications.length}</span>
          )}
        </button>
        {showNotifications && (
          <div className="notification-dropdown">
            <h4>Permission Requests</h4>
            {permissionRequests.length === 0 ? (
              <p>No permission requests.</p>
            ) : (
              permissionRequests.map((request) => (
                <div key={request._id} className="notification-item">
                  <p>
                    {request.requestedBy} wants to {request.action} bill #{request.resourceId}
                  </p>
                  <div className="notification-actions">
                    <button onClick={() => handlePermissionResponse(request._id, 'approved')}>Approve</button>
                    <button onClick={() => handlePermissionResponse(request._id, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))
            )}

            <h4>Stock Alerts</h4>
            {notifications.length === 0 ? (
              <p>No new stock alerts</p>
            ) : (
              <ul className="stock-alerts-list">
                {notifications.map((notification, index) => (
                  <li key={index} className="stock-alert-item">{notification}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <main className="panel-content">
        {showGreeting && (
          <div className="greeting-banner">
            <p>{greeting}</p>
          </div>
        )}

        {(message.text || error) && (
          <div className={`message ${message.type || 'error'}`}>
            {message.text || error}
          </div>
        )}

        <Routes>
          <Route path="/add-admin" element={<AddAdminForm />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/create-department" element={<CreateDepartment />} />
          <Route path="/sold-products" element={<SoldProductsReport />} />
          <Route path="/financials" element={<FinancialPage />} />
          <Route path="/staff" element={<StaffList />} />
          <Route path="/appointments" element={<AppointmentsList />} />
          <Route path="/leave-requests" element={<LeaveRequests />} />
          <Route path="/punching-times" element={<PunchingTimes />} />
          <Route path="/terminated-staff" element={<TerminatedStaff />} />
          <Route path="/super-admin/profit-analysis" element={<ProfitAnalysisPage />} />
          <Route path="/super-admin/reset-all-passwords" element={<ResetPasswordPage />} />
          <Route path="/super-admin/manage-companies" element={<AddCompanyPage key={Date.now()} />} />
        </Routes>
      </main>
    </div>
  );
};

export default SuperAdminPanel;
