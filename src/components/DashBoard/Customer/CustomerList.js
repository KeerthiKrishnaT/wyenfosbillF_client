import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

function CustomerList({ onEdit = () => {}, refreshTrigger }) {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log('Fetching customers...');
        console.log('Current user:', currentUser);
        
        if (!currentUser) throw new Error('No authentication token found');
        const idToken = await currentUser.getIdToken(true);
        console.log('Got ID token:', idToken ? 'Token received' : 'No token');
        
        const res = await axios.get(`${API_BASE_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        console.log('API Response:', res);
        console.log('Fetched customers:', res.data);
        console.log('Number of customers:', res.data.length);
        setCustomers(res.data);
      } catch (err) {
        console.error('Error fetching customers:', err);
        console.error('Error response:', err.response?.data);
        alert('Failed to fetch customers: ' + err.message);
      }
    };
    if (currentUser) {
      fetchCustomers();
    } else {
      console.log('No current user, skipping fetch');
    }
  }, [currentUser, refreshTrigger]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        if (!currentUser) throw new Error('No authentication token found');
        const idToken = await currentUser.getIdToken(true);
        await axios.delete(`${API_BASE_URL}/api/customers/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setCustomers(customers.filter((customer) => (customer.id || customer._id) !== id));
      } catch (err) {
        alert('Failed to delete customer: ' + err.message);
      }
    }
  };

  const handleEdit = (customer, e) => {
    e.stopPropagation(); // Prevent click from bubbling to flip book
    if (onEdit && typeof onEdit === 'function') {
      onEdit(customer.id || customer._id);
    }
  };

  // Sort customers by customerId in ascending order
  const sortedCustomers = [...customers].sort((a, b) => {
    const idA = a.customerId || '';
    const idB = b.customerId || '';
    
    // Extract numeric part from customer ID (e.g., "CUST-1" -> 1)
    const numA = parseInt(idA.replace(/\D/g, '')) || 0;
    const numB = parseInt(idB.replace(/\D/g, '')) || 0;
    
    return numA - numB;
  });

  return (
    <div className="customer-list-container">
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
            {sortedCustomers.length === 0 ? (
              <tr key="no-customers">
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No customers found. Add your first customer!
                </td>
              </tr>
            ) : (
              sortedCustomers.map((customer) => (
                <tr key={customer.id || customer._id}>
                  <td>{customer.customerId || customer._id}</td>
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
                    onClick={(e) => handleDelete(customer.id || customer._id, e)}
                  >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerList;