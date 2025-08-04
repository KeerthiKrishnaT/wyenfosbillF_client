// Notifications.js
import React, { useEffect, useState } from 'react';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('notifications')) || [];
    setNotifications(stored);
  }, []);

  const handleClear = () => {
    localStorage.removeItem('notifications');
    setNotifications([]);
  };

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {notifications.length > 0 && (
          <button className="clear-btn" onClick={handleClear}>
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="empty-note">No notifications available.</p>
      ) : (
        <ul>
          {notifications.map((note, index) => (
            <li key={index}>
              <strong>{note.title}</strong>: {note.message}
              <br />
              <small className="timestamp">
                {new Date(note.timestamp).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
