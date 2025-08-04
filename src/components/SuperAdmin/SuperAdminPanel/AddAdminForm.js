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
    'dashboard',
    'inventory',
    'orders',
    'purchase',
    'reporting',
    'support',
    'billing',
    'customers',
    'staff_management',
    'vouchers',
  ];

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSectionChange = (section) => {
    setFormData((prev) => {
      const accessibleSections = prev.accessibleSections.includes(section)
        ? prev.accessibleSections.filter((s) => s !== section)
        : [...prev.accessibleSections, section];
      return { ...prev, accessibleSections };
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const fetchAdmins = useCallback(async () => {
    setAdminLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/admins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admins: ${response.statusText}`);
      }

      const data = await response.json();
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
    if (formData.password.length < 6) {
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
      const response = await fetch('http://localhost:5000/api/auth/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add admin.');
      }

      setSuccessMessage(result.message);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        department: '',
        accessibleSections: [],
      });

      // Refresh admin list
      fetchAdmins();
    } catch (error) {
      console.error('Add admin error:', error);
      setErrors([{ msg: error.message || 'Network error, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = (admin) => {
  setIsEditing(true);
  setEditAdminId(admin._id);
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
                <option key={dept._id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            {deptLoading && <small>Loading departments...</small>}
          </div>
        )}

        <div className="form-group">
          <label>Accessible Sections</label>
          <div className="checkbox-group">
            {sections.map((section) => (
              <label key={section} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.accessibleSections.includes(section)}
                  onChange={() => handleSectionChange(section)}
                />
                <span>{section.charAt(0).toUpperCase() + section.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || (formData.role === 'admin' && !formData.department)}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Adding...
            </>
          ) : (
            'Add Admin'
          )}
        </button>
      </form>
      <div className="admin-list-section">
        <h3>Existing Admins</h3>
        {adminLoading ? (
          <div className="loading">Loading admins...</div>
        ) : admins.length === 0 ? (
          <p>No admins found</p>
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
                <tr key={admin._id}>
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
                      onClick={() => handleDeleteAdmin(admin._id)}
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