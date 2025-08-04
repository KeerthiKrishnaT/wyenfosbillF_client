import React, { useState, useEffect } from "react";
import { RiMoonFill, RiSunFill, RiNotification3Line } from "react-icons/ri";
import Notifications from "../Notifications/Notifications";
import "./FixedPlugin.css";

export default function FixedPlugin() {
  const [darkmode, setDarkmode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const togglePanel = () => setIsOpen(!isOpen);

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
            <RiNotification3Line />
          </div>
          <span className="plugin-badge">3</span>
        </button>

        {isOpen && (
          <div className="notification-panel">
            <div className="notifications-wrapper">
              <Notifications />
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
