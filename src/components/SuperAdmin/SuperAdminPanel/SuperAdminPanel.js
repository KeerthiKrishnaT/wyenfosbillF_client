import React, { useEffect, useState, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
// jwt-decode no longer needed; SuperAdminRoute guards access
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
import StaffAppointments from '../HRAdmin/StaffAppoiments.js';
import LeaveRequestsPage from '../HRAdmin/LeaveRequestsPage.js';
import PunchingTimePage from '../HRAdmin/PunchingTimePage.js';
import TerminatedStaffPage from '../HRAdmin/TerminatedStaffPage.js';
import ProfitAnalysisPage from './ProfitAnalysisPage.js';

import AddCompanyPage from './AddCompanyPage.js';
import ChangeRequests from './ChangeRequests.js';
import VoucherManagement from './VoucherManagement.js';
import AddBankDetails from './AddBankDetails.js';
import InventoryList from '../PurchasingAdminPanel/inventoryList.js';
import PriceListView from '../PurchasingAdminPanel/PriceListView.js';
import AddPriceList from '../PurchasingAdminPanel/AddPriceList.js';
import BillSummary from '../AccountsAdmin/BillSummary.js';
import { useAuth } from '../../../contexts/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const SuperAdminPanel = () => {
  const socket = useContext(SocketContext);
  const { currentUser, userProfile } = useAuth();
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const [localUserProfile, setLocalUserProfile] = useState(userProfile);
  const navigate = useNavigate();

  // Update local user profile when userProfile changes
  useEffect(() => {
    setLocalUserProfile(userProfile);
  }, [userProfile]);

  // Function to handle user profile updates (for profile picture)
  const handleUserUpdate = (updatedUser) => {
    setLocalUserProfile(updatedUser);
  };

  // Remove debug comments
  useEffect(() => {
    // Component mounted
  }, []);

  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleConnect = () => {
      console.log('WebSocket connected in SuperAdminPanel:', socket.id);
    };
    const handleConnectError = (err) => {
      console.error('Socket connection error in SuperAdminPanel:', err?.message || err);
      setMessage({ type: 'error', text: 'Real-time updates unavailable' });
    };
    const handleStockAlert = (data) => {
      setNotifications((prevNotifications) => [...prevNotifications, data.message]);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('stock-alert', handleStockAlert);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleConnectError);
        socket.off('stock-alert', handleStockAlert);
      }
    };
  }, [socket]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (userProfile && (userProfile.role === 'superadmin' || userProfile.role === 'super_admin')) {
      console.log('SuperAdminPanel: User authenticated as Super Admin');
    } else {
      console.log('SuperAdminPanel: User not authorized as Super Admin');
      navigate('/login');
    }
  }, [currentUser, userProfile, navigate]);

  useEffect(() => {
    const fetchPermissionRequests = async () => {
      try {
        if (!currentUser) {
          throw new Error('No authenticated user');
        }

        const idToken = await currentUser.getIdToken(true);
        const response = await axios.get('http://localhost:5000/api/requests', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setPermissionRequests(response.data.data || []);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('SuperAdminPanel: Permission requests 401 error');
          // Don't redirect automatically, let the auth context handle it
        }
        setError('Failed to fetch permission requests. Please try again.');
      }
    };

    if (currentUser && userProfile && (userProfile.role === 'superadmin' || userProfile.role === 'super_admin')) {
      fetchPermissionRequests();
      const interval = setInterval(fetchPermissionRequests, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userProfile]);

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
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const idToken = await currentUser.getIdToken(true);
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status,
          processedBy: userProfile?.email || currentUser.email,
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
        user={localUserProfile}
        setUser={handleUserUpdate}
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
          <Route path="/" element={
            <div className="super-admin-dashboard">
              <h2>Super Admin Dashboard</h2>
              <p>Welcome to the Super Admin Panel. Use the sidebar to navigate to different sections.</p>
            </div>
          } />
          <Route path="/add-admin" element={
            (() => {
              return <AddAdminForm />;
            })()
          } />
          <Route path="/profit-analysis" element={
            (() => {
              return <ProfitAnalysisPage />;
            })()
          } />
          <Route path="/products" element={
            (() => {
              return <ProductList />;
            })()
          } />
          <Route path="/price-lists" element={
            (() => {
              return <PriceListView />;
            })()
          } />
          <Route path="/inventory-list" element={
            (() => {
              return <InventoryList />;
            })()
          } />
          <Route path="/create-department" element={<CreateDepartment />} />
          <Route path="/sold-products" element={<SoldProductsReport />} />
          <Route path="/financial-page" element={<FinancialPage />} />
          <Route path="/staff-list" element={<StaffList />} />
          <Route path="/appointments-list" element={
            (() => {
              return <StaffAppointments />;
            })()
          } />
          <Route path="/leave-requests" element={
            (() => {
              return <LeaveRequestsPage />;
            })()
          } />
          <Route path="/punching-times" element={
            (() => {
              return <PunchingTimePage />;
            })()
          } />
          <Route path="/terminated-staff" element={
            (() => {
              return <TerminatedStaffPage />;
            })()
          } />
          <Route path="/add-company" element={
            (() => {
              return <AddCompanyPage key={Date.now()} />;
            })()
          } />
          <Route path="/add-bank-details" element={
            (() => {
              return <AddBankDetails />;
            })()
          } />
          <Route path="/change-requests" element={<ChangeRequests />} />
          <Route path="/vouchers" element={<VoucherManagement />} />
          <Route path="/add-price-list" element={<AddPriceList />} />
          <Route path="/bill-summary" element={<BillSummary />} />
        </Routes>
      </main>
    </div>
  );
};

export default SuperAdminPanel;
