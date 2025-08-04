import React, { useEffect, useState } from 'react';
  import './Sidebar.css';
  import { FaUserTie, FaCalendarCheck, FaClock, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';

  const Sidebar = ({ onTabChange, activeTab, onSignOut, isOpen, setSidebarOpen, sidebarOpen, user }) => {
    const [admin, setAdmin] = useState({ name: 'Admin', role: 'HR Admin', photo: '', email: '' });
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
      const stored = JSON.parse(localStorage.getItem('user'));
      if (stored?.name) setAdmin(stored);

      setNotifications([]); // Removed product-related notifications
    }, []);

    const toggleDarkMode = () => {
      setDarkMode(!darkMode);
      document.body.classList.toggle('dark-mode', !darkMode);
    };

    const dismissNotification = (id) => {
      setNotifications(notifications.filter(n => n.id !== id));
    };

    return (
      <>
        <aside className={`hr-sidebar ${isOpen ? 'open' : ''}`}>
          <button className="map-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="hr-sidebar-header">
            <div className="profile-summary" style={{ flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="sidebar-avatar-upload" style={{ cursor: 'pointer' }}>
                {admin.photo ? (
                  <img src={admin.photo} alt="Profile" className="avatar-img" title="Click to change photo" />
                ) : (
                  <div className="avatar">{admin.name.charAt(0)}</div>
                )}
              </label>
              <input
                type="file"
                id="sidebar-avatar-upload"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const updated = { ...admin, photo: reader.result };
                      setAdmin(updated);
                      localStorage.setItem('user', JSON.stringify(updated));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input
                type="text"
                value={admin.name}
                onChange={(e) => {
                  const updated = { ...admin, name: e.target.value };
                  setAdmin(updated);
                  localStorage.setItem('user', JSON.stringify(updated));
                }}
                placeholder="Your Name"
                style={{ width: '90%', padding: '6px', fontSize: '14px', borderRadius: '4px' }}
              />
              <input
                type="email"
                value={admin.email || ''}
                onChange={(e) => {
                  const updated = { ...admin, email: e.target.value };
                  setAdmin(updated);
                  localStorage.setItem('user', JSON.stringify(updated));
                }}
                placeholder="Email ID"
                style={{ width: '90%', padding: '6px', fontSize: '14px', borderradius: '4px', marginTop: '5px' }}
              />
            </div>
          </div>

          <div className="notifications-container">
            <h6>Notifications</h6>
            {notifications.length === 0 ? (
              <p>No notifications.</p>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className={`notification ${notification.type}`}>
                  <span>{notification.message}</span>
                  <button
                    className="btn-close"
                    onClick={() => dismissNotification(notification.id)}
                    aria-label="Dismiss"
                  ></button>
                </div>
              ))
            )}
          </div>

          <nav className="hr-sidebar-menu">
            <button 
              onClick={() => onTabChange('appointments')} 
              className={activeTab === 'appointments' ? 'active' : ''}
            >
              <FaUserTie /> Appointments
            </button>
            <button 
              onClick={() => onTabChange('staff-details')} 
              className={activeTab === 'staff-details' ? 'active' : ''}
            >
              <FaUserTie /> Staff Details
            </button>
            <button 
              onClick={() => onTabChange('punching-time')} 
              className={activeTab === 'punching-time' ? 'active' : ''}
            >
              <FaClock /> Punch Times
            </button>
            <button 
              onClick={() => onTabChange('terminated-staff')} 
              className={activeTab === 'terminated-staff' ? 'active' : ''}
            >
              ❌ Terminated
            </button>
            <button 
              onClick={() => onTabChange('leave-permission')} 
              className={activeTab === 'leave-permission' ? 'active' : ''}
            >
              <FaCalendarCheck /> Leave Requests
            </button>
          </nav>

          <div className="sidebar-footer-bottom">
            <button onClick={toggleDarkMode}>
              {darkMode ? <FaSun /> : <FaMoon />} {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button className="sign-out-btn" onClick={onSignOut}>
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>
      </>
    );
  };

  export default Sidebar;