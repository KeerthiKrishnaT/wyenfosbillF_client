import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { isValid, parseISO, formatDistanceToNow } from 'date-fns';
import './RecentActivity.css';

const getIcon = (type) => {
  switch (type) {
    case 'cashbill': return '🧾';
    case 'creditbill': return '📄';
    case 'debitnote': return '🧮';
    case 'payment': return '💰';
    default: return '📌';
  }
};

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/activity/recent', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActivities(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching recent activities:", error);
        setActivities([]);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="activity-container">
      <h2>Recent Activity</h2>
      <ul>
        {activities.length === 0 ? (
          <li className="activity-text">No recent activity found.</li>
        ) : (
          activities.map((item, idx) => (
            <li key={idx}>
              <span className="activity-icon">{getIcon(item.type)}</span>
              <span className="activity-text">{item.message}</span>
              <span className="timestamp">
                {item.createdAt && isValid(new Date(item.createdAt))
                  ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                  : 'Unknown time'}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default RecentActivity;