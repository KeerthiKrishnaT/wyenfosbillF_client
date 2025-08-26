
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import CustomerForm from './CustomerForm';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

function CustomerSelect({ selectedId, onChange, isEditMode = false }) {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        if (!currentUser) throw new Error('No authentication token');
        const idToken = await currentUser.getIdToken(true);
        const res = await axios.get(`${API_BASE_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };
    if (currentUser) {
      fetchCustomers();
    }
  }, [currentUser]);

  // Sort customers by customerId in ascending order
  const sortedCustomers = [...customers].sort((a, b) => {
    const idA = parseInt(a.customerId) || 0;
    const idB = parseInt(b.customerId) || 0;
    return idA - idB;
  });



  const handleCustomerChange = (customerId) => {
    onChange(customerId);
    if (customerId) {
      const customer = customers.find(c => (c._id === customerId) || (c.id === customerId));
      // Always set the selected customer when a customer is chosen
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
  };

  const handleCustomerUpdated = () => {
    // Refresh the customer list after update
    window.location.reload();
  };

  return (
    <div className="customer-select-container">

      <select value={selectedId} onChange={(e) => handleCustomerChange(e.target.value)}>
        <option key="default" value="">Select a customer</option>
        {sortedCustomers.map((customer, index) => {
          const key = customer.id || customer._id || customer.customerId || `customer-${index}`;
          const value = customer.id || customer._id || customer.customerId;
          return (
            <option key={key} value={value}>
              {customer.customerName} (ID: {customer.customerId || 'N/A'})
            </option>
          );
        })}
      </select>

      {selectedCustomer && (
        <div className="edit-customer-section">
          <h3>Edit Customer: {selectedCustomer.customerName}</h3>
          <div className="customer-details">
            <p><strong>Customer ID:</strong> {selectedCustomer.customerId}</p>
            <p><strong>Current Name:</strong> {selectedCustomer.customerName}</p>
            <p><strong>Phone:</strong> {selectedCustomer.customerContact?.phone || 'N/A'}</p>
            <p><strong>Email:</strong> {selectedCustomer.customerContact?.email || 'N/A'}</p>
          </div>
          <CustomerForm 
            customerToEdit={selectedCustomer}
            onCustomerAdded={handleCustomerUpdated}
            isEditMode={true}
          />
        </div>
      )}

      {!selectedCustomer && selectedId && (
        <div className="no-customer-selected">
          <p>Please select a customer from the dropdown above to edit.</p>
        </div>
      )}
    </div>
  );
}

export default CustomerSelect;
