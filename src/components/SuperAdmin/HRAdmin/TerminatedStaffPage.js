import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TerminatedStaffPage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';


const TerminatedStaffPage = () => {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    role: '',
    department: '',
    terminationDate: '',
    reason: '',
    details: '',
    lastWorkingDay: '',
    noticePeriodServed: false,
    exitInterview: false,
  });
  const [terminatedStaff, setTerminatedStaff] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentUser) {
          return;
        }

        setLoading(true);
        setError('');

        const idToken = await currentUser.getIdToken(true);
        const headers = {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        };

        const [terminatedRes, departmentsRes, companiesRes] = await Promise.all([
          axios.get(`${API_URL}/terminated-staff`, { headers }),
          axios.get(`${API_URL}/auth/all-departments`, { headers }),
          axios.get(`${API_URL}/companies`, { headers })
        ]);

        // Extract company names from API data
        const companyNames = companiesRes.data.map(company => ({
          _id: company._id || company.id,
          name: company.name || company.companyName || 'Unknown Company'
        }));

        setAllCompanies(companyNames);
        setTerminatedStaff(Array.isArray(terminatedRes?.data) ? terminatedRes.data : []);
        setDepartments(Array.isArray(departmentsRes?.data) ? departmentsRes.data : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to fetch data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreate = async () => {
    try {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      if (!formData.company || !formData.terminationDate || !formData.reason) {
        setError('Company, Termination Date, and Reason are required fields');
        return;
      }

      const terminationData = {
        company: formData.company,
        name: formData.name || undefined,
        role: formData.role || undefined,
        department: formData.department || undefined,
        terminationDate: formData.terminationDate,
        reason: formData.reason,
        details: formData.details,
        lastWorkingDay: formData.lastWorkingDay || undefined,
        noticePeriodServed: formData.noticePeriodServed,
        exitInterview: formData.exitInterview
      };

      const idToken = await currentUser.getIdToken(true);
      const response = await axios.post(`${API_URL}/terminated-staff`, terminationData, {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      setTerminatedStaff(prev => [...prev, response.data]);
      resetForm();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to create record');
      }
    }
  };

  const handleUpdate = async (id) => {
    try {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const updateData = {
        name: formData.name || undefined,
        role: formData.role || undefined,
        department: formData.department || undefined,
        reason: formData.reason,
        details: formData.details,
        lastWorkingDay: formData.lastWorkingDay || undefined,
        noticePeriodServed: formData.noticePeriodServed,
        exitInterview: formData.exitInterview
      };

      const idToken = await currentUser.getIdToken(true);
      const response = await axios.put(
        `${API_URL}/terminated-staff/${id}`,
        updateData,
        { 
          headers: { 
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      setTerminatedStaff(prev => 
        prev.map(item => (item._id === id ? response.data : item))
      );
      resetForm();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to update record');
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      if (!window.confirm('Are you sure you want to delete this terminated staff record?')) {
        return;
      }
      
      const idToken = await currentUser.getIdToken(true);
      await axios.delete(`${API_URL}/terminated-staff/${id}`, {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      setTerminatedStaff(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to delete record');
      }
    }
  };

  const handleEdit = (staff) => {
    setEditingId(staff._id);
    setFormData({
      company: staff.company?._id || staff.company || '',
      name: staff.name || '',
      role: staff.role || '',
      department: staff.department || '',
      terminationDate: staff.terminationDate ? staff.terminationDate.split('T')[0] : '',
      reason: staff.reason || '',
      details: staff.details || '',
      lastWorkingDay: staff.lastWorkingDay ? staff.lastWorkingDay.split('T')[0] : '',
      noticePeriodServed: staff.noticePeriodServed || false,
      exitInterview: staff.exitInterview || false,
    });
    setError('');
  };

  const resetForm = () => {
    setFormData({
      company: '',
      name: '',
      role: '',
      department: '',
      terminationDate: '',
      reason: '',
      details: '',
      lastWorkingDay: '',
      noticePeriodServed: false,
      exitInterview: false,
    });
    setEditingId(null);
    setError('');
  };

  return (
    <div className="terminated-staff-container">
      <div className="terminated-staff-header">
        <h2>Terminated Staff Management</h2>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="terminated-staff-content">
        <div className="staff-form-section">
          <h3>{editingId ? 'Edit Termination Record' : 'Add New Termination'}</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Company *</label>
              <select
                value={formData.company}
                onChange={(e) => handleInput('company', e.target.value)}
                required
                disabled={loading || editingId}
              >
                                 <option value="">Select Company</option>
                 {Array.isArray(allCompanies) && allCompanies.map(company => (
                   <option key={company._id || company.id || `company-${company.name}`} value={company._id || company.id}>{company.name}</option>
                 ))}
              </select>
            </div>

            <div className="form-group">
              <label>Staff Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInput('name', e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Role/Position</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleInput('role', e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleInput('department', e.target.value)}
              >
                                 <option value="">Select Department</option>
                 {Array.isArray(departments) && departments.map(dept => (
                   <option key={dept._id || dept.id || `dept-${dept.name}`} value={dept._id || dept.id}>{dept.name}</option>
                 ))}
              </select>
            </div>

            <div className="form-group">
              <label>Termination Date *</label>
              <input
                type="date"
                value={formData.terminationDate}
                onChange={(e) => handleInput('terminationDate', e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Last Working Day</label>
              <input
                type="date"
                value={formData.lastWorkingDay}
                onChange={(e) => handleInput('lastWorkingDay', e.target.value)}
                min={formData.terminationDate || undefined}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group full-width">
              <label>Termination Reason *</label>
              <select
                value={formData.reason}
                onChange={(e) => handleInput('reason', e.target.value)}
                required
              >
                <option value="">Select Reason</option>
                <option value="resignation">Resignation</option>
                <option value="termination">Termination</option>
                <option value="retirement">Retirement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Additional Details</label>
              <textarea
                value={formData.details}
                onChange={(e) => handleInput('details', e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.noticePeriodServed}
                  onChange={(e) => handleInput('noticePeriodServed', e.target.checked)}
                />
                Notice Period Served
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.exitInterview}
                  onChange={(e) => handleInput('exitInterview', e.target.checked)}
                />
                Exit Interview Conducted
              </label>
            </div>
          </div>

          <div className="form-actions">
            {editingId ? (
              <>
                <button className="save-btn" onClick={() => handleUpdate(editingId)}>
                  <FaSave /> Save Changes
                </button>
                <button className="cancel-btn" onClick={resetForm}>
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button 
                className="add-btn"
                onClick={handleCreate}
                disabled={loading || !formData.company || !formData.terminationDate || !formData.reason}
              >
                <FaPlus /> {editingId ? 'Update Record' : 'Add Termination Record'}
              </button>
            )}
          </div>
        </div>

        <div className="staff-list-section">
          <h3>Terminated Staff Records</h3>
          {loading ? (
            <div className="loading">Loading records...</div>
          ) : (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Termination Date</th>
                    <th>Reason</th>
                    <th>Notice Served</th>
                    <th>Exit Interview</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                                     {terminatedStaff.length > 0 ? (
                     terminatedStaff.map(staff => (
                       <tr key={staff._id || staff.id || `staff-${staff.name}-${staff.terminationDate}`}>
                        <td>{staff.name}</td>
                        <td>{staff.role}</td>
                        <td>{staff.department || 'N/A'}</td>
                        <td>{new Date(staff.terminationDate).toLocaleDateString()}</td>
                        <td>{staff.reason}</td>
                        <td>{staff.noticePeriodServed ? 'Yes' : 'No'}</td>
                        <td>{staff.exitInterview ? 'Yes' : 'No'}</td>
                        <td className="actions">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(staff)}
                            disabled={loading}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(staff._id)}
                            disabled={loading}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-records">No terminated staff records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminatedStaffPage;