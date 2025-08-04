import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaSave, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './AppointmentsPage.css';

const StaffAppointments = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    company: '',
    date: '',
    status: 'pending'
  });
  const [appointments, setAppointments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [appointmentsRes, companiesRes] = await Promise.all([
          axios.get('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/companies', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        console.log('Fetched appointments:', appointmentsRes.data);
        setAppointments(appointmentsRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.role || !form.company || !form.date) {
      setError('Name, Role, Company, and Date are required');
      return;
    }
    if (form.company === '') {
      setError('Please select a valid company');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Submitting form:', form);
      const res = await axios.post('/api/appointments', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response data:', res.data);
      setAppointments(prev => [...prev, res.data]);
      setForm({
        name: '',
        phone: '',
        email: '',
        role: '',
        company: '',
        date: '',
        status: 'pending'
      });
      setError('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create appointment';
      setError(errorMessage);
      console.error('Create error:', err.response?.data || err);
    }
  };

  const startEditing = (appointment) => {
    if (!appointment.name || !appointment.role || !appointment.date) {
      setError('Cannot edit: Appointment is missing required fields (Name, Role, or Date)');
      return;
    }
    setEditingId(appointment._id);
    setEditForm({
      name: appointment.name || '',
      phone: appointment.phone || '',
      email: appointment.email || '',
      role: appointment.role || '',
      company: appointment.company?._id || '',
      status: appointment.status || 'pending',
      date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async () => {
    const errors = [];
    if (!editForm.name) errors.push('Name');
    if (!editForm.role) errors.push('Role');
    if (!editForm.company) errors.push('Company');
    if (!editForm.date) errors.push('Date');

    if (errors.length > 0) {
      setError(`${errors.join(', ')} ${errors.length > 1 ? 'are' : 'is'} required`);
      return;
    }

    try {
      console.log('Sending update payload:', editForm);
      const res = await axios.put(`/api/appointments/${editingId}`, {
        ...editForm,
        company: editForm.company || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAppointments(prev => 
        prev.map(app => app._id === editingId ? res.data : app)
      );
      setEditingId(null);
      setEditForm({});
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update appointment. Please check all fields.');
      console.error('Update error:', err.response?.data || err);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      await axios.delete(`/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAppointments(prev => prev.filter(app => app._id !== id));
    } catch (err) {
      setError('Failed to delete appointment');
      console.error(err);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) return <div className="loading-indicator">Loading appointments...</div>;

  return (
    <div className="appointments-page">
      <div className="page-header">
        <button onClick={handleBack} className="back-button">
          <FaArrowLeft /> Back
        </button>
        <h2>Staff Appointments</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="appointment-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            name="name"
            placeholder="Full Name*"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            name="role"
            placeholder="Role/Position*"
            value={form.role}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <input
            type="date"
            name="date"
            placeholder="Appointment Date*"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <select
            name="company"
            value={form.company}
            onChange={handleChange}
            required
          >
            <option value="">Select Company*</option>
            {companies.map(company => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button type="submit" className="submit-button">
          Add Staff Appointment
        </button>
      </form>

      <div className="appoiment-list">
        <h2>Saved Appointments</h2>
        <table className="appoiment-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Role</th>
              <th>Date</th>
              <th>Company</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No appointments found</td>
              </tr>
            ) : (
              appointments.map(app => (
                <tr key={app._id}>
                  {editingId === app._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="tel"
                          name="phone"
                          value={editForm.phone}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="role"
                          value={editForm.role}
                          onChange={handleEditChange}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          name="date"
                          value={editForm.date}
                          onChange={handleEditChange}
                          required
                        />
                      </td>
                      <td>
                        <select
                          name="company"
                          value={editForm.company}
                          onChange={handleEditChange}
                          required
                        >
                          <option value="">Select Company*</option>
                          {companies.map(company => (
                            <option key={company._id} value={company._id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          name="status"
                          value={editForm.status}
                          onChange={handleEditChange}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="actions">
                        <button onClick={handleUpdate} className="save">
                          <FaSave /> Save
                        </button>
                        <button onClick={cancelEditing} className="cancel">
                          <FaTimes /> Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{app.name}</td>
                      <td>{app.phone || '-'}</td>
                      <td>{app.email || '-'}</td>
                      <td>{app.role}</td>
                      <td>{app.date ? new Date(app.date).toLocaleDateString() : '-'}</td>
                      <td>{app.company?.name || '-'}</td>
                      <td className={`status-${app.status}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </td>
                      <td className="actions">
                        <button onClick={() => startEditing(app)} className="edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(app._id)} className="delete">
                          <FaTrash />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffAppointments;