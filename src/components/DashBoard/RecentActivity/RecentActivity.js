import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { isValid, formatDistanceToNow } from 'date-fns';
import './RecentActivity.css';

const getIcon = (type) => {
  switch (type) {
    case 'cashbill': return '🧾';
    case 'creditbill': return '📄';
    case 'creditnote': return '📋';
    case 'debitnote': return '🧮';
    case 'payment': return '💰';
    default: return '📌';
  }
};

const getActivityMessage = (item) => {
  switch (item.type) {
    case 'cashbill':
      return `Cash Bill created for ${item.customerName || 'Customer'}`;
    case 'creditbill':
      return `Credit Bill created for ${item.customerName || 'Customer'}`;
    case 'creditnote':
      return `Credit Note created for ${item.customerName || 'Customer'}`;
    case 'debitnote':
      return `Debit Note created for ${item.customerName || 'Customer'}`;
    default:
      return item.message || 'Activity recorded';
  }
};

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentBills = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No authentication token found');
          setActivities([]);
          return;
        }
        
        // Fetch all types of bills and notes with better error handling
        const fetchWithFallback = async (url) => {
          try {
            const response = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return response;
          } catch (error) {
            console.warn(`Failed to fetch ${url}:`, error.message);
            return { data: [] };
          }
        };

        const [cashBills, creditBills, creditNotes, debitNotes] = await Promise.all([
          fetchWithFallback('http://localhost:5000/api/cashbills'),
          fetchWithFallback('http://localhost:5000/api/creditbills'),
          fetchWithFallback('http://localhost:5000/api/creditnotes'),
          fetchWithFallback('http://localhost:5000/api/debitnotes')
        ]);

        // Handle different response structures and ensure we have arrays
        const getDataArray = (response) => {
          if (!response || !response.data) return [];
          if (Array.isArray(response.data)) return response.data;
          if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
          if (response.data.bills && Array.isArray(response.data.bills)) return response.data.bills;
          return [];
        };

        // Combine all activities and add type information
        const allActivities = [
          ...getDataArray(cashBills).map(bill => ({ ...bill, type: 'cashbill' })),
          ...getDataArray(creditBills).map(bill => ({ ...bill, type: 'creditbill' })),
          ...getDataArray(creditNotes).map(note => ({ ...note, type: 'creditnote' })),
          ...getDataArray(debitNotes).map(note => ({ ...note, type: 'debitnote' }))
        ];

        // Sort by creation date (newest first) and take the latest 10
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10);

        setActivities(sortedActivities);
      } catch (error) {
        console.error("Error fetching recent activities:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBills();
  }, []);

  return (
    <div className="activity-container">
      <h2>Recent Bill Activities</h2>
      {loading ? (
        <div className="loading">Loading recent activities...</div>
      ) : (
        <ul>
          {activities.length === 0 ? (
            <li className="activity-text">No recent bill activities found.</li>
          ) : (
            activities.map((item, idx) => (
              <li key={idx} className="activity-item">
                <span className="activity-icon">{getIcon(item.type)}</span>
                <div className="activity-content">
                  <span className="activity-text">{getActivityMessage(item)}</span>
                  <span className="timestamp">
                    {item.createdAt && isValid(new Date(item.createdAt))
                      ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                      : 'Unknown time'}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default RecentActivity;