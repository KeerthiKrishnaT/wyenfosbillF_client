
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

function CustomerSelect({ selectedId, onChange }) {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token');
        const res = await axios.get(`${API_BASE_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="customer-select-container">
      <select value={selectedId} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a customer</option>
        {customers.map((customer) => (
          <option key={customer._id} value={customer._id}>
            {customer.customerName}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CustomerSelect;
