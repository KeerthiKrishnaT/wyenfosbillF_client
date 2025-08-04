import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import Header from './Header/Header';
import Sidebar from './Sidebar/Sidebar';
import TodayOrders from './TodayOrders/TodayOrders';
import TodayVisitors from './TodayVisitors/TodayVisitors';
import TotalSpent from './TotalSpent/TotalSpent';
import NewUsers from './NewUsers/NewUsers';
import StaffTable from './StaffTable/StaffTable';
import PieChartComponent from './PieChart/PieChart';
import WeeklyRevenue from './WeeklyRevenue/WeeklyRevenue';
import UpcomingTasks from './UpcomingTasks/UpcomingTasks';
import MiniCalendar from './calendar/MiniCalendar';
import RecentActivity from './RecentActivity/RecentActivity';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(localStorage.getItem('selectedCompany') || '');
  const [topSoldItems, setTopSoldItems] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    localStorage.setItem('selectedCompany', company);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (e.clientX <= 30) {
        setSidebarOpen(prev => !prev);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // useEffect(() => {
  //   const fetchTopSoldProducts = async () => {
  //     try {
  //       const token = localStorage.getItem('token');
  //       const res = await axios.get('http://localhost:5000/api/sold-products', {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  //       const sorted = res.data.data.sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  //       setTopSoldItems(sorted);
  //     } catch (error) {
  //       console.error('Error fetching sold products:', error);
  //     }
  //   };

  //   fetchTopSoldProducts();
  // }, []);

  return (
    <div className="dashboard-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        onCompanySelect={handleCompanySelect}
        selectedCompany={selectedCompany}
      />
      <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
        <Header
          onMenuClick={toggleSidebar}
          selectedCompany={selectedCompany}
        />
        <div className="top-grid">
          <div className="today-orders-card"><TodayOrders /></div>
          <div className="weekly-revenue-card"><WeeklyRevenue /></div>
          <div className="total-spent-card"><TotalSpent /></div>
        </div>

        <div className="second-grid">
          <div className="new-users-card"><NewUsers /></div>
          <div className="staff-table-card"><StaffTable /></div>
          <div className="upcoming-tasks-card"><UpcomingTasks /></div>
        </div>

        <div className="last-row-grid">
  <div className="today-visitors-card"><TodayVisitors /></div>
  <div className="recent-activity-card"><RecentActivity /></div>
  <div className="pie-chart-card"><PieChartComponent /></div>
  <div className="mini-calendar-card"><MiniCalendar /></div>
        </div>

         
        </div>    
      </div>
  
  );
};

export default Dashboard;