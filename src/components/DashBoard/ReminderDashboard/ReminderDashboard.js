import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReminderDashboard.css';

const ReminderDashboard = ({ selectedCompany }) => {
  const [reminders, setReminders] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [overdueReminders, setOverdueReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    if (selectedCompany) {
      fetchReminders();
    }
  }, [selectedCompany]);

  const fetchReminders = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const [upcomingRes, overdueRes] = await Promise.all([
        api.get('/reminders/upcoming', { params: { company: selectedCompany } }),
        api.get('/reminders/overdue', { params: { company: selectedCompany } })
      ]);

      setUpcomingReminders(upcomingRes.data || []);
      setOverdueReminders(overdueRes.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setMessage({ type: 'error', text: 'Failed to fetch reminders' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSent = async (reminderId) => {
    try {
      await api.post(`/reminders/${reminderId}/mark-sent`);
      setMessage({ type: 'success', text: 'Reminder marked as sent' });
      setTimeout(() => setMessage(null), 3000);
      fetchReminders(); // Refresh the list
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      setMessage({ type: 'error', text: 'Failed to mark reminder as sent' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendNotification = async (reminderId, includeSuperAdmin = true) => {
    try {
      const staffEmail = localStorage.getItem('userEmail');
      const staffName = localStorage.getItem('userName') || 'Staff Member';
      
      const response = await api.post(`/reminders/${reminderId}/send-notification`, {
        staffEmail,
        staffName,
        includeSuperAdmin
      });
      
      const successCount = response.data.notifications.filter(n => n.success).length;
      const totalCount = response.data.notifications.length;
      
      setMessage({ 
        type: 'success', 
        text: `Reminder notifications sent successfully (${successCount}/${totalCount} successful)` 
      });
      setTimeout(() => setMessage(null), 3000);
      fetchReminders(); // Refresh the list
    } catch (error) {
      console.error('Error sending reminder notification:', error);
      setMessage({ type: 'error', text: 'Failed to send reminder notification' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendSuperAdminNotification = async (reminderId) => {
    try {
      await api.post(`/reminders/${reminderId}/send-super-admin`);
      
      setMessage({ type: 'success', text: 'Super admin notification sent successfully' });
      setTimeout(() => setMessage(null), 3000);
      fetchReminders(); // Refresh the list
    } catch (error) {
      console.error('Error sending super admin notification:', error);
      setMessage({ type: 'error', text: 'Failed to send super admin notification' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendBulkSuperAdminNotifications = async () => {
    try {
      const response = await api.post('/reminders/bulk-super-admin', {
        company: selectedCompany
      });
      
      const { successful, failed, totalReminders } = response.data;
      setMessage({ 
        type: 'success', 
        text: `Bulk notifications sent: ${successful} successful, ${failed} failed out of ${totalReminders} total` 
      });
      setTimeout(() => setMessage(null), 3000);
      fetchReminders(); // Refresh the list
    } catch (error) {
      console.error('Error sending bulk super admin notifications:', error);
      setMessage({ type: 'error', text: 'Failed to send bulk super admin notifications' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntil = (dateString) => {
    const today = new Date();
    const reminderDate = new Date(dateString);
    const diffTime = reminderDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getStatusColor = (dateString) => {
    const today = new Date();
    const reminderDate = new Date(dateString);
    const diffTime = reminderDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'warning';
    return 'normal';
  };

  const renderReminderCard = (reminder) => {
    const statusColor = getStatusColor(reminder.reminderDate);
    const daysUntil = getDaysUntil(reminder.reminderDate);
    
    return (
      <div key={reminder.id} className={`reminder-card ${statusColor}`}>
        <div className="reminder-header">
          <h4>{reminder.title}</h4>
          <span className={`status-badge ${statusColor}`}>
            {daysUntil}
          </span>
        </div>
        
        <div className="reminder-details">
          <p><strong>Customer:</strong> {reminder.customerName}</p>
          <p><strong>Due Date:</strong> {formatDate(reminder.reminderDate)}</p>
          <p><strong>Amount:</strong> ₹{reminder.amount?.toFixed(2) || '0.00'}</p>
          <p><strong>Description:</strong> {reminder.description}</p>
          {reminder.billType && (
            <p><strong>Bill Type:</strong> {reminder.billType}</p>
          )}
          {reminder.billId && (
            <p><strong>Bill ID:</strong> {reminder.billId}</p>
          )}
        </div>
        
        <div className="reminder-actions">
          {!reminder.isSent && (
            <>
              <button
                onClick={() => handleSendNotification(reminder.id, true)}
                className="btn-send-notification"
                title="Send notification to staff and super admin"
              >
                📧 Send to All
              </button>
              <button
                onClick={() => handleSendNotification(reminder.id, false)}
                className="btn-send-staff"
                title="Send notification to staff only"
              >
                👤 Staff Only
              </button>
              <button
                onClick={() => handleSendSuperAdminNotification(reminder.id)}
                className="btn-send-super-admin"
                title="Send notification to super admin only"
              >
                👑 Super Admin
              </button>
              <button
                onClick={() => handleMarkSent(reminder.id)}
                className="btn-mark-sent"
              >
                ✓ Mark Sent
              </button>
            </>
          )}
          {reminder.isSent && (
            <span className="sent-badge">✓ Sent on {formatDate(reminder.sentAt)}</span>
          )}
        </div>
      </div>
    );
  };

  const currentReminders = activeTab === 'upcoming' ? upcomingReminders : overdueReminders;

  return (
    <div className="reminder-dashboard">
      <div className="reminder-header">
        <h2>🔔 EMI Reminders</h2>
        <p>Manage upcoming and overdue EMI payments for {selectedCompany}</p>
        <div className="header-actions">
          <button
            onClick={handleSendBulkSuperAdminNotifications}
            className="btn-bulk-super-admin"
            title="Send all reminders to super admin"
          >
            👑 Send All to Super Admin
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="reminder-tabs">
        <button
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          📅 Upcoming ({upcomingReminders.length})
        </button>
        <button
          className={`tab ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          ⚠️ Overdue ({overdueReminders.length})
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading reminders...</div>
      ) : currentReminders.length === 0 ? (
        <div className="no-reminders">
          <p>No {activeTab} reminders found.</p>
        </div>
      ) : (
        <div className="reminders-grid">
          {currentReminders.map(renderReminderCard)}
        </div>
      )}

      <div className="reminder-summary">
        <div className="summary-item">
          <span className="summary-label">Total Upcoming:</span>
          <span className="summary-value">{upcomingReminders.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Overdue:</span>
          <span className="summary-value overdue">{overdueReminders.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Amount Due:</span>
          <span className="summary-value">
            ₹{(upcomingReminders.reduce((sum, r) => sum + (r.amount || 0), 0) + 
               overdueReminders.reduce((sum, r) => sum + (r.amount || 0), 0)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReminderDashboard;
