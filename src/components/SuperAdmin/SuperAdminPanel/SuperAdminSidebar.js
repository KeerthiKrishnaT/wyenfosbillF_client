import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBars, FaSignOutAlt, FaUserPlus, FaBox, FaBoxes, FaUsers, FaCalendarAlt, FaClock,
  FaBan, FaPlaneDeparture, FaFileInvoiceDollar, FaChartPie, FaBuilding, FaMoneyBillWave, FaExchangeAlt
} from 'react-icons/fa';
import { FaGift } from 'react-icons/fa';
import axios from 'axios';
import './SuperAdminSidebar.css';
import { evaluate } from 'mathjs';
import { useAuth } from '../../../contexts/AuthContext';

const SuperAdminSidebar = ({ isOpen, toggleSidebar, handleLogout, user, setUser }) => {
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const { currentUser } = useAuth();

  // Update previewUrl when user profile picture changes
  useEffect(() => {
    if (user && user.profilePic) {
      if (user.profilePic.startsWith('data:image/')) {
        setPreviewUrl(user.profilePic);
      } else {
        // Try to fetch as regular URL first
        fetch(user.profilePic)
          .then(response => {
            if (response.ok) {
              setPreviewUrl(user.profilePic);
            } else {
              throw new Error('Failed to load image');
            }
          })
          .catch(error => {
            // If regular URL fails, try base64
            if (user.profilePic.includes('base64')) {
              setPreviewUrl(user.profilePic);
            } else {
              setPreviewUrl(null);
            }
          });
      }
    } else {
      setPreviewUrl(null);
    }
  }, [user]);

  // Debug: Log initial user object
  useEffect(() => {
    // Component mounted
  }, []);

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
    try {
      const response = axios.post(`${API_BASE_URL}/api/superadmin/forgot-password`, {
        email: user?.email
      });

      if (response.data.success) {
        setUploadMessage({ type: 'success', text: 'Password reset link sent to your email!' });
        setTimeout(() => setUploadMessage(null), 5000);
      }
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.response?.data?.message || 'Failed to send reset link' });
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Remove unused fetchProfilePicAsBase64 function and fix percentCompleted usage
  const handleSaveProfilePic = async (isEdit = false) => {
    try {
      setUploadMessage(null);

      const formData = new FormData();
      formData.append('profilePic', profilePic, profilePic.name);

      const idToken = await currentUser.getIdToken(true);
      const endpoint = isEdit
        ? '/auth/update-profile-picture'
        : '/auth/upload-profile-picture';

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const { profilePicUrl } = response.data;
      const updatedUser = { ...user, profilePic: profilePicUrl };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setPreviewUrl(profilePicUrl);
      setUploadMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'uploading'} profile picture:`, err);
      setUploadMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload profile picture' });
      setTimeout(() => setUploadMessage(null), 5000);
    } finally {
      // setLoading(false); // This line was removed from the new_code, so it's removed here.
      // setUploadProgress(0); // This line was removed from the new_code, so it's removed here.
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
    { to: '/price-lists', label: 'Price Lists', icon: <FaBoxes /> },
    { to: '/inventory-list', label: 'Products Inventory', icon: <FaBoxes /> },
    { to: '/staff-list', label: 'Staff', icon: <FaUsers /> },
    { to: '/appointments-list', label: 'Appointments', icon: <FaCalendarAlt /> },
    { to: '/punching-times', label: 'Punching Times', icon: <FaClock /> },
    { to: '/terminated-staff', label: 'Terminated Staff', icon: <FaBan /> },
    { to: '/leave-requests', label: 'Leave Requests', icon: <FaPlaneDeparture /> },
    { to: '/financial-page', label: 'Financials', icon: <FaFileInvoiceDollar /> },
    { to: '/profit-analysis', label: 'Profit Analysis', icon: <FaChartPie /> },
    { to: '/vouchers', label: 'Vouchers', icon: <FaGift /> },
    { to: '/add-bank-details', label: 'Add Bank Details', icon: <FaMoneyBillWave /> },
    { to: '/add-company', label: 'Manage Companies', icon: <FaBuilding /> },
    {
      name: 'Change Requests',
      icon: <FaExchangeAlt />,
      onClick: () => {
        // This onClick is for the sidebar, not for changing the active tab in SuperAdminPanel
        // For SuperAdminPanel, you'd manage activeTab state there.
        // For now, we'll just toggle the sidebar
        if (window.innerWidth <= 768) toggleSidebar();
      }
    }
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
              <button
                key={index}
                type="button"
                className="sidebar-btn"
                onClick={() => {
                  // console.log('Sidebar navigation clicked:', item.to);
                  // console.log('Current location:', window.location.pathname);
                  if (window.innerWidth <= 768) toggleSidebar();
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.to) {
                    // console.log('Navigating to:', item.to);
                    // Use absolute navigation within SuperAdminPanel context
                    navigate(`/super-admin${item.to}`);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
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
          <button type="button" className="forgot-passwrd-btn" onClick={handleForgotPassword}>
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