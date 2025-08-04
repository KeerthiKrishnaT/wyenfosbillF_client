import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../Dashboard.css';

const NewUsers = () => {
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    const fetchWeeklyNewCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/customers/today', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setWeeklyData(res.data || []);
      } catch (err) {
        console.error('Error fetching weekly new users:', err);
      }
    };

    fetchWeeklyNewCustomers();
  }, []);

  return (
    <div className="newwuser-card">
      <h4>New Customers (Weekly)</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={weeklyData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NewUsers;
