import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import Header from './Header/Header';
import Sidebar from './Sidebar/Sidebar';
import TodayOrders from './TodayOrders/TodayOrders';
import WeeklyRevenue from './WeeklyRevenue/WeeklyRevenue';
import TotalSpent from './TotalSpent/TotalSpent';
import NewUsers from './NewUsers/NewUsers';
import StaffTable from './StaffTable/StaffTable';
import PieChartComponent from './PieChart/PieChart';
import RecentActivity from './RecentActivity/RecentActivity';
import UpcomingTasks from './UpcomingTasks/UpcomingTasks';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// --- Dynamic Product Info Component ---
const ProductInfo = () => {
  const [latestProduct, setLatestProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestProduct = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLatestProduct(null);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/products', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const products = Array.isArray(response.data) ? response.data : (response.data.data || []);
        
        if (products.length > 0) {
          // Sort by creation date and get the latest
          const sortedProducts = products.sort((a, b) => 
            new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
          );
          setLatestProduct(sortedProducts[0]);
        }
      } catch (error) {
        console.error('Error fetching latest product:', error);
        setLatestProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProduct();
  }, []);

  return (
    <div className="card product-info">
      <h4>LATEST PRODUCT</h4>
      {loading ? (
        <p>Loading...</p>
      ) : latestProduct ? (
        <div className="product-details">
          <p className="product-name">{latestProduct.itemName || 'Unnamed Product'}</p>
          <p className="product-code">Code: {latestProduct.itemCode || 'N/A'}</p>
          <p className="product-price">
            ₹{latestProduct.unitPrice ? latestProduct.unitPrice.toLocaleString() : '0'}
          </p>
        </div>
      ) : (
        <p>No products found</p>
      )}
    </div>
  );
};

// --- Placeholder components for missing widgets ---
const GaugeCard = ({ title, value, percent }) => (
  <div className="card gauge-card">
    <h4>{title}</h4>
    <div className="gauge">
      <div className="gauge-fill" style={{ width: `${percent}%` }} />
      <span className="gauge-value">{value}</span>
    </div>
  </div>
);

const NPSBreakdown = () => (
  <div className="card nps-breakdown">
    <h4>NPS Breakdown</h4>
    <div className="nps-row">
      <span className="nps-promoter">😊 67.76%<br />Promoters</span>
      <span className="nps-passive">😐 20.43%<br />Passives</span>
      <span className="nps-detractor">😡 11.81%<br />Detractors</span>
    </div>
  </div>
);



const CSATOverMonth = () => (
  <div className="card csat-over-month">
    <h4>Customer Satisfaction (CSAT) Over Month</h4>
    <div className="chart-placeholder">
      <p>CSAT data will be displayed here</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const { currentUser, loading } = useAuth();
  
  // Handle company selection
  const handleCompanySelect = (company) => {

    setSelectedCompany(company);
  };
  
  const toggleSidebar = () => {

    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle window resize
  const handleResize = () => {
    if (window.innerWidth > 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="auth-loading">
          <h2>Checking authentication...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Show authentication error if not authenticated
  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <div className="auth-error">
          <h2>Authentication Required</h2>
          <p>You need to be logged in to access the dashboard.</p>
          <p>Redirecting to login page...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onCompanySelect={handleCompanySelect}
        selectedCompany={selectedCompany}
      />
      
      <div className={`main-cont ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header />
        
        <div className="dashboard-grid">
          {/* Only render components if authenticated */}
          {currentUser && (
            <>
              {/* Top Row - Key Metrics */}
              <div className="grid-item total-spent">
                <div className="card metric-card">
                  <h4>Today's Profit</h4>
                  <TotalSpent />
                </div>
              </div>
              <div className="grid-item avg-response">
                <div className="card metric-card">
                  <h4>Today's Orders</h4>
                  <TodayOrders />
                </div>
              </div>
              <div className="grid-item weekly-revenue">
                <div className="card metric-card">
                  <h4>Weekly Revenue</h4>
                  <WeeklyRevenue />
                </div>
              </div>
              
              {/* Second Row - Performance Scores */}
              <div className="grid-item csat-score">
                <GaugeCard title="Customer Satisfaction Score (CSAT)" value="65%" percent={65} />
              </div>
              <div className="grid-item nps-gauge">
                <GaugeCard title="Net Promoter Score (NPS)" value="75%" percent={75} />
              </div>
              <div className="grid-item ces-gauge">
                <GaugeCard title="Customer Effort Score (CES)" value="75.94%" percent={76} />
              </div>
              
              {/* Third Row - Charts and Analytics */}
              <div className="grid-item pie-chart">
                <div className="card chart-card">
                  <PieChartComponent />
                </div>
              </div>
              <div className="grid-item nps-breakdown">
                <NPSBreakdown />
              </div>
              <div className="grid-item product">
                <ProductInfo />
              </div>
              
              {/* Fourth Row - User Management */}
              <div className="grid-item new-users">
                <div className="card table-card">
                  <NewUsers />
                </div>
              </div>
              <div className="grid-item staff-table">
                <div className="card table-card">
                  <StaffTable />
                </div>
              </div>
           
              {/* Bottom Row - Detailed Analytics */}
              <div className="grid-item upcoming-tasks">
                <div className="card tasks-card">
                  <UpcomingTasks />
                </div>
              </div>
              <div className="grid-item csat-over-month">
                <CSATOverMonth />
              </div>
              <div className="grid-item recent-activity">
                <div className="card activity-card">
                  <RecentActivity />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;