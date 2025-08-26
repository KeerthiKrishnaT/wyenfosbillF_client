import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PunchingTimePage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus, FaUsers, FaClock, FaSignInAlt, FaSignOutAlt, FaInfoCircle, FaUser } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';

const PunchingTimePage = () => {
  const { currentUser, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    date: '',
    punchIn: '',
    punchOut: ''
  });
  const [punchingTimes, setPunchingTimes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserPunchStatus, setCurrentUserPunchStatus] = useState(null);
  
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchAllUsers();
      fetchCurrentUserStatus();
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserStatus = async () => {
    try {
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const statusRes = await axios.get(`${API_URL}/punching-times/current`, { headers });
      setCurrentUserPunchStatus(statusRes.data ? 'punched-in' : 'punched-out');
    } catch (err) {
      setCurrentUserPunchStatus('punched-out');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const response = await axios.get(`${API_URL}/auth/users/all`, { headers });
      setAllUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to fetch users list');
    }
  };

  const handleInput = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const response = await axios.post(
        `${API_URL}/punching-times`,
        formData,
        { headers }
      );
      setPunchingTimes(prev => [...prev, response.data]);
      setFormData({ email: '', role: '', date: '', punchIn: '', punchOut: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create punching time');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      const response = await axios.put(
        `${API_URL}/punching-times/${id}`,
        formData,
        { headers }
      );
      setPunchingTimes(prev =>
        prev.map(item => (item.id === id ? response.data : item))
      );
      setEditingId(null);
      setFormData({ email: '', role: '', date: '', punchIn: '', punchOut: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update punching time');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this punching time record?')) {
      return;
    }
    
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      await axios.delete(`${API_URL}/punching-times/${id}`, { headers });
      setPunchingTimes(prev => prev.filter(item => item.id !== id));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete punching time');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
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
    setSelectedUser(null);
  };

  const handlePunchIn = async () => {
    if (!selectedUser) {
      setError('Please select a user first');
      return;
    }
    
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      await axios.post(
        `${API_URL}/punching-times/record-login`,
        {
          email: selectedUser.email,
          role: selectedUser.role,
          name: selectedUser.name
        },
        { headers }
      );
      setCurrentStatus('punched-in');
      fetchData(); // Refresh the list
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record punch-in');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!selectedUser) {
      setError('Please select a user first');
      return;
    }
    
    try {
      setLoading(true);
      const idToken = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      
      await axios.post(
        `${API_URL}/punching-times/record-logout`,
        {
          email: selectedUser.email
        },
        { headers }
      );
      setCurrentStatus('punched-out');
      fetchData(); // Refresh the list
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record punch-out');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      email: user.email,
      role: user.role
    }));
  };

  const getStatusColor = (status) => {
    return status === 'punched-in' ? '#28a745' : '#dc3545';
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!currentUser) {
    return <div className="punching-time-page">Loading...</div>;
  }

  return (
    <div className="punching-time-page">
      <div className="page-header">
        <h2><FaClock /> Staff Punching Time Management</h2>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          🔄 Refresh
        </button>
      </div>
      
      {/* Current User Status */}
      {currentUser && (
        <div className="current-user-status">
          <div className="user-info">
            <FaUser className="user-icon" />
            <span className="user-name">
              {userProfile?.name || userProfile?.displayName || currentUser.displayName || currentUser.email}
            </span>
            <span className="user-role">
              ({userProfile?.role || 'user'})
            </span>
          </div>
          <div className="punch-status">
            Status: <strong style={{ color: getStatusColor(currentUserPunchStatus) }}>
              {currentUserPunchStatus === 'punched-in' ? '🟢 Punched In' : '🔴 Punched Out'}
            </strong>
          </div>
        </div>
      )}
  
      {error && <div className="error-message">{error}</div>}
      
      <div className="punch-status-container">
        <div className="user-selector">
          <label>Select User:</label>
          <select 
            value={selectedUser?.email || ''} 
            onChange={(e) => {
              const user = allUsers.find(u => u.email === e.target.value);
              handleUserSelect(user);
            }}
            disabled={loading}
          >
            <option value="">Choose a user...</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.email}>
                {user.name} ({user.email}) - {user.role}
              </option>
            ))}
          </select>
        </div>
        
        <div className="punch-buttons">
          <button 
            className={`punch-in-btn ${currentStatus === 'punched-in' || !selectedUser ? 'disabled' : ''}`}
            onClick={handlePunchIn}
            disabled={currentStatus === 'punched-in' || !selectedUser || loading}
          >
            <FaSignInAlt /> Manual Punch In
          </button>
          <button 
            className={`punch-out-btn ${currentStatus === 'punched-out' || !selectedUser ? 'disabled' : ''}`}
            onClick={handlePunchOut}
            disabled={currentStatus === 'punched-out' || !selectedUser || loading}
          >
            <FaSignOutAlt /> Manual Punch Out
          </button>
          {selectedUser && (
            <span className="status-indicator">
              Current Status: <strong style={{ color: getStatusColor(currentStatus) }}>
                {currentStatus === 'punched-in' ? 'Punched In' : 'Punched Out'}
              </strong>
            </span>
          )}
        </div>
      </div>

      <div className="crud-form">
        <h4><FaInfoCircle /> Manual Record Entry (For Override/Correction)</h4>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => handleInput('email', e.target.value)}
          required
          disabled={loading}
        />
        <select
          value={formData.role}
          onChange={(e) => handleInput('role', e.target.value)}
          required
          disabled={loading}
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
          disabled={loading}
        />
        <input
          type="time"
          value={formData.punchIn}
          onChange={(e) => handleInput('punchIn', e.target.value)}
          required
          disabled={loading}
        />
        <input
          type="time"
          value={formData.punchOut}
          onChange={(e) => handleInput('punchOut', e.target.value)}
          disabled={loading}
        />

        {editingId ? (
          <>
            <button className="save-btn" onClick={() => handleUpdate(editingId)} disabled={loading}>
              <FaSave /> Save
            </button>
            <button className="cancel-btn" onClick={resetForm} disabled={loading}>
              <FaTimes /> Cancel
            </button>
          </>
        ) : (
          <button className="add-btn" onClick={handleCreate} disabled={loading}>
            <FaPlus /> Add Manual Record
          </button>
        )}
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3><FaUsers /> Punching Time Records</h3>
          <span className="record-count">Total Records: {punchingTimes.length}</span>
        </div>
        
        {loading ? (
          <div className="loading-message">Loading punching time records...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {punchingTimes.length > 0 ? (
                punchingTimes.map((record) => (
                  <tr key={record.id} className={!record.punchOut ? 'missing-punch' : ''}>
                    <td>{record.name || 'N/A'}</td>
                    <td>{record.email}</td>
                    <td>
                      <span className={`role-badge role-${record.role}`}>
                        {record.role}
                      </span>
                    </td>
                    <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                    <td>{record.punchIn ? new Date(record.punchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</td>
                    <td>{record.punchOut ? new Date(record.punchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</td>
                    <td>{formatDuration(record.duration)}</td>
                    <td>
                      <button className="edit-btn action-btn" onClick={() => handleEdit(record)} disabled={loading}>
                        <FaEdit />
                      </button>
                      <button className="delete-btn action-btn" onClick={() => handleDelete(record.id)} disabled={loading}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No punching time data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PunchingTimePage;