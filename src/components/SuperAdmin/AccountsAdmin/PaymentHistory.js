import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './BillingDetails.css';
import { useAuth } from '../../../contexts/AuthContext';

const PaymentHistory = () => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    billType: 'all',
    searchTerm: ''
  });
  const { currentUser } = useAuth();
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  const fetchPaymentHistory = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = await getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/accounts/payment-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setPaymentHistory(response.data.data || []);
      } else {
        setError('Failed to fetch payment history');
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.message || 'Failed to fetch payment history');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getAuthToken, API_BASE_URL]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const filteredPayments = paymentHistory.filter(payment => {
    const paymentDate = new Date(payment.paymentDate || payment.date);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    // Date filter
    if (startDate && paymentDate < startDate) return false;
    if (endDate && paymentDate > endDate) return false;
    
    // Bill type filter
    if (filters.billType !== 'all' && payment.billType !== filters.billType) return false;
    
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        payment.billNumber?.toLowerCase().includes(searchLower) ||
        payment.customerName?.toLowerCase().includes(searchLower) ||
        payment.paymentMethod?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getBillTypeColor = (billType) => {
    switch (billType) {
      case 'cashbill': return '#3498db';
      case 'creditbill': return '#9b59b6';
      case 'creditnote': return '#e74c3c';
      case 'debitnote': return '#f1c40f';
      default: return '#95a5a6';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="billing-details">
        <div className="loading-overlay">Loading payment history...</div>
      </div>
    );
  }

  return (
    <div className="billing-details">
      <h2>Payment History</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label>Bill Type:</label>
          <select name="billType" value={filters.billType} onChange={handleFilterChange}>
            <option value="all">All Types</option>
            <option value="cashbill">Cash Bill</option>
            <option value="creditbill">Credit Bill</option>
            <option value="creditnote">Credit Note</option>
            <option value="debitnote">Debit Note</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
            placeholder="Search by bill number, customer, or payment method..."
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Payments</h3>
          <p>{filteredPayments.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Amount</h3>
          <p>{formatCurrency(filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0))}</p>
        </div>
        <div className="stat-card">
          <h3>Average Payment</h3>
          <p>{filteredPayments.length > 0 ? formatCurrency(filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0) / filteredPayments.length) : '₹0.00'}</p>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="payment-history-table">
        <h3>Payment Details</h3>
        {filteredPayments.length === 0 ? (
          <p>No payment history found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill Number</th>
                <th>Bill Type</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Processed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment._id || index}>
                  <td>{new Date(payment.paymentDate || payment.date).toLocaleDateString()}</td>
                  <td>{payment.billNumber || 'N/A'}</td>
                  <td>
                    <span 
                      className="bill-type-badge"
                      style={{ backgroundColor: getBillTypeColor(payment.billType) }}
                    >
                      {payment.billType?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td>{payment.customerName || 'N/A'}</td>
                  <td className="amount-cell">{formatCurrency(payment.amount || 0)}</td>
                  <td>{payment.paymentMethod || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${payment.status?.toLowerCase()}`}>
                      {payment.status || 'Completed'}
                    </span>
                  </td>
                  <td>{payment.processedBy || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
