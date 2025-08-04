import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import axios from 'axios';
import './WeeklyRevenue.css';

const WeeklyRevenue = () => {
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/revenue/weekly', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { cash, credit, debit, totalRevenue } = response.data;

        const data = [
          {
            week: 'This Week',
            cash,
            credit,
            debit,
            total: totalRevenue,
          },
        ];

        setWeeklyData(data);
      } catch (error) {
        console.error('Error fetching weekly revenue:', error);
      }
    };

    fetchRevenue();
  }, []);

  return (
    <div className="revenue-card revenue-animated">
      <h2>Weekly Revenue (Cash + Credit + Debit)</h2>
      <div className="chartt-container">
        {weeklyData.length > 0 ? (
          <BarChart
            width={520}
            height={360}
            data={weeklyData}
            margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="#A3AED0" tick={{ fontSize: 14 }} />
            <YAxis stroke="#A3AED0" tickFormatter={(value) => `$${value}`} tick={{ fontSize: 14 }} />
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend verticalAlign="bottom" height={36} iconSize={14} />
            <Bar dataKey="cash" fill="#82ca9d" barSize={20} name="Cash" />
            <Bar dataKey="credit" fill="#36A2EB" barSize={20} name="Credit" />
            <Bar dataKey="debit" fill="#FF6384" barSize={20} name="Debit" />
            {/* <Bar dataKey="total" fill="#4BC0C0" barSize={20} name="Total" /> */}
          </BarChart>
        ) : (
          <p>No data available for the chart.</p>
        )}
      </div>
    </div>
  );
};

export default WeeklyRevenue;