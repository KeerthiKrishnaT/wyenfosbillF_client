import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateDepartment.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

const CreateDepartment = () => {
  const [departmentName, setDepartmentName] = useState('');
  const [contents, setContents] = useState('');
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.get('http://localhost:5000/api/departments', config);
      setDepartments(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch departments');
      }
    }
  }, [navigate]);

    useEffect(() => {
    const validateTokenAndFetch = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          throw new Error('Token expired');
        }

        setUserRole(decoded.role);
        await fetchDepartments(); 
        
      } catch (err) {
        console.error('Token validation error:', err);
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    validateTokenAndFetch();
  }, [navigate,fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== 'super_admin') {
      setError('Only Super Admins can manage departments');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        return;
      }

      const data = {
        name: departmentName,
        contents: contents.split(',').map(item => item.trim()).filter(Boolean)
      };

      let response;
      if (editingId) {
        response = await axios.put(
          `http://localhost:5000/api/departments/${editingId}`,
          data,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        response = await axios.post(
          'http://localhost:5000/api/departments',
          data,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (response.status === 200 || response.status === 201) {
        setMessage(editingId ? 'Department updated successfully' : 'Department created successfully');
        resetForm();
        fetchDepartments();
      }
    } catch (err) {
      console.error('Error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.msg || (editingId ? 'Failed to update department' : 'Failed to create department');
      setError(errorMsg);
    } finally {
      setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
    }
  };

  const handleEdit = (dept) => {
    setDepartmentName(dept.name);
    setContents(dept.contents.join(', '));
    setEditingId(dept._id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteId(id);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        return;
      }

      await axios.delete(
        `http://localhost:5000/api/departments/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('Department deleted successfully');
      fetchDepartments();
    } catch (err) {
      console.error('Error deleting department:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.msg || 'Failed to delete department';
      setError(errorMsg);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
      setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
    }
  };

  const resetForm = () => {
    setDepartmentName('');
    setContents('');
    setEditingId(null);
  };

  const handleBack = () => {
    if (editingId) {
      resetForm();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="dashboard-section">
      <div className="header-with-back">
        <button onClick={handleBack} className="bk-button">
          &larr; Back
        </button>
        <h2>{editingId ? 'Edit Department' : 'Create Department'}</h2>
      </div>
      {message && <p className="message success">{message}</p>}
      {error && <p className="message error">{error}</p>}
      
      {userRole !== 'super_admin' && (
        <div className="permission-warning">
          <p>⚠️ Only Super Admins can manage departments</p>
          <p>Your role: <strong>{userRole || 'Unknown'}</strong></p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="form-section">
        <input
          type="text"
          placeholder="Department Name"
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          required
          disabled={userRole !== 'super_admin'}
        />
        <input
          type="text"
          placeholder="Contents (comma-separated)"
          value={contents}
          onChange={(e) => setContents(e.target.value)}
          disabled={userRole !== 'super_admin'}
        />
        <div className="form-buttons">
          <button 
            type="submit" 
            className="btn-primary"
            disabled={userRole !== 'super_admin'}
          >
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={resetForm}
              disabled={userRole !== 'super_admin'}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <div className="department-list">
        <h3>Existing Departments</h3>
        {departments.length === 0 ? (
          <p>No departments created yet</p>
        ) : (
          <ul>
            {departments.map(dept => (
              <li key={dept._id}>
                <div className="department-header">
                  <strong>{dept.name}</strong>
                  {userRole === 'super_admin' && (
                    <div className="department-actions">
                      <button 
                        onClick={() => handleEdit(dept)}
                        className="btn-editt"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDelete(dept._id)}
                        className="btn-delette"
                        disabled={isDeleting && deleteId === dept._id}
                      >
                        {isDeleting && deleteId === dept._id ? 'Deleting...' : <FaTrash />}
                      </button>
                    </div>
                  )}
                </div>
                {dept.contents.length > 0 && (
                  <div className="contents">
                    {dept.contents.join(', ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CreateDepartment;