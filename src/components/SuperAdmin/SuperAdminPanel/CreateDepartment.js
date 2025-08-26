import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateDepartment.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const fetchDepartments = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!currentUser) {
        setError('Please login to access this page.');
        return;
      }
      
      const token = await currentUser.getIdToken(true);
      const config = {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get(`http://localhost:5000/api/departments?t=${Date.now()}`, config);
      const raw = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      
      const normalized = raw.map((d, index) => ({
        ...d,
        id: d.id || d._id || `dept-${index}`,
        contents: Array.isArray(d?.contents) ? d.contents : [],
      }));
      
      setDepartments(normalized);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch departments');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (userProfile) {
      setUserRole(userProfile.role || '');
      fetchDepartments();
    }
  }, [navigate, fetchDepartments, currentUser, userProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== 'superadmin' && userRole !== 'super_admin') {
      setError('Only Super Admins can manage departments');
      return;
    }

    try {
      if (!currentUser) {
        setError('Please log in');
        return;
      }
      
      const token = await currentUser.getIdToken(true);

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
      let errorMsg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.msg || (editingId ? 'Failed to update department' : 'Failed to create department');
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
    const list = Array.isArray(dept.contents) ? dept.contents : [];
    setContents(list.join(', '));
    setEditingId(dept.id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteId(id);
      if (!currentUser) {
        setError('Please log in');
        return;
      }
      
      const token = await currentUser.getIdToken(true);

      await axios.delete(
        `http://localhost:5000/api/departments/${id}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage('Department deleted successfully');
      
      // Force refresh the departments list
      setDepartments([]);
      // Add a small delay to ensure server has processed the deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchDepartments();
    } catch (err) {
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
        <button 
          onClick={fetchDepartments} 
          className="refresh-button"
          disabled={(userRole !== 'superadmin' && userRole !== 'super_admin') || isRefreshing}
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
      {message && <p className="message success">{message}</p>}
      {error && <p className="message error">{error}</p>}
      
      {(userRole !== 'superadmin' && userRole !== 'super_admin') && (
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
          disabled={userRole !== 'superadmin' && userRole !== 'super_admin'}
        />
        <input
          type="text"
          placeholder="Contents (comma-separated)"
          value={contents}
          onChange={(e) => setContents(e.target.value)}
          disabled={userRole !== 'superadmin' && userRole !== 'super_admin'}
        />
        <div className="form-buttons">
          <button 
            type="submit" 
            className="btn-primary"
            disabled={userRole !== 'superadmin' && userRole !== 'super_admin'}
          >
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={resetForm}
              disabled={userRole !== 'superadmin' && userRole !== 'super_admin'}
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
            {departments.map((dept, index) => (
              <li key={dept.id}>
                <div className="department-header">
                  <strong>{dept.name}</strong>
                  {(userRole === 'superadmin' || userRole === 'super_admin') && (
                    <div className="department-actions">
                      <button 
                        key={`edit-${dept.id}`}
                        onClick={() => handleEdit(dept)}
                        className="btn-editt"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        key={`delete-${dept.id}`}
                        onClick={() => handleDelete(dept.id)}
                        className="btn-delette"
                        disabled={isDeleting && deleteId === dept.id}
                      >
                        {isDeleting && deleteId === dept.id ? 'Deleting...' : <FaTrash />}
                      </button>
                    </div>
                  )}
                </div>
                {Array.isArray(dept.contents) && dept.contents.length > 0 && (
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