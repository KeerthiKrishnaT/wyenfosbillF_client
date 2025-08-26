import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './BillSummary.css';
import { useAuth } from '../../../contexts/AuthContext';

const BillSummary = () => {
  const [cashBills, setCashBills] = useState([]);
  const [creditBills, setCreditBills] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState({ cash: false, credit: false, notes: false });
  const [errors, setErrors] = useState({ cash: null, credit: null, notes: null });
  const { currentUser } = useAuth();
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  // API configuration with Firebase auth token
  const api = useMemo(() => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 10000,
  }), [API_BASE_URL]);

  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Handle Firebase auth error
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  // Fetch all bills/notes
  const fetchData = useCallback(async (endpoint, setData, type) => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, [type]: true }));
    setErrors(prev => ({ ...prev, [type]: null }));
    try {
      const token = await getAuthToken();
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setData(response.data.data || []);
      } else {
        throw new Error(response.data.message || `Failed to fetch ${type} data`);
      }
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setErrors(prev => ({
        ...prev,
        [type]: `Failed to fetch ${type}: ${err.response?.data?.message || err.message}`
      }));
      setData([]);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [api, currentUser, getAuthToken]);

  // Initialize data fetching
  useEffect(() => {
    fetchData('/cashbills', setCashBills, 'cash');
    fetchData('/creditbills', setCreditBills, 'credit');
    fetchData('/creditnotes', setCreditNotes, 'notes');
  }, [fetchData]);

  // Render table for bills/notes
  const renderTable = (data, title, type) => (
    <div className="bill-table-wrapper">
      <h2>{title}</h2>
      {loading[type] && <div className="loader">Loading...</div>}
      {errors[type] && <div className="error">{errors[type]}</div>}
      {!loading[type] && !errors[type] && data.length === 0 && (
        <div className="empty">No {title.toLowerCase()} found.</div>
      )}
      {!loading[type] && !errors[type] && data.length > 0 && (
        <table className="bill-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Customer ID</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item._id || item.invoiceNo}>
                <td>{index + 1}</td>
                <td>{item.invoiceNo || 'N/A'}</td>
                <td>{item.customerName || 'N/A'}</td>
                <td>{item.customerId || 'N/A'}</td>
                <td>
                  {item.date
                    ? new Date(item.date).toLocaleDateString('en-IN')
                    : 'N/A'}
                </td>
                <td>
                  {item.totals?.grandTotal
                    ? item.totals.grandTotal.toFixed(2)
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="bill-summary-container">
      {renderTable(cashBills, 'Cash Bills', 'cash')}
      {renderTable(creditBills, 'Credit Bills', 'credit')}
      {renderTable(creditNotes, 'Credit Notes', 'notes')}
    </div>
  );
};

export default BillSummary;