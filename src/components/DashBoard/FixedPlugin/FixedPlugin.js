import React, { useState, useEffect } from "react";
import { RiMoonFill, RiSunFill, RiUser3Line } from "react-icons/ri";
import "./FixedPlugin.css";

export default function FixedPlugin() {
  const [darkmode, setDarkmode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  const togglePanel = () => setIsOpen(!isOpen);

  useEffect(() => {
    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user')) || {};
    setUser(userInfo);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.fixed-plugin')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="fixed-plugin">
      <div className="plugin-inner">
        <button className="plugin-button" onClick={togglePanel}>
          <div className="plugin-icon">
            <RiUser3Line />
          </div>
        </button>

        {isOpen && (
          <div className="profile-panel">
            <div className="profile-header">
              <div className="profile-avatar">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt="Profile" />
                ) : (
                  <div className="profile-placeholder">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h3>{user?.name || 'User'}</h3>
                <p>{user?.role || 'Staff'}</p>
              </div>
            </div>
            <div className="profile-actions">
              <button className="profile-action-btn">
                <RiUser3Line />
                <span>View Profile</span>
              </button>
              <button className="profile-action-btn">
                <RiMoonFill />
                <span>Settings</span>
              </button>
              <button 
                className="profile-action-btn logout-btn"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                <RiSunFill />
                <span>Logout</span>
              </button>
            </div>
            <button
              className="theme-toggle"
              onClick={() => {
                document.body.classList.toggle("dark");
                setDarkmode(!darkmode);
              }}
            >
              {darkmode ? (
                <RiSunFill className="theme-icon" />
              ) : (
                <RiMoonFill className="theme-icon" />
              )}
              <span>Toggle Theme</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
