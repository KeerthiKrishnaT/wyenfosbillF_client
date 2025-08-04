import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaBars, FaSignOutAlt, FaUserPlus, FaBox, FaBoxes, FaUsers, FaCalendarAlt, FaClock,
  FaBan, FaPlaneDeparture, FaFileInvoiceDollar, FaChartPie, FaBuilding, FaMoneyBillWave
} from 'react-icons/fa';
import { FaGift } from 'react-icons/fa';
import axios from 'axios';
import './SuperAdminSidebar.css';
import { evaluate } from 'mathjs';

const SuperAdminSidebar = ({ isOpen, toggleSidebar, handleLogout, user, setUser }) => {
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePic || null);
  const [uploadMessage, setUploadMessage] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleCalcButtonClick = (value) => {
    if (value === '=') {
      try {
        setCalcResult(evaluate(calcInput).toString());
      } catch {
        setCalcResult('Error');
      }
    } else if (value === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else {
      setCalcInput(calcInput + value);
    }
  };

  const handleForgotPassword = () => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !storedUser || storedUser.role !== 'super_admin') {
      setUploadMessage({ type: 'error', text: 'You must be a super admin to reset passwords. Logging out...' });
      setTimeout(() => {
        handleLogout();
      }, 2000);
      return;
    }
    navigate('/super-admin/reset-all-passwords');
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfilePic = async (isEdit = false) => {
    if (!profilePic) {
      setUploadMessage({ type: 'error', text: 'Please select an image to upload.' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setUploadMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('profilePic', profilePic);

    try {
      console.log('Saving profile picture, isEdit:', isEdit, 'User:', user);
      const endpoint = isEdit
        ? `${API_BASE_URL}/api/superadmin/profile/edit`
        : `${API_BASE_URL}/api/superadmin/profile/upload`;
      const response = await axios({
        method: isEdit ? 'PUT' : 'POST',
        url: endpoint,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const { profilePicUrl } = response.data;

      const updatedUser = { ...user, profilePic: profilePicUrl };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfilePic(null);
      setPreviewUrl(profilePicUrl);
      setUploadMessage({ type: 'success', text: `Profile picture ${isEdit ? 'updated' : 'uploaded'} successfully.` });
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'uploading'} profile picture:`, err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || err.message || `Network error while ${isEdit ? 'updating' : 'uploading'} profile picture.`;
      setUploadMessage({ type: 'error', text: errorMessage });
    } finally {
      setTimeout(() => setUploadMessage(null), 3000);
    }
  };

  // const handleDeleteProfilePic = async () => {
  //   const token = localStorage.getItem('token');
  //   if (!token) {
  //     setUploadMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
  //     navigate('/login');
  //     return;
  //   }

  //   try {
  //     const response = await axios.delete(`${API_BASE_URL}/api/superadmin/profile/delete`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });

  //     const updatedUser = { ...user, profilePic: null };
  //     setUser(updatedUser);
  //     localStorage.setItem('user', JSON.stringify(updatedUser));
  //     setProfilePic(null);
  //     setPreviewUrl(null);
  //     setUploadMessage({ type: 'success', text: 'Profile picture deleted successfully.' });
  //   } catch (err) {
  //     console.error('Error deleting profile picture:', err.response?.data || err.message);
  //     const errorMessage = err.response?.data?.error || err.message || 'Network error while deleting profile picture.';
  //     setUploadMessage({ type: 'error', text: errorMessage });
  //   } finally {
  //     setTimeout(() => setUploadMessage(null), 3000);
  //   }
  // };

  const today = new Date();
  const monthYearLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const navItems = [
    { to: '/create-department', label: 'Create Department', icon: <FaBuilding /> },
    { to: '/add-admin', label: 'Add Admin', icon: <FaUserPlus /> },
    { to: '/products', label: 'Products', icon: <FaBox /> },
    { to: '/inventory', label: 'Products Inventory', icon: <FaBoxes /> },
    { to: '/staff', label: 'Staff', icon: <FaUsers /> },
    { to: '/appointments', label: 'Appointments', icon: <FaCalendarAlt /> },
    { to: '/punching-times', label: 'Punching Times', icon: <FaClock /> },
    { to: '/terminated-staff', label: 'Terminated Staff', icon: <FaBan /> },
    { to: '/leave-requests', label: 'Leave Requests', icon: <FaPlaneDeparture /> },
    { to: '/super-admin/financial-page', label: 'Financials', icon: <FaFileInvoiceDollar /> },
    { to: '/super-admin/profit-analysis', label: 'Profit Analysis', icon: <FaChartPie /> },
    { to: '/digital-marketing-admin-panel', label: 'Vouchers', icon: <FaGift /> },
    { to: '/super-admin/add-bank-details', label: 'Add Bank Details', icon: <FaMoneyBillWave /> },
    { to: '/super-admin/manage-companies', label: 'Manage Companies', icon: <FaBuilding /> },
  ];

  return (
    <>
      {!isOpen && (
        <div className="sidebar-toggle-button" style={{ display: 'block', position: 'fixed', top: '10px', left: '10px', zIndex: 1000 }}>
          <button type="button" onClick={toggleSidebar} className="btn btn-toggle-icon" aria-label="Open Sidebar">
            <FaBars />
          </button>
        </div>
      )}

      <div className={`offcanvas-column ${isOpen ? 'show' : ''}`}>
        <div className="offcanvas-header">
          <h5>Super Admin Sidebar</h5>
          <button type="button" onClick={toggleSidebar} className="btn btn-toggle-icon" aria-label="Close Sidebar">
            <FaBars />
          </button>
        </div>

        <div className="offcanvas-body">
          <div className="profile-section-left">
            <div className="profile-avatarr">
              <label htmlFor="profilePicInput">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Super Admin Avatar"
                    className="clickable-avatarr"
                    title="Click to change profile picture"
                  />
                ) : (
                  <div className="avatarr">{user?.name?.charAt(0) || 'S'}</div>
                )}
              </label>
              <input
                id="profilePicInput"
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-info">
              <h4>{user?.name || 'Super Admin'}</h4>
              <p>{user?.email || 'super.admin@example.com'}</p>
              <div className="profile-pic-buttons">
                {profilePic && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveProfilePic(user?.profilePic !== null)}
                      className="btn btn-primary save-profile-btn"
                    >
                      {user?.profilePic ? 'Update' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePic(null);
                        setPreviewUrl(user?.profilePic || null);
                      }}
                      className="btn btn-secondary cancel-profile-btn"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {/* {user?.profilePic && !profilePic && (
                  <button
                    type="button"
                    onClick={handleDeleteProfilePic}
                    className="btndanger"
                  >
                    <FaTrash /> </button>
                )} */}
              </div>
              {uploadMessage && (
                <div className={`message ${uploadMessage.type}`}>{uploadMessage.text}</div>
              )}
            </div>
          </div>

          <div className="sidebar-nav-column">
            {navItems.map((item, index) => (
              <NavLink
                key={index}
                to={item.to}
                className={({ isActive }) => `sidebar-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (window.innerWidth <= 768) toggleSidebar();
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <h3>Calendar</h3>
          <div className="calendar">
            <div className="calendar-header">
              <button type="button">&lt;</button>
              <span>{monthYearLabel}</span>
              <button type="button">&gt;</button>
            </div>
            <div className="calendar-days">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              {[...Array(26)].map((_, i) => <span key={i} className="empty-day"></span>)}
              {[...Array(31)].map((_, i) => (
                <span key={i + 26} className={i + 1 === new Date().getDate() ? 'current-day' : ''}>{i + 1}</span>
              ))}
            </div>
          </div>

          <h3>Mini Calculator</h3>
          <div className="mini-calculator">
            <input
              type="text"
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              placeholder="Enter calculation"
            />
            <div className="calc-result">{calcResult}</div>
            <div className="calc-buttons">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C'].map((btn) => (
                <button key={btn} type="button" onClick={() => handleCalcButtonClick(btn)}>{btn}</button>
              ))}
            </div>
          </div>

          <h3>Forgot Password</h3>
          <button type="button" className="forgot-password-btn" onClick={handleForgotPassword}>
            Reset Password for All
          </button>

          <button type="button" className="sidebar-btn logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default SuperAdminSidebar;