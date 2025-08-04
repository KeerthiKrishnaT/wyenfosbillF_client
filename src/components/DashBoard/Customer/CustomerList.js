import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

function CustomerList({ onEdit }) {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        const res = await axios.get(`${API_BASE_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomers(res.data);
      } catch (err) {
        alert('Failed to fetch customers: ' + err.message);
      }
    };
    fetchCustomers();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        await axios.delete(`${API_BASE_URL}/api/customers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomers(customers.filter((customer) => customer._id !== id));
      } catch (err) {
        alert('Failed to delete customer: ' + err.message);
      }
    }
  };

  const handleEdit = (customer, e) => {
    e.stopPropagation(); // Prevent click from bubbling to flip book
    onEdit(customer._id);
  };

  return (
    <div className="customer-list-container">
      <h3>Customer List</h3>
      <div className="table-responsive">
        <table className="customer-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>GSTIN</th>
              <th>Company</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id}>
                <td>{customer._id}</td>
                <td>{customer.customerName}</td>
                <td>{customer.customerContact.phone}</td>
                <td>{customer.customerContact.email}</td>
                <td>{customer.customerContact.address}</td>
                <td>{customer.customerContact.gstin}</td>
                <td>{customer.company}</td>
                <td>{customer.createdBy}</td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={(e) => handleEdit(customer, e)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn danger"
                    onClick={(e) => handleDelete(customer._id, e)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerList;