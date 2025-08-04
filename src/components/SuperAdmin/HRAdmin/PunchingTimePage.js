import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PunchingTimePage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus } from 'react-icons/fa';

const PunchingTimePage = () => {
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    date: '',
    punchIn: '',
    punchOut: ''
  });
  const [punchingTimes, setPunchingTimes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState(null);
  
  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const timesRes = await axios.get(`${API_URL}/punching-times`, { headers });
        setPunchingTimes(timesRes.data);
        try {
          const statusRes = await axios.get(`${API_URL}/punching-times/current`, { headers });
          setCurrentStatus(statusRes.data ? 'punched-in' : 'punched-out');
        } catch (statusErr) {
          setCurrentStatus('punched-out');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch data');
      }
    };
    fetchData();
  }, [token]);

  const handleInput = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreate = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/punching-times`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPunchingTimes(prev => [...prev, response.data]);
      setFormData({ email: '', role: '', date: '', punchIn: '', punchOut: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create punching time');
    }
  };

  const handleUpdate = async (id) => {
    try {
      const response = await axios.put(
        `${API_URL}/punching-times/${id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPunchingTimes(prev =>
        prev.map(item => (item._id === id ? response.data : item))
      );
      setEditingId(null);
      setFormData({ email: '', role: '', date: '', punchIn: '', punchOut: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update punching time');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/punching-times/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPunchingTimes(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete punching time');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({ 
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      punchIn: item.punchIn ? new Date(item.punchIn).toISOString().split('T')[1].substring(0, 5) : '',
      punchOut: item.punchOut ? new Date(item.punchOut).toISOString().split('T')[1].substring(0, 5) : ''
    });
  };

  const resetForm = () => {
    setFormData({ email: '', role: '', date: '', punchIn: '', punchOut: '' });
    setEditingId(null);
  };

  const handlePunchIn = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.post(
        `${API_URL}/punching-times/record-login`,
        {
          email: user.email,
          role: user.role
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentStatus('punched-in');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record punch-in');
    }
  };

  const handlePunchOut = async () => {
    try {
      await axios.post(
        `${API_URL}/punching-times/record-logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentStatus('punched-out');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record punch-out');
    }
  };

  return (
    <div className="punching-time-page">
      <h2>Staff Punching Time</h2>
      {error && <p className="error-message">{error}</p>}
      
      <div className="punch-status-container">
        <div className="punch-buttons">
          <button 
            className={`punch-in-btn ${currentStatus === 'punched-in' ? 'disabled' : ''}`}
            onClick={handlePunchIn}
            disabled={currentStatus === 'punched-in'}
          >
            Punch In
          </button>
          <button 
            className={`punch-out-btn ${currentStatus === 'punched-out' ? 'disabled' : ''}`}
            onClick={handlePunchOut}
            disabled={currentStatus === 'punched-out'}
          >
            Punch Out
          </button>
          <span className="status-indicator">
            Current Status: <strong>{currentStatus === 'punched-in' ? 'Punched In' : 'Punched Out'}</strong>
          </span>
        </div>
      </div>

      <div className="crud-form">
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => handleInput('email', e.target.value)}
          required
        />
        <select
          value={formData.role}
          onChange={(e) => handleInput('role', e.target.value)}
          required
        >
          <option value="">Select Role</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => handleInput('date', e.target.value)}
          required
        />
        <input
          type="time"
          value={formData.punchIn}
          onChange={(e) => handleInput('punchIn', e.target.value)}
          required
        />
        <input
          type="time"
          value={formData.punchOut}
          onChange={(e) => handleInput('punchOut', e.target.value)}
        />

        {editingId ? (
          <>
            <button className="save-btn" onClick={() => handleUpdate(editingId)}>
              <FaSave /> Save
            </button>
            <button className="cancel-btn" onClick={resetForm}>
              <FaTimes /> Cancel
            </button>
          </>
        ) : (
          <button className="add-btn" onClick={handleCreate}>
            <FaPlus /> Add
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Date</th>
            <th>Punch In</th>
            <th>Punch Out</th>
          </tr>
        </thead>
      <tbody>
  {punchingTimes.length > 0 ? (
    punchingTimes.map((record) => (
      <tr key={record._id} className={!record.punchOut ? 'missing-punch' : ''}>
        <td>{record.email}</td>
        <td>{record.role}</td>
        <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
        <td>{record.punchIn ? new Date(record.punchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</td>
        <td>{record.punchOut ? new Date(record.punchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</td>
        <td>
          <button className="edit-btn action-btn" onClick={() => handleEdit(record)}>
            <FaEdit />
          </button>
          <button className="delete-btn action-btn" onClick={() => handleDelete(record._id)}>
            <FaTrash />
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="6">No punching time data available.</td>
    </tr>
  )}
</tbody>
      </table>
    </div>
  );
};

export default PunchingTimePage;