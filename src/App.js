import React, { useState, createContext, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import Logout from './components/Auth/LogIn/Logout.js';
import CashBill from './components/DashBoard/Sidebar/Cashbill/CashBill.js';
import CreditNote from './components/DashBoard/Sidebar/CreditNote/CreditNote.js';
import DebitNote from './components/DashBoard/Sidebar/DebitNote/DebitNote.js';
import CreditBill from './components/DashBoard/Sidebar/CreditBill/CreditBill.js';
import PaymentPage from './components/DashBoard/Sidebar/PaymentPage/PaymentPage.js';
import PaymentReceipt from './components/DashBoard/Sidebar/PaymentReceipt/PaymentReceipt.js';
import Login from './components/Auth/LogIn/Login.js';
import Main from './Mainpage/Main/Main.js';
import Register from './components/Auth/Register/Register.js';
import ForgotPassword from './components/Auth/ForgotPassword/ForgotPassword.js';
import ResetPassword from './components/Auth/ResetPassword/ResetPassword.js';
import Dashboard from './components/DashBoard/Dashboard.js';
import ManageCustomers from './components/DashBoard/Customer/ManageCustomers.js';
import ProductList from './components/Product/ProductList';
import AddAdminForm from './components/SuperAdmin/SuperAdminPanel/AddAdminForm.js';
import SuperAdminPanel from './components/SuperAdmin/SuperAdminPanel/SuperAdminPanel.js';
import AccountsAdminPanel from './components/SuperAdmin/AccountsAdmin/AccountsAdminPanel.js';
import HRAdminPanel from './components/SuperAdmin/HRAdmin/HRAdminPanel.js';
import MarketingAdminPanel from './components/SuperAdmin/MarketingAdmin/MarketingAdminPanel.js';
import DigitalMarketingAdminPanel from './components/SuperAdmin/DigitalMarketing/DigitalMarketingAdminPanel.js';
import CreateDepartment from './components/SuperAdmin/SuperAdminPanel/CreateDepartment.js';
import PurchasingAdminPanel from './components/SuperAdmin/PurchasingAdminPanel/PurchasingAdminPanel.js';
import BillSummary from './components/SuperAdmin/AccountsAdmin/BillSummary.js';
import InventoryList from './components/SuperAdmin/PurchasingAdminPanel/inventoryList.js';
import StaffList from './components/SuperAdmin/SuperAdminPanel/StaffList.js';
import AppointmentsList from './components/SuperAdmin/SuperAdminPanel/AppointmentsList.js';
import LeaveRequests from './components/SuperAdmin/SuperAdminPanel/LeaveRequests.js';
import TerminatedStaff from './components/SuperAdmin/SuperAdminPanel/TerminatedStaff.js';
import PunchingTimes from './components/SuperAdmin/SuperAdminPanel/PunchingTimes.js';
import QuotationForm from './components/DashBoard/Sidebar/QuotationForm/QuotationForm.js';
import AddBankDetails from './components/SuperAdmin/SuperAdminPanel/AddBankDetails.js';
import AddCompanyPage from './components/SuperAdmin/SuperAdminPanel/AddCompanyPage.js';
import ResetPasswordPage from './components/SuperAdmin/SuperAdminPanel/ResetPasswordPage.js';
import FinancialPage from './components/SuperAdmin/SuperAdminPanel/FinancialPage.js';
import ProfitAnalysisPage from './components/SuperAdmin/SuperAdminPanel/ProfitAnalysisPage.js';

export const SocketContext = createContext();

function AppWrapper() {
  const currentURL = window.location.href;
  const allowedURL = 'https://wyenfos.in/wyenfos_bills/#/bills/77c91a4b-12e3-4e70-b9c8-918a4e3a17ad';
  
  const normalizeURL = (url) => {
    return url.split('?')[0]           // Remove query params
             .replace(/\/$/, '')       // Remove trailing slash
             .toLowerCase();           // Case insensitive
  };

  if (normalizeURL(currentURL) !== normalizeURL(allowedURL)) {
    window.location.replace(allowedURL);
    return null;
  }

  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCompanies = () => {
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log('Refresh key updated to:', newKey); 
      return newKey;
    });
  };

  const socket = io(process.env.REACT_APP_API_URL || 'https://wyenfos.in/api', {
    reconnectionAttempts: 5,
    timeout: 50000,
    transports: ['websocket'], // Ensure WebSocket transport
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket connection error:', err.message);
  });

  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            fetch(process.env.REACT_APP_API_URL + '/api/hr/record-logout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }).catch(error => console.error('Logout fetch error:', error));
            localStorage.clear();
            window.location.href = '/login';
          }
        } catch (error) {
          console.error('Token check error:', error);
        }
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><div className="dashboard-container"><Dashboard /></div></ProtectedRoute>}/>
        <Route
          path="/super-admin-panel/*"
          element={
            <SuperAdminRoute>
              <div className="super-admin-container">
                <SuperAdminPanel />
              </div>
            </SuperAdminRoute>
          }
        />
        <Route path="/staff-dashboard" element={<StaffRoute><Dashboard /></StaffRoute>} />
        <Route path="/customers" element={<ProtectedRoute><ManageCustomers /></ProtectedRoute>} />
        <Route path="/cash-bill" element={<ProtectedRoute><CashBill /></ProtectedRoute>} />
        <Route path="/credit-note" element={<ProtectedRoute><CreditNote /></ProtectedRoute>} />
        <Route path="/debit-note" element={<ProtectedRoute><DebitNote /></ProtectedRoute>} />
        <Route path="/credit-bill" element={<ProtectedRoute><CreditBill /></ProtectedRoute>} />
        <Route path="/payment-page" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/quatotion" element={<ProtectedRoute><QuotationForm /></ProtectedRoute>} />
        <Route path="/payment-receipt" element={<ProtectedRoute><PaymentReceipt /></ProtectedRoute>} />
        <Route path="/creditnote/:id" element={<ProtectedRoute><CreditNote /></ProtectedRoute>} />
        <Route path="/admin/products" element={<AdminRoute><ProductList /></AdminRoute>} />
        <Route path="/admin-panel" element={<ProtectedRoute department="accounts"><AccountsAdminPanel /></ProtectedRoute>} />
        <Route path="/add-admin" element={<SuperAdminRoute><AddAdminForm /></SuperAdminRoute>} />
        <Route path="/hr-admin-panel" element={<ProtectedRoute department="hr"><HRAdminPanel /></ProtectedRoute>} />
        <Route path="/marketing-admin-panel" element={<ProtectedRoute department="marketing"><MarketingAdminPanel /></ProtectedRoute>} />
        <Route path="/digital-marketing-admin-panel" element={<ProtectedRoute department="digital marketing"><DigitalMarketingAdminPanel /></ProtectedRoute>} />
        <Route path="/create-department" element={<ProtectedRoute><CreateDepartment /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
        <Route path="/purchasing-admin-panel/*" element={<ProtectedRoute department="purchase"><PurchasingAdminPanel /></ProtectedRoute>} />
        <Route path="/admin/bill-summary" element={<BillSummary />} />
        <Route path="/super-admin/manage-companies" element={<SuperAdminRoute><AddCompanyPage refreshCompanies={refreshCompanies} /></SuperAdminRoute>} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/staff" element={<StaffList />} />
        <Route path="/appointments" element={<AppointmentsList />} />
        <Route path="/leave-requests" element={<LeaveRequests />} />
        <Route path="/terminated-staff" element={<TerminatedStaff />} />
        <Route path="/punching-times" element={<PunchingTimes />} />
        <Route path="/super-admin/add-bank-details" element={<AddBankDetails />} />
        <Route path="/super-admin/reset-all-passwords" element={<SuperAdminRoute><ResetPasswordPage /></SuperAdminRoute>}/>
        <Route path="/super-admin/financial-page" element={<SuperAdminRoute><FinancialPage /></SuperAdminRoute>}/>
        <Route path="/super-admin/profit-analysis" element={<ProfitAnalysisPage />}/>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketContext.Provider>
  );
}

const ProtectedRoute = ({ children, department }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'super_admin') return children;

  if (department && user.department?.toLowerCase() !== department.toLowerCase()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const StaffRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.role !== 'staff') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AppWrapper;