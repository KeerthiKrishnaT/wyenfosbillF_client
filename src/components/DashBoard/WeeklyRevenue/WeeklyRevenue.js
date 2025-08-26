import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import axios from 'axios';
import './WeeklyRevenue.css';

const WeeklyRevenue = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [chartWidth, setChartWidth] = useState(480);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateChartWidth = () => {
      if (window.innerWidth > 1200) {
        setChartWidth(480);
      } else if (window.innerWidth > 768) {
        setChartWidth(400);
      } else {
        setChartWidth(300);
      }
    };

    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);

    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);

  useEffect(() => {
    const fetchWeeklyBills = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const firebaseToken = localStorage.getItem('firebaseToken');
        const authToken = firebaseToken || token;

        console.log('🔍 Fetching weekly bills with token:', authToken ? 'Token exists' : 'No token');

        if (!authToken) {
          console.warn('No authentication token found, using default data');
          setWeeklyData([
            {
              week: 'This Week',
              cash: 0,
              credit: 0,
              debit: 0,
              total: 0,
            },
          ]);
          setLoading(false);
          return;
        }

        // Fetch cash bills for this week
        const cashResponse = await axios.get('http://localhost:5000/api/revenue/cashbills/weekly', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        // Fetch credit bills for this week
        const creditResponse = await axios.get('http://localhost:5000/api/revenue/creditbills/weekly', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        // Fetch debit notes for this week
        const debitResponse = await axios.get('http://localhost:5000/api/revenue/debitnotes/weekly', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const cashCount = cashResponse.data?.length || 0;
        const creditCount = creditResponse.data?.length || 0;
        const debitCount = debitResponse.data?.length || 0;
        const totalCount = cashCount + creditCount + debitCount;

        const data = [
          {
            week: 'This Week',
            cash: cashCount,
            credit: creditCount,
            debit: debitCount,
            total: totalCount,
          },
        ];

        setWeeklyData(data);
      } catch (error) {
        console.error('Error fetching weekly bills:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        // Set default data if API fails
        setWeeklyData([
          {
            week: 'This Week',
            cash: 0,
            credit: 0,
            debit: 0,
            total: 0,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyBills();
  }, []);

  return (
    <div className="revenue-card revenue-animated">
      <h2>Weekly Bills Created</h2>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
        Cash + Credit + Debit Bills
      </p>
      <div className="chartt-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <p>Loading weekly bills data...</p>
          </div>
        ) : weeklyData.length > 0 ? (
          <BarChart
            width={chartWidth}
            height={360}
            data={weeklyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="#A3AED0" tick={{ fontSize: 14 }} />
            <YAxis stroke="#A3AED0" tick={{ fontSize: 14 }} />
            <Tooltip formatter={(value) => `${value} bills`} />
            <Legend verticalAlign="bottom" height={36} iconSize={14} />
            <Bar dataKey="cash" fill="#82ca9d" barSize={20} name="Cash Bills" />
            <Bar dataKey="credit" fill="#36A2EB" barSize={20} name="Credit Bills" />
            <Bar dataKey="debit" fill="#FF6384" barSize={20} name="Debit Notes" />
            <Bar dataKey="total" fill="#4BC0C0" barSize={20} name="Total Bills" />
          </BarChart>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <p>No bills data available for this week.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyRevenue;