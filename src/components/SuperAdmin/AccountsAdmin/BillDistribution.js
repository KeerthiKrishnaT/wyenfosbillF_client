import React, { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import './BillingDetails.css';

Chart.register(...registerables);

const BillDistribution = () => {
  const [distribution, setDistribution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

  useEffect(() => {
    const fetchDistribution = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/auth/accounts/bill-distribution');
        setDistribution(response.data);
      } catch (err) {
        setNotificationMessage({ type: 'error', text: `Failed to fetch bill distribution: ${err.message}` });
        setTimeout(() => setNotificationMessage(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistribution();
  }, []);

  useEffect(() => {
    const ctx = document.getElementById('billDistributionChart')?.getContext('2d');
    if (!ctx || !distribution) return;

    const chartData = {
      labels: ['Cash Bills', 'Credit Bills', 'Credit Notes', 'Debit Notes'],
      datasets: [
        {
          data: [
            distribution.cashBills,
            distribution.creditBills,
            distribution.creditNotes,
            distribution.debitNotes,
          ],
          backgroundColor: ['#3498db', '#9b59b6', '#e74c3c', '#f1c40f'],
          borderColor: '#fff',
          borderWidth: 1,
        },
      ],
    };

    const billDistributionChart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, padding: 20, font: { size: 12 }, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total ? ((value / total) * 100).toFixed(2) : 0;
                return `${label}: ₹${value.toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    return () => billDistributionChart.destroy();
  }, [distribution]);

  return (
    <div className="billing-details">
      <h2>Bill Distribution</h2>

      {notificationMessage && (
        <div className={`message ${notificationMessage.type}`}>
          <p>{notificationMessage.text}</p>
          <button
            type="button"
            onClick={() => setNotificationMessage(null)}
            aria-label="Close message"
          >
            Close
          </button>
        </div>
      )}

      {isLoading && <div className="loading-overlay">Loading...</div>}

      <div className="chart-container">
        <h3>Bill Distribution</h3>
        <canvas id="billDistributionChart" width="400" height="400" aria-label="Bill distribution pie chart"></canvas>
      </div>

      <div className="bills-table">
        <h3>Latest Distribution</h3>
        {distribution ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cash Bills</th>
                <th>Credit Bills</th>
                <th>Credit Notes</th>
                <th>Debit Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{new Date(distribution.date).toLocaleDateString()}</td>
                <td>₹{distribution.cashBills.toLocaleString()}</td>
                <td>₹{distribution.creditBills.toLocaleString()}</td>
                <td>₹{distribution.creditNotes.toLocaleString()}</td>
                <td>₹{distribution.debitNotes.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>No distribution data available.</p>
        )}
      </div>
    </div>
  );
};

export default BillDistribution;