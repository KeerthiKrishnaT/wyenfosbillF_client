import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './ResetPasswordPage.css';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [users, setUsers] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchAllUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'Unauthorized. Please login again.' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reset-password`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API response:', response.data); // Debug log
      // Validate user data
      if (!Array.isArray(response.data) || response.data.some(user => !user._id)) {
        console.error('Invalid user data: missing _id', response.data);
        setMessage({ type: 'error', text: 'Invalid user data received from server. Please contact support.' });
        setUsers([]);
        return;
      }
      setUsers(response.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Session expired or unauthorized. Please login again.' });
        localStorage.removeItem('token');
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch users.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword || !selectedUserId) {
      setMessage({ type: 'error', text: 'Select a user and fill in both password fields.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(selectedUserId)) {
      setMessage({ type: 'error', text: 'Invalid user selection.' });
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/reset-password/${selectedUserId}`, {
        password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessage({ type: 'success', text: 'Password reset successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUserId('');
      fetchAllUsers();
    } catch (error) {
      console.error('Reset error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, role) => {
    if (role === 'super_admin') {
      setMessage({ type: 'error', text: 'Cannot delete Super Admin.' });
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      setMessage({ type: 'error', text: 'Invalid user ID for deletion.' });
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/reset-password/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessage({ type: 'success', text: 'User deleted successfully.' });
      fetchAllUsers();
    } catch (err) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <button className="leaverequests-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2>Reset User Passwords</h2>
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      {loading && <p>Loading...</p>}
      <form onSubmit={handleResetPassword}>
        <div className="form-group">
          <label>Select User:</label>
          <select
            value={selectedUserId}
            onChange={(e) => {
              console.log('Selected value:', e.target.value); // Debug
              setSelectedUserId(e.target.value);
            }}
            required
          >
            <option key="default" value="" disabled>Select user</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email}, {user.role})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>New Password:</label>
          <div className="password-input-container">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              required
            />
            <span
              className="password-toggle-icon"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </div>
        <div className="form-group">
          <label>Confirm Password:</label>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            <span
              className="password-toggle-icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </div>
        <button type="submit" className="reset-btn" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <h3>All Users</h3>
      {loading ? (
        <p>Loading users...</p>
      ) : users.length > 0 ? (
        <table className="staff-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td data-label="Name">{user.name}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Role">{user.role}</td>
                <td data-label="Department">{user.department || '-'}</td>
                <td data-label="Actions">
                  <button className="editbtn" onClick={() => setSelectedUserId(user._id)}>Edit</button>
                  {user.role !== 'super_admin' && (
                    <button className="deletebtn" onClick={() => handleDeleteUser(user._id, user.role)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No users found.</p>
      )}
    </div>
  );
};

export default ResetPasswordPage;