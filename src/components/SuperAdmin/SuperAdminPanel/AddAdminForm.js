import React, { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './AddAdminForm.css';
import { useNavigate } from 'react-router-dom';

const AddAdminForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    department: '',
    accessibleSections: [],
  });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editAdminId, setEditAdminId] = useState(null);

  const navigate = useNavigate();

  const sections = [
    { id: 'dashboard', name: 'Dashboard', category: 'core' },
    { id: 'inventory', name: 'Inventory Management', category: 'operations' },
    { id: 'orders', name: 'Order Management', category: 'operations' },
    { id: 'purchase', name: 'Purchase Management', category: 'operations' },
    { id: 'reporting', name: 'Reports & Analytics', category: 'analytics' },
    { id: 'support', name: 'Customer Support', category: 'customer' },
    { id: 'billing', name: 'Billing & Invoicing', category: 'finance' },
    { id: 'customers', name: 'Customer Management', category: 'customer' },
    { id: 'staff_management', name: 'Staff Management', category: 'hr' },
    { id: 'vouchers', name: 'Voucher Management', category: 'finance' },
  ];

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSectionChange = (sectionId) => {
    setFormData((prev) => {
      const accessibleSections = prev.accessibleSections.includes(sectionId)
        ? prev.accessibleSections.filter((s) => s !== sectionId)
        : [...prev.accessibleSections, sectionId];
      return { ...prev, accessibleSections };
    });
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      accessibleSections: sections.map(section => section.id)
    }));
  };

  const handleSelectNone = () => {
    setFormData((prev) => ({
      ...prev,
      accessibleSections: []
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const fetchAdmins = useCallback(async () => {
    setAdminLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('fetchAdmins: Token available:', !!token);
      
      const response = await fetch('http://localhost:5000/api/auth/admins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('fetchAdmins: Response status:', response.status);
      console.log('fetchAdmins: Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('fetchAdmins: Error response:', errorText);
        throw new Error(`Failed to fetch admins: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('fetchAdmins: Received data:', data);
      setAdmins(data);
    } catch (error) {
      console.error('Fetch admins error:', error);
      setErrors([{ msg: error.message || 'Failed to fetch admins. Please try again.' }]);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');
    setLoading(true);

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors([{ msg: 'Please enter a valid email address.' }]);
      setLoading(false);
      return;
    }
    if (!isEditing && formData.password.length < 6) {
      setErrors([{ msg: 'Password must be at least 6 characters long.' }]);
      setLoading(false);
      return;
    }
    if (formData.role === 'admin' && !formData.department) {
      setErrors([{ msg: 'Please select a department for Admin role.' }]);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = isEditing 
        ? `http://localhost:5000/api/auth/admins/${editAdminId}`
        : 'http://localhost:5000/api/auth/admins';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to ${isEditing ? 'update' : 'add'} admin.`);
      }

      setSuccessMessage(result.message);
      
      if (!isEditing) {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'admin',
          department: '',
          accessibleSections: [],
        });
      }

      // Reset editing state
      setIsEditing(false);
      setEditAdminId(null);

      // Refresh admin list
      fetchAdmins();
    } catch (error) {
      console.error(`${isEditing ? 'Update' : 'Add'} admin error:`, error);
      setErrors([{ msg: error.message || 'Network error, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = (admin) => {
  setIsEditing(true);
  setEditAdminId(admin.id || admin._id);
  setFormData({
    name: admin.name,
    email: admin.email,
    password: '', 
    role: admin.role,
    department: admin.department || '',
    accessibleSections: admin.accessibleSections || [],
  });
};

  useEffect(() => {
    const fetchDepartments = async () => {
      setDeptLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/departments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch departments');
        }

        const data = await response.json();
        setDepartments(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Fetch departments error:', error);
        setErrors((prev) => [...prev, { msg: error.message || 'Failed to load departments' }]);
      } finally {
        setDeptLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete admin');
      }

      setSuccessMessage('Admin deleted successfully');
      fetchAdmins();
    } catch (error) {
      console.error('Delete admin error:', error);
      setErrors([{ msg: error.message || 'Failed to delete admin' }]);
    }
  };

  return (
    <div className="add-admin-form">
      <div className="form-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h2>Add New Admin</h2>
        <div className="header-buttons">
          <button 
            onClick={fetchAdmins} 
            className="refresh-button"
            disabled={adminLoading}
          >
            {adminLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>

        </div>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}

      {errors.length > 0 && (
        <div className="error-messages">
          {errors.map((error, index) => (
            <p key={index}>{error.msg}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter email"
          />
        </div>

        <div className="form-group pass-group">
          <label htmlFor="password">Password</label>
          <div className="pass-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
            />
            <button
              type="button"
              className="pass-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <div className="pass-strength">
            <div className={`strength-bar ${formData.password.length > 0 ? 'active' : ''}`}></div>
            <div className={`strength-bar ${formData.password.length > 3 ? 'active' : ''}`}></div>
            <div className={`strength-bar ${formData.password.length > 6 ? 'active' : ''}`}></div>
            <div className={`strength-bar ${formData.password.length > 9 ? 'active' : ''}`}></div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select id="role" value={formData.role} onChange={handleChange} required>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {formData.role === 'admin' && (
          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              value={formData.department}
              onChange={handleChange}
              required
              disabled={deptLoading}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id || dept._id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            {deptLoading && <small>Loading departments...</small>}
          </div>
        )}

        <div className="form-group">
          <div className="sections-header">
            <label>Accessible Sections</label>
            <div className="section-controls">
              <button
                type="button"
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                Select All
              </button>
              <button
                type="button"
                className="select-none-btn"
                onClick={handleSelectNone}
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="checkbox-group">
            {sections.map((section) => (
              <label key={section.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.accessibleSections.includes(section.id)}
                  onChange={() => handleSectionChange(section.id)}
                />
                <span>{section.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-buttons">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || (formData.role === 'admin' && !formData.department)}
          >
            {loading ? (
              <>
                <span className="spinner"></span> {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              isEditing ? 'Update Admin' : 'Add Admin'
            )}
          </button>
          
          {isEditing && (
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setEditAdminId(null);
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'admin',
                  department: '',
                  accessibleSections: [],
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="admin-list-section">
        <h3>Existing Admins</h3>
        {adminLoading ? (
          <div className="loading">Loading admins...</div>
        ) : admins.length === 0 ? (
          <div className="no-admins">
            <p>No admins found</p>
            <button onClick={fetchAdmins} className="retry-button">
              🔄 Retry
            </button>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Accessible Sections</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id || admin._id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</td>
                  <td>{admin.department || 'N/A'}</td>
                  <td>
                    {admin.accessibleSections && admin.accessibleSections.length > 0 ? (
                      <ul className="section-list">
                        {admin.accessibleSections.map((section, idx) => (
                          <li key={idx}>{section}</li>
                        ))}
                      </ul>
                    ) : (
                      'None'
                    )}
                  </td>
                  <td className="actions-cell">
                 <button
  className="action-btn edit-btn"
  onClick={() => handleEditAdmin(admin)}
  title="Edit Admin"
>
  <FaEdit />
</button>

                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteAdmin(admin.id || admin._id)}
                      title="Delete Admin"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AddAdminForm;