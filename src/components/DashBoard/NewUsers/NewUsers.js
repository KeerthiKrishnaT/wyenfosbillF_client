import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './NewUsers.css';

const NewUsers = () => {
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCustomers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No authentication token found');
          setRecentCustomers([]);
          return;
        }
        
        // Fetch all customers and get the recent ones
        const response = await axios.get('http://localhost:5000/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const customers = response.data || [];
        
        // Sort by creation date and take the latest 10
        const recent = customers
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(customer => ({
            ...customer,
            createdDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A',
            createdBy: customer.createdBy || 'Unknown'
          }));

        setRecentCustomers(recent);
      } catch (err) {
        console.error('Error fetching recent customers:', err);
        setRecentCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentCustomers();
  }, []);

  // Prepare data for chart (last 7 days)
  const prepareChartData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      
      const count = recentCustomers.filter(customer => {
        const customerDate = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '';
        return customerDate === dateStr;
      }).length;
      
      last7Days.push({
        date: dateStr,
        count: count
      });
    }
    return last7Days;
  };

  return (
    <div className="newwuser-card">
      <h4>Recently Created Customers</h4>
      {loading ? (
        <div className="loading">Loading recent customers...</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={prepareChartData()} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="recent-customers-list">
            <h5>Latest Customers</h5>
            {recentCustomers.length > 0 ? (
              <div className="customers-grid">
                {recentCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer.id || index} className="customer-item">
                    <div className="customer-name">{customer.customerName || 'N/A'}</div>
                    <div className="customer-details">
                      <span>ID: {customer.customerId || 'N/A'}</span>
                      <span>Created: {customer.createdDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No recent customers found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewUsers;
