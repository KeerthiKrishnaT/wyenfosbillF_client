import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './StaffDetailsPage.css';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

const StaffDetailsPage = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    email: '', 
    mobile: '', 
    role: 'staff', 
    department: '',
    company: '' 
  });
  const [staff, setStaff] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);
  const timestampRef = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000/api';

useEffect(() => {
const fetchData = async () => {
  if (!token) {
    setError('No authentication token found. Please log in.');
    navigate('/login');
    return;
  }
  try {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const [companiesRes, staffRes] = await Promise.all([
      axios.get(`${API_URL}/companies`, { headers }),
      axios.get(`${API_URL}/staff`, { headers }),
    ]);
    
    // Ensure companies is always an array
    const companiesData = Array.isArray(companiesRes.data) ? companiesRes.data : [];
    const staffData = Array.isArray(staffRes.data) ? staffRes.data : [];
    
    const staffWithCompanies = staffData.map(staffMember => {
      const company = companiesData.find(c => c._id === staffMember.company?._id || c._id === staffMember.company);
      return {
        ...staffMember,
        company: company ? { _id: company._id, name: company.name } : null
      };
    });
    setCompanies(companiesData);
    setStaff(staffWithCompanies);
    setError('');
  } catch (err) {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    } else if (err.response?.status === 403) {
      setError('Access denied: You need HR Admin or Super Admin permissions to view staff.');
    } else {
      setError(`Failed to load data: ${err.response?.data?.error || err.message}`);
    }
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
  }
};
fetchData();
  }, [token, navigate]);

  const handleInput = (field, value) => {
    if (field === 'role' && (value === 'super admin' || value === 'staff')) {
      setFormData({ ...formData, [field]: value, department: '' });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleCreate = async () => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      return;
    }
  if (!formData.name || !formData.email || !formData.mobile || !formData.role || !formData.company) {
      setError('All fields are required except address and department (unless role is admin)');
      return;
    }
    if (formData.role === 'admin' && !formData.department) {
      setError('Department is required for admin role.');
      return;
    }
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        email: formData.email,
        mobile: formData.mobile,
        role: formData.role,
        company: formData.company

      };
      if (formData.role === 'admin') {
        payload.department = formData.department;
      }
      const response = await axios.post(`${API_URL}/staff`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
         const company = companies.find(c => c._id === formData.company);
      const newStaff = {
        ...response.data,
        company: { _id: company._id, name: company.name } // Add company name for display
      };

      setStaff([...staff, newStaff]);
      resetForm();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff member');
    }
  };

  const refreshStaffData = async () => {
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [staffRes, companiesRes] = await Promise.all([
      axios.get(`${API_URL}/staff`, { headers }),
      axios.get(`${API_URL}/companies`, { headers })
    ]);
    
    const updatedStaff = staffRes.data.map(staffMember => {
      const company = companiesRes.data.find(c => c._id === staffMember.company?._id || c._id === staffMember.company);
      return {
        ...staffMember,
        company: company ? { _id: company._id, name: company.name } : null
      };
    });
    
    setStaff(updatedStaff);
    setCompanies(companiesRes.data);
  } catch (err) {
    setError('Failed to refresh staff data');
  }
  };
  
  const handleUpdate = async (id) => {
  if (!formData.company) {
    setError('Company selection is required');
    return;
  }

  try {
    const payload = {
      name: formData.name,
      address: formData.address,
      email: formData.email,
      mobile: formData.mobile,
      role: formData.role,
      company: formData.company
    };

    if (formData.role === 'admin') {
      payload.department = formData.department;
    }
    
    await axios.put(`${API_URL}/staff/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    await refreshStaffData(); // This will now properly refresh all data
    setEditingId(null);
    resetForm();
    setError('');
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to update staff');
  }
  };

  const handleDelete = async (id) => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      return;
    }
    try {
      await axios.delete(`${API_URL}/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setStaff((prev) => prev.filter((item) => item._id !== id));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete staff');
    }
  };

  const handleEdit = (staffMember) => {
  setEditingId(staffMember._id);
  setFormData({
    name: staffMember.name,
    address: staffMember.address || '',
    email: staffMember.email,
    mobile: staffMember.mobile,
    role: staffMember.role,
    department: staffMember.department || '',
    company: staffMember.company?._id || staffMember.company || ''
  });
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', email: '', mobile: '', role: 'staff', department: '', company: '' });
    setEditingId(null);
    setError('');
  };

  const handlePrint = () => {
    if (tableRef.current && timestampRef.current) {
      const currentDate = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      timestampRef.current.textContent = `Printed on: ${currentDate} IST`;
      setTimeout(() => window.print(), 100); 
    }
  };

  const handleDownload = () => {
    if (tableRef.current) {
      const opt = {
        margin: 1,
        filename: 'staff_details.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      const tableClone = tableRef.current.cloneNode(true);
      const buttons = tableClone.querySelectorAll('.no-print');
      buttons.forEach(button => button.remove());
      const style = document.createElement('style');
      style.textContent = `
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #000; }
        .data-table th { background-color: #f4f4f4; font-weight: bold; }
        .data-table tr:nth-child(even) { background-color: #f9f9f9; }
      `;
      tableClone.appendChild(style);
      html2pdf().set(opt).from(tableClone).save();
    }
  };
 
   
  if (loading) {
    return <div className="loading">Loading staff data...</div>;
  }
 
  return (
    <div className="staff-details-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h2>Staff Management</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="staff-form-container">
        <h3>{editingId ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
        
        <div className="form-group">
          <label>Full Name*</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => handleInput('name', e.target.value)}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-group">
          <label>Email*</label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => handleInput('email', e.target.value)}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="form-group">
          <label>Mobile Number*</label>
          <input 
            type="tel" 
            value={formData.mobile}
            onChange={(e) => handleInput('mobile', e.target.value)}
            placeholder="Enter mobile number"
            required
          />
        </div>

        <div className="form-group">
          <label>Company*</label>
          <select
            value={formData.company}
            onChange={(e) => handleInput('company', e.target.value)}
            required
          >
            <option value="">Select Company</option>
            {Array.isArray(companies) && companies.map(company => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Role*</label>
          <select
            value={formData.role}
            onChange={(e) => handleInput('role', e.target.value)}
            required
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super admin">Super Admin</option>
          </select>
        </div>

        {formData.role === 'admin' && (
          <div className="form-group">
            <label>Department*</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInput('department', e.target.value)}
              placeholder="Enter department name"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInput('address', e.target.value)}
            placeholder="Enter address"
          />
        </div>

        <div className="form-actions">
          {editingId ? (
            <>
              <button className="btn-save" onClick={() => handleUpdate(editingId)}>
                <FaSave /> Save Changes
              </button>
              <button className="btn-cancel" onClick={resetForm}>
                <FaTimes /> Cancel
              </button>
            </>
          ) : (
            <button className="btn-add" onClick={handleCreate}>
              <FaPlus /> Add Staff Member
            </button>
          )}
        </div>
      </div>

      <div className="staff-list-container">
        <h3>Current Staff Members</h3>
        <div className="table-actions">
          <button onClick={handlePrint} className="btn-print">
            Print List
          </button>
          <button onClick={handleDownload} className="btn-download">
            Download as PDF
          </button>
        </div>

        <table className="staff-table" ref={tableRef}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Company</th>
              <th>Role</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length > 0 ? (
              staff.map((staffMember) => (
                <tr key={staffMember._id}>
                  <td>{staffMember.name}</td>
                  <td>{staffMember.email}</td>
                  <td>{staffMember.mobile}</td>
                  <td>{staffMember.company?.name || 'N/A'}</td>
                  <td>{staffMember.role}</td>
                  <td>{staffMember.department || 'N/A'}</td>
                  <td className="actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(staffMember)}
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(staffMember._id)}
                    >
                      <FaTrash />
                    </button>
            
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  No staff members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div ref={timestampRef} className="print-timestamp"></div>
      </div>
    </div>
  );
};

export default StaffDetailsPage;