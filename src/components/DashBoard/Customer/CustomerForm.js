import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

function CustomerForm({ customerId }) {
  const [form, setForm] = useState({
    customerName: '',
    customerContact: {
      phone: '',
      email: '',
      address: '',
      gstin: '',
    },
    company: '',
    createdBy: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [showFirecracker, setShowFirecracker] = useState(false);

  useEffect(() => {
    if (customerId) {
      const fetchCustomer = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('No authentication token');
          const res = await axios.get(`${API_BASE_URL}/api/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setForm(res.data);
        } catch (err) {
          alert('Failed to fetch customer: ' + err.message);
        }
      };
      fetchCustomer();
    }
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    if (['phone', 'email', 'address', 'gstin'].includes(name)) {
      setForm({
        ...form,
        customerContact: { ...form.customerContact, [name]: value },
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to flip book
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to add a customer.');
      return;
    }
    try {
      const payload = {
        ...form,
        createdBy: form.createdBy || 'admin',
        company: form.company || 'default_company',
      };
      console.log('Submitting payload:', payload);
      if (customerId) {
        await axios.put(`${API_BASE_URL}/api/customers/${customerId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('Customer updated successfully! 🎉');
      } else {
        await axios.post(`${API_BASE_URL}/api/customers`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('Customer added successfully! 🎉');
      }
      setShowFirecracker(true);
      setTimeout(() => setShowFirecracker(false), 2000);
      setForm({
        customerName: '',
        customerContact: { phone: '', email: '', address: '', gstin: '' },
        company: '',
        createdBy: '',
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      alert(`Error saving customer: ${errorMessage}`);
      console.error('Submission error:', err);
    }
  };

  return (
    <div className="customer-form-container">
      {showFirecracker && (
        <div className="firecracker-overlay">
          <div className="firecracker-particle particle-1"></div>
          <div className="firecracker-particle particle-2"></div>
          <div className="firecracker-particle particle-3"></div>
          <div className="firecracker-particle particle-4"></div>
          <div className="firecracker-particle particle-5"></div>
        </div>
      )}
      <div className="customer-form-card">
        {successMessage && (
          <div className="success-message">
            <span>{successMessage}</span>
          </div>
        )}
        <form className="customers-form" onSubmit={handleSubmit}>
          <h3>{customerId ? 'Edit' : 'Add'} Customer</h3>
          <input
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            placeholder="Customer Name"
            required
            autoFocus
            onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
          />
          <input
            name="phone"
            value={form.customerContact.phone}
            onChange={handleChange}
            placeholder="Phone"
            required
            onClick={(e) => e.stopPropagation()}
          />
          <input
            name="email"
            value={form.customerContact.email}
            onChange={handleChange}
            placeholder="Email"
            onClick={(e) => e.stopPropagation()}
          />
          <input
            name="address"
            value={form.customerContact.address}
            onChange={handleChange}
            placeholder="Address"
            onClick={(e) => e.stopPropagation()}
          />
          <input
            name="gstin"
            value={form.customerContact.gstin}
            onChange={handleChange}
            placeholder="GSTIN"
            onClick={(e) => e.stopPropagation()}
          />
          <input
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="Company"
            required
            onClick={(e) => e.stopPropagation()}
          />
          <input
            name="createdBy"
            value={form.createdBy}
            onChange={handleChange}
            placeholder="Created By"
            required
            onClick={(e) => e.stopPropagation()}
          />
          <button type="submit" className='savebtn'onClick={(e) => e.stopPropagation()}>
            {customerId ? 'Update' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;