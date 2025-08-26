import React, { createContext,useEffect,useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Logout from './components/Auth/LogIn/Logout.js';
import CashBill from './components/DashBoard/Sidebar/Cashbill/CashBill.js';
import CreditNote from './components/DashBoard/Sidebar/CreditNote/CreditNote.js';
import DebitNote from './components/DashBoard/Sidebar/DebitNote/DebitNote.js';
import CreditBill from './components/DashBoard/Sidebar/CreditBill/CreditBill.js';
import PaymentReceipt from './components/DashBoard/Sidebar/PaymentReceipt/PaymentReceipt.js';
import Login from './components/Auth/LogIn/Login.js';
import Main from './Mainpage/Main/Main.js';
import Register from './components/Auth/Register/Register.js';
import ForgotPassword from './components/Auth/ForgotPassword/ForgotPassword.js';
import Dashboard from './components/DashBoard/Dashboard.js';
import ManageCustomers from './components/DashBoard/Customer/ManageCustomers.js';
import SuperAdminPanel from './components/SuperAdmin/SuperAdminPanel/SuperAdminPanel.js';
import AccountsAdminPanel from './components/SuperAdmin/AccountsAdmin/AccountsAdminPanel.js';
import HRAdminPanel from './components/SuperAdmin/HRAdmin/HRAdminPanel.js';
import MarketingAdminPanel from './components/SuperAdmin/MarketingAdmin/MarketingAdminPanel.js';
import DigitalMarketingAdminPanel from './components/SuperAdmin/DigitalMarketing/DigitalMarketingAdminPanel.js';
import PurchasingAdminPanel from './components/SuperAdmin/PurchasingAdminPanel/PurchasingAdminPanel.js';
import BillSummary from './components/SuperAdmin/AccountsAdmin/BillSummary.js';
import BillDistribution from './components/SuperAdmin/AccountsAdmin/BillDistribution.js';
import PaymentHistory from './components/SuperAdmin/AccountsAdmin/PaymentHistory.js';
import PriceListView from './components/SuperAdmin/PurchasingAdminPanel/PriceListView.js';
import AddPriceList from './components/SuperAdmin/PurchasingAdminPanel/AddPriceList.js';
import ProductReturns from './components/SuperAdmin/PurchasingAdminPanel/ProductReturns.js';
import QuotationForm from './components/DashBoard/Sidebar/QuotationForm/QuotationForm.js';
import CompanyHeader from './components/DashBoard/Sidebar/CompanyHeader/CompanyHeader.js';
import ResetPasswordPage from './components/SuperAdmin/SuperAdminPanel/ResetPasswordPage.js';
export const SocketContext = createContext();

// Path validation component
const PathValidator = ({ children }) => {
  useEffect(() => {
    const currentPath = window.location.pathname + window.location.hash;
    const requiredPath = '/wyenfos_bills/#/wyenfos/4551';
    
    if (!currentPath.includes('/wyenfos_bills/#/wyenfos/4551')) {
      window.location.href = requiredPath;
    }
  }, []);

  return children;
};

function App() {
  const socketRef = useRef(null);

useEffect(() => {
  const socketURL =
    process.env.NODE_ENV === 'production'
      ? 'wss://wyenfos.in'
      : 'ws://localhost:5000';

  socketRef.current = io(socketURL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socketRef.current.on('connect', () => {

  });

  socketRef.current.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  socketRef.current.on('stock-alert', (data) => {

  });

  return () => {
    socketRef.current.disconnect();
  };
}, []);

    
    useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          
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
  <AuthProvider>
    <SocketContext.Provider value={socketRef.current}>
      <PathValidator>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Main />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/logout" element={<Logout />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/customers" element={
                <ProtectedRoute>
                  <ManageCustomers />
                </ProtectedRoute>
              } />
              

              
              <Route path="/cash-bill" element={
                <ProtectedRoute>
                  <CashBill />
                </ProtectedRoute>
              } />
              
              <Route path="/credit-bill" element={
                <ProtectedRoute>
                  <CreditBill />
                </ProtectedRoute>
              } />
              
              <Route path="/credit-note" element={
                <ProtectedRoute>
                  <CreditNote />
                </ProtectedRoute>
              } />
              
              <Route path="/debit-note" element={
                <ProtectedRoute>
                  <DebitNote />
                </ProtectedRoute>
              } />
              
              <Route path="/payment-receipt" element={
                <ProtectedRoute>
                  <PaymentReceipt />
                </ProtectedRoute>
              } />
              
              <Route path="/quotation" element={
                <ProtectedRoute>
                  <QuotationForm />
                </ProtectedRoute>
              } />
              
              <Route path="/company-header" element={
                <ProtectedRoute>
                  <CompanyHeader />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AccountsAdminPanel />
                </AdminRoute>
              } />
              
              {/* Accounts Admin Routes */}
              <Route path="/billing-details" element={
                <AdminRoute department="accounts">
                  <BillSummary />
                </AdminRoute>
              } />
              
              <Route path="/bill-distribution" element={
                <AdminRoute department="accounts">
                  <BillDistribution />
                </AdminRoute>
              } />
              
              <Route path="/payment-history" element={
                <AdminRoute department="accounts">
                  <PaymentHistory />
                </AdminRoute>
              } />
              
              <Route path="/hr-admin" element={
                <AdminRoute department="hr">
                  <HRAdminPanel />
                </AdminRoute>
              } />
              
              <Route path="/marketing-admin" element={
                <AdminRoute department="marketing">
                  <MarketingAdminPanel />
                </AdminRoute>
              } />
              
              <Route path="/digital-marketing-admin" element={
                <AdminRoute department="digital-marketing">
                  <DigitalMarketingAdminPanel />
                </AdminRoute>
              } />
              
              <Route path="/purchasing-admin/*" element={
                <AdminRoute department="purchase">
                  <PurchasingAdminPanel />
                </AdminRoute>
              } />
              
              <Route path="/purchasing-admin/price-lists" element={
                <AdminRoute department="purchase">
                  <PriceListView />
                </AdminRoute>
              } />
              
                      <Route path="/purchasing-admin/add-price-list" element={
            <AdminRoute department="purchase">
              <AddPriceList />
            </AdminRoute>
          } />
          <Route path="/purchasing-admin/products/returns" element={
            <AdminRoute department="purchase">
              <ProductReturns />
            </AdminRoute>
          } />
              
              {/* Super Admin Routes */}
              <Route path="/super-admin/*" element={
                <SuperAdminRoute>
                  <SuperAdminPanel />
                </SuperAdminRoute>
              } />
              
              <Route path="/reset-password-page" element={
                <SuperAdminRoute>
                  <ResetPasswordPage/>
                </SuperAdminRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </Router>
      </PathValidator>
    </SocketContext.Provider>
  </AuthProvider>
);
}

const ProtectedRoute = ({ children, department }) => {
  const token = localStorage.getItem('token');
  const userDept = localStorage.getItem('dept');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (department && userDept !== department) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

const AdminRoute = ({ children, department }) => {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    
    return <Navigate to="/login" />;
  }



  if (userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin' && userProfile?.role !== 'superadmin') {

    return <Navigate to="/unauthorized" />;
  }

  if (department && userProfile?.department !== department) {

    return <Navigate to="/unauthorized" />;
  }


  return children;
};

const SuperAdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();



  if (loading) {

    return <div>Loading...</div>;
  }

  if (!currentUser) {

    return <Navigate to="/login" />;
  }

  if (!userProfile) {

    return <Navigate to="/login" />;
  }

  if (userProfile?.role !== 'superadmin' && userProfile?.role !== 'super_admin') {

    return <Navigate to="/unauthorized" />;
  }


  return children;
};





export default App;