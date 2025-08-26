import React, { useState, useEffect, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import './BillingDetails.css';
import { useAuth } from '../../../contexts/AuthContext';

Chart.register(...registerables);

const BillDistribution = () => {
  const [distribution, setDistribution] = useState(null);
  const [latestBills, setLatestBills] = useState({
    cashBills: [],
    creditBills: [],
    creditNotes: [],
    debitNotes: []
  });
  const [staffList, setStaffList] = useState([]);
  const [allCashBills, setAllCashBills] = useState([]);
  const [allCreditBills, setAllCreditBills] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('distribution');
  const { currentUser } = useAuth();
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    try {
      return await currentUser.getIdToken(true);
    } catch (error) {
      if (error.code === 'auth/quota-exceeded') {
        console.warn('Firebase quota exceeded, using mock token for testing');
        // Return a mock token for testing
        return 'mock-token-for-testing';
      }
      throw error;
    }
  }, [currentUser]);
  
  const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  useEffect(() => {
    const fetchAllData = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      try {
        const token = await getAuthToken();
        
        // Fetch all data in parallel
        const [
          distributionRes,
          cashBillsRes,
          creditBillsRes,
          creditNotesRes,
          debitNotesRes,
          staffRes,
          comparisonRes
        ] = await Promise.all([
          api.get('/accounts/bill-distribution', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/cashbills', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/creditbills', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/creditnotes', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/debitnotes', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/accounts/staff/list', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/accounts/comparison-data', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setDistribution(distributionRes.data);
        setAllCashBills(cashBillsRes.data || []);
        setAllCreditBills(creditBillsRes.data?.data || []);
        setComparisonData(comparisonRes.data);

        // Filter staff (exclude admin and super admin)
        const filteredStaff = (staffRes.data || []).filter(staff => 
          staff.role !== 'admin' && staff.role !== 'super_admin'
        );
        setStaffList(filteredStaff);

        // Get today's bills
        const today = new Date().toDateString();
        const todayCashBills = (cashBillsRes.data || []).filter(bill => 
          new Date(bill.date || bill.createdAt).toDateString() === today
        );
        const todayCreditBills = (creditBillsRes.data || []).filter(bill => 
          new Date(bill.date || bill.createdAt).toDateString() === today
        );
        const todayCreditNotes = (creditNotesRes.data || []).filter(note => 
          new Date(note.date || note.createdAt).toDateString() === today
        );
        const todayDebitNotes = (debitNotesRes.data || []).filter(note => 
          new Date(note.date || note.createdAt).toDateString() === today
        );

        setLatestBills({
          cashBills: todayCashBills,
          creditBills: todayCreditBills,
          creditNotes: todayCreditNotes,
          debitNotes: todayDebitNotes
        });

      } catch (err) {
        setNotificationMessage({ type: 'error', text: `Failed to fetch data: ${err.message}` });
        setTimeout(() => setNotificationMessage(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [currentUser, getAuthToken, api]);

  // Pie Chart for Bill Distribution
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

  // Bar Chart for Profit Comparison
  useEffect(() => {
    const ctx = document.getElementById('profitComparisonChart')?.getContext('2d');
    if (!ctx || !comparisonData) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentYearData = months.map(month => {
      const monthData = comparisonData.currentYear?.find(m => m.month === month);
      return monthData ? monthData.profit : 0;
    });
    const previousYearData = months.map(month => {
      const monthData = comparisonData.previousYear?.find(m => m.month === month);
      return monthData ? monthData.profit : 0;
    });

    const chartData = {
      labels: months,
      datasets: [
        {
          label: 'Current Year',
          data: currentYearData,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1,
        },
        {
          label: 'Previous Year',
          data: previousYearData,
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          borderWidth: 1,
        },
      ],
    };

    const profitComparisonChart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return '₹' + value.toLocaleString();
              },
            },
          },
        },
      },
    });

    return () => profitComparisonChart.destroy();
  }, [comparisonData]);

  const renderLatestBills = () => (
    <div className="latest-bills-section">
      <h3>Today's Latest Bills</h3>
      
      <div className="bills-grid">
        <div className="bill-type">
          <h4>Cash Bills ({latestBills.cashBills.length})</h4>
          <div className="bill-list">
            {latestBills.cashBills.slice(0, 5).map((bill, index) => (
              <div key={index} className="bill-item">
                <span>₹{bill.totals?.grandTotal?.toLocaleString() || 0}</span>
                <span>{new Date(bill.date || bill.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bill-type">
          <h4>Credit Bills ({latestBills.creditBills.length})</h4>
          <div className="bill-list">
            {latestBills.creditBills.slice(0, 5).map((bill, index) => (
              <div key={index} className="bill-item">
                <span>₹{bill.totals?.grandTotal?.toLocaleString() || 0}</span>
                <span>{new Date(bill.date || bill.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bill-type">
          <h4>Credit Notes ({latestBills.creditNotes.length})</h4>
          <div className="bill-list">
            {latestBills.creditNotes.slice(0, 5).map((note, index) => (
              <div key={index} className="bill-item">
                <span>₹{note.totals?.rounded?.toLocaleString() || 0}</span>
                <span>{new Date(note.date || note.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bill-type">
          <h4>Debit Notes ({latestBills.debitNotes.length})</h4>
          <div className="bill-list">
            {latestBills.debitNotes.slice(0, 5).map((note, index) => (
              <div key={index} className="bill-item">
                <span>₹{note.totals?.totalAmount?.toLocaleString() || 0}</span>
                <span>{new Date(note.date || note.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStaffList = () => (
    <div className="staff-section">
      <h3>Staff List ({staffList.length})</h3>
      <div className="staff-grid">
        {staffList.map((staff, index) => (
          <div key={index} className="staff-card">
            <div className="staff-avatar">
              {staff.profilePhoto ? (
                <img src={staff.profilePhoto} alt={staff.name} />
              ) : (
                <div className="avatar-placeholder">{staff.name?.charAt(0)}</div>
              )}
            </div>
            <div className="staff-info">
              <h4>{staff.name}</h4>
              <p>{staff.email}</p>
              <p>Role: {staff.role}</p>
              <p>Department: {staff.department || 'N/A'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAllBills = () => (
    <div className="all-bills-section">
      <div className="bills-tabs">
        <button 
          className={activeTab === 'cashbills' ? 'active' : ''} 
          onClick={() => setActiveTab('cashbills')}
        >
          All Cash Bills ({allCashBills.length})
        </button>
        <button 
          className={activeTab === 'creditbills' ? 'active' : ''} 
          onClick={() => setActiveTab('creditbills')}
        >
          All Credit Bills ({allCreditBills.length})
        </button>
      </div>

      <div className="bills-table">
        {activeTab === 'cashbills' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allCashBills.slice(0, 20).map((bill, index) => (
                <tr key={index}>
                  <td>{new Date(bill.date || bill.createdAt).toLocaleDateString()}</td>
                  <td>{bill.customerName || 'N/A'}</td>
                  <td>₹{bill.totals?.grandTotal?.toLocaleString() || 0}</td>
                  <td>{bill.status || 'Completed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'creditbills' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allCreditBills.slice(0, 20).map((bill, index) => (
                <tr key={index}>
                  <td>{new Date(bill.date || bill.createdAt).toLocaleDateString()}</td>
                  <td>{bill.customerName || 'N/A'}</td>
                  <td>₹{bill.totals?.grandTotal?.toLocaleString() || 0}</td>
                  <td>{bill.status || 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="billing-details">
      <h2>Bill Distribution & Analytics</h2>

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

      {/* Latest Bills Section */}
      {renderLatestBills()}

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Bill Distribution (Pie Chart)</h3>
          <canvas id="billDistributionChart" width="400" height="400" aria-label="Bill distribution pie chart"></canvas>
        </div>

        <div className="chart-container">
          <h3>Profit Comparison (Bar Chart)</h3>
          <canvas id="profitComparisonChart" width="400" height="400" aria-label="Profit comparison bar chart"></canvas>
        </div>
      </div>

      {/* Distribution Summary */}
      {distribution && (
        <div className="distribution-summary">
          <h3>Distribution Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Cash Bills:</span>
              <span className="value">₹{distribution.cashBills?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Credit Bills:</span>
              <span className="value">₹{distribution.creditBills?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Credit Notes:</span>
              <span className="value">₹{distribution.creditNotes?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Debit Notes:</span>
              <span className="value">₹{distribution.debitNotes?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Staff List Section */}
      {renderStaffList()}

      {/* All Bills Section */}
      {renderAllBills()}
    </div>
  );
};

export default BillDistribution;