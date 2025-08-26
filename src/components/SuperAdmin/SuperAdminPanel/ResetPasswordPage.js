import React, { useState, useEffect, useCallback } from 'react';
import { FaEye, FaEyeSlash, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import './ResetPasswordPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import axios from 'axios';

const ResetPasswordPage = () => {
  const [users, setUsers] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department: '',
    isActive: true
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Check if current user is super admin
  const isSuperAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'superadmin';

  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  // Fetch all users from Firestore
  const fetchAllUsers = useCallback(async () => {
    if (!currentUser || !isSuperAdmin) {
      setMessage({ type: 'error', text: 'Access denied. Super admin privileges required.' });
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users from database.' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, isSuperAdmin, navigate]);

  useEffect(() => {
    console.log('ResetPasswordPage useEffect:', {
      authLoading,
      currentUser: !!currentUser,
      userProfile: !!userProfile,
      userRole: userProfile?.role,
      isSuperAdmin
    });

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }
    
    if (!currentUser) {
      console.log('No current user, redirecting to login');
      setMessage({ type: 'error', text: 'Please login to access this page.' });
      navigate('/login');
      return;
    }
    
    if (!userProfile) {
      console.log('No user profile, redirecting to login');
      setMessage({ type: 'error', text: 'User profile not found. Please login again.' });
      navigate('/login');
      return;
    }
    
    console.log('User role:', userProfile.role, 'isSuperAdmin:', isSuperAdmin);
    
    if (isSuperAdmin) {
      console.log('User is super admin, fetching users...');
      fetchAllUsers();
    } else {
      console.log('User is not super admin, redirecting to dashboard');
      setMessage({ type: 'error', text: 'Access denied. Super admin privileges required.' });
      navigate('/dashboard');
    }
  }, [currentUser, userProfile, isSuperAdmin, authLoading, fetchAllUsers, navigate]);

  // Create new user using server API
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      await axios.post(`${API_BASE_URL}/api/reset-password`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        isActive: formData.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'User created successfully.' });
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department: '',
        isActive: true
      });
      fetchAllUsers();
    } catch (error) {
      console.error('Create user error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Session expired or unauthorized. Please login again.' });
        navigate('/login');
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create user.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Edit user using server API
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser || !formData.name || !formData.email) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        isActive: formData.isActive
      };

      // Add password to update data if provided
      if (formData.password && formData.password.length >= 6) {
        updateData.password = formData.password;
      }

      await axios.patch(`${API_BASE_URL}/api/reset-password/${editingUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'User updated successfully.' });
      setShowEditForm(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department: '',
        isActive: true
      });
      fetchAllUsers();
    } catch (error) {
      console.error('Edit user error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Session expired or unauthorized. Please login again.' });
        navigate('/login');
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update user.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete user using server API
  const handleDeleteUser = async (userId, role) => {
    if (role === 'super_admin' || role === 'superadmin') {
      setMessage({ type: 'error', text: 'Cannot delete Super Admin.' });
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      const token = await getAuthToken();
      await axios.delete(`${API_BASE_URL}/api/reset-password/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'User deleted successfully.' });
      fetchAllUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Session expired or unauthorized. Please login again.' });
        navigate('/login');
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete user.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password using server API
  const resetPassword = async (userId) => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in both password fields.' });
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

    setLoading(true);
    try {
      const token = await getAuthToken();
      await axios.put(`${API_BASE_URL}/api/reset-password/${userId}/reset-password`, {
        password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'Password reset successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUserId('');
      fetchAllUsers();
    } catch (error) {
      console.error('Reset password error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Session expired or unauthorized. Please login again.' });
        navigate('/login');
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to reset password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'staff',
      department: user.department || '',
      isActive: user.isActive !== false
    });
    setShowEditForm(true);
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="reset-password-page">
        <div className="loading">
          <h2>Loading...</h2>
          <p>Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  // If not super admin, show access denied
  if (currentUser && !isSuperAdmin) {
    return (
      <div className="reset-password-page">
        <button className="leaverequests-back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <button className="leaverequests-back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2>User Management</h2>
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      
      {/* Create User Button */}
      <button 
        className="create-user-btn" 
        onClick={() => setShowCreateForm(true)}
        style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        <FaPlus /> Create New User
      </button>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department:</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Form */}
      {showEditForm && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit User</h3>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current):</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department:</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update User'}
                </button>
                <button type="button" onClick={() => setShowEditForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Password Reset Form */}
      <div className="quick-reset-section">
        <h3>Quick Password Reset</h3>
        <form onSubmit={(e) => { e.preventDefault(); resetPassword(selectedUserId); }}>
          <div className="form-group">
            <label>Select User:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
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
      </div>

      {/* Users Table */}
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
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                <td data-label="Name">{user.name}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Role">{user.role}</td>
                <td data-label="Department">{user.department || '-'}</td>
                <td data-label="Status">
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td data-label="Created">
                  {user.createdAt ? new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString() : '-'}
                </td>
                <td data-label="Actions">
                  <button 
                    className="editbtn" 
                    onClick={() => openEditForm(user)}
                    title="Edit User"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="resetbtn" 
                    onClick={() => setSelectedUserId(user.id)}
                    title="Reset Password"
                  >
                    🔑
                  </button>
                  {(user.role !== 'super_admin' && user.role !== 'superadmin') && (
                    <button 
                      className="deletebtn" 
                      onClick={() => handleDeleteUser(user.id, user.role)}
                      title="Delete User"
                    >
                      <FaTrash />
                    </button>
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