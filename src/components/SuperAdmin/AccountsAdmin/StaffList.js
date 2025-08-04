import React, { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import './BillingDetails.css';

Chart.register(...registerables);

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [roleDistribution, setRoleDistribution] = useState({});
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'Staff' });
  const [message, setMessage] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [editStaff, setEditStaff] = useState(null);

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

useEffect(() => {
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/accounts/staff/list');
      setStaff(response.data);
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Failed to fetch staff list: ${err.message}` });
      setTimeout(() => setNotificationMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  fetchStaff();
}, []);

  useEffect(() => {
    const ctx = document.getElementById('roleDistributionChart')?.getContext('2d');
    if (!ctx) return;

    const distribution = staff.reduce((acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    }, {});
    setRoleDistribution(distribution);

    const chartData = {
      labels: Object.keys(distribution),
      datasets: [
        {
          data: Object.values(distribution),
          backgroundColor: ['#3498db', '#9b59b6'],
          borderColor: '#fff',
          borderWidth: 1,
        },
      ],
    };

    const roleDistributionChart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, padding: 20, font: { size: 12 }, usePointStyle: true },
          },
        },
      },
    });

    return () => roleDistributionChart.destroy();
  }, [staff]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/staff/add', newStaff);
      setStaff([...staff, response.data]);
      setNewStaff({ name: '', email: '', password: '', role: 'Staff' });
      setNotificationMessage({ type: 'success', text: 'Staff added successfully.' });
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Failed to add staff: ${err.message}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (!editStaff) return;
    setIsLoading(true);
    try {
      const response = await api.put(`/auth/staff/${editStaff._id}`, editStaff);
      setStaff(staff.map(s => s._id === editStaff._id ? response.data : s));
      setEditStaff(null);
      setNotificationMessage({ type: 'success', text: 'Staff updated successfully.' });
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Failed to update staff: ${err.message}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleSelectStaff = (s) => {
    setEditStaff({ ...s, password: '' }); // Reset password field for editing
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedStaffIds.length || !message) {
      setNotificationMessage({ type: 'error', text: 'Select staff and enter a message.' });
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/staff/send-message', { staffIds: selectedStaffIds, message });
      setMessage('');
      setSelectedStaffIds([]);
      setNotificationMessage({ type: 'success', text: 'Message sent successfully.' });
    } catch (err) {
      setNotificationMessage({ type: 'error', text: `Failed to send message: ${err.message}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const toggleStaffSelection = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  return (
    <div className="billing-details">
      <h2>Staff List</h2>

      {notificationMessage && (
        <div className={`message ${notificationMessage.type}`}>
          <p>{notificationMessage.text}</p>
          <button
            type="button"
            onClick={() => setNotificationMessage(null)}
            aria-label="Close message"
          >
            Close
          </button>
        </div>
      )}

      {isLoading && <div className="loading-overlay">Loading...</div>}

      <div className="chart-container">
        <h3>Role Distribution</h3>
        <canvas id="roleDistributionChart" width="400" height="400" aria-label="Role distribution pie chart"></canvas>
      </div>

      <div className="bills-table">
        <h3>Add Staff</h3>
        <form onSubmit={handleAddStaff} className="add-staff-form">
          <input
            type="text"
            placeholder="Name"
            value={newStaff.name}
            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
            required
            aria-label="Staff name"
          />
          <input
            type="email"
            placeholder="Email"
            value={newStaff.email}
            onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
            required
            aria-label="Staff email"
          />
          <input
            type="password"
            placeholder="Password"
            value={newStaff.password}
            onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
            required
            aria-label="Staff password"
          />
          <select
            value={newStaff.role}
            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
            disabled
            aria-label="Staff role"
          >
            <option value="Staff">Staff</option>
          </select>
          <button type="submit" aria-label="Add staff">Add Staff</button>
        </form>

        <h3>Edit Staff</h3>
        {editStaff && (
          <form onSubmit={handleEditStaff} className="add-staff-form">
            <input
              type="text"
              placeholder="Name"
              value={editStaff.name}
              onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
              required
              aria-label="Edit staff name"
            />
            <input
              type="email"
              placeholder="Email"
              value={editStaff.email}
              onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
              required
              aria-label="Edit staff email"
            />
            <input
              type="password"
              placeholder="New Password (optional, max 2 edits)"
              value={editStaff.password || ''}
              onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
              aria-label="Edit staff password"
            />
            <select
              value={editStaff.role}
              onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
              disabled
              aria-label="Edit staff role"
            >
              <option value="Staff">Staff</option>
            </select>
            <button type="submit" aria-label="Save changes">Save</button>
            <button type="button" onClick={() => setEditStaff(null)} aria-label="Cancel edit">Cancel</button>
          </form>
        )}

        <h3>Send Message</h3>
        <form onSubmit={handleSendMessage} className="send-message-form">
          <textarea
            placeholder="Enter message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            aria-label="Message content"
          ></textarea>
          <button type="submit" aria-label="Send message">Send Message</button>
        </form>

        <h3>Staff List</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.length > 0 ? (
              staff.map((s) => (
                <tr key={s._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(s._id)}
                      onChange={() => toggleStaffSelection(s._id)}
                      aria-label={`Select ${s.name}`}
                    />
                  </td>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.role}</td>
                  <td>
                    <button onClick={() => handleSelectStaff(s)} aria-label={`Edit ${s.name}`}>Edit</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No staff available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffList;