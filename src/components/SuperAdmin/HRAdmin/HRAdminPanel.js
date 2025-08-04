import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HRAdminPanel.css';
import Sidebar from './Sidebar.js';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FaBars } from 'react-icons/fa';
import PunchingTimePage from './PunchingTimePage.js';
import TerminatedStaffPage from './TerminatedStaffPage.js';
import LeavePermissionPage from './LeaveRequestsPage.js';
import StaffAppoiments from './StaffAppoiments.js';
import StaffDetailsPage from './StaffDetailsPage.js';

const HRAdminPanel = () => {
  const [activeTab, setActiveTab] = useState('staff-details');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');

        const headers = { Authorization: `Bearer ${token}` };

        const storedUser = JSON.parse(localStorage.getItem('user')) || {};
        setUser(storedUser);
      } catch (err) {
        console.error(err.response?.data?.error || 'Failed to fetch data');
      }
    };

    fetchData();
  }, [navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.tab-content');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`HRAdminPanel-${activeTab}.pdf`);
  };

  return (
    <div className="hr-admin-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (window.innerWidth <= 768) {
            setSidebarOpen(false);
          }
        }}
        onSignOut={() => {
          localStorage.clear();
          navigate('/login');
        }}
        isOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarOpen={sidebarOpen}
        user={user}
      />

      <div className={`hr-admin-panel ${!sidebarOpen ? 'shifted' : ''}`}>
        <h2>HR Admin Panel</h2>

        <div className="tabs">
          {['staff-details', 'appointments', 'punching-time', 'terminated-staff', 'leave-permission'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active-tab' : 'tab'}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'appointments' && <StaffAppoiments />}
          {activeTab === 'staff-details' && <StaffDetailsPage />}
          {activeTab === 'punching-time' && <PunchingTimePage />}
          {activeTab === 'terminated-staff' && <TerminatedStaffPage />}
          {activeTab === 'leave-permission' && <LeavePermissionPage />}
          <div className="action-buttons">
            <button className="action-btn print-btn" onClick={handlePrint}>
              Print
            </button>
            <button className="action-btn download-btn" onClick={handleDownloadPDF}>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRAdminPanel;