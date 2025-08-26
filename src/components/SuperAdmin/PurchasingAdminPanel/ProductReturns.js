import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const ProductReturns = () => {
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  const fetchReturns = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/product-returns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setReturns(response.data.data || []);
      } else {
        setError('Failed to fetch returns data');
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError(err.response?.data?.message || 'Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  }, [currentUser, getAuthToken, API_BASE_URL]);

  const fetchSummary = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const token = await getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/product-returns/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching returns summary:', err);
    }
  }, [currentUser, getAuthToken, API_BASE_URL]);

  useEffect(() => {
    if (currentUser) {
      fetchReturns();
      fetchSummary();
    }
  }, [fetchReturns, fetchSummary, currentUser]);

  if (loading) {
    return <div className="loading">Loading returns data...</div>;
  }

  return (
    <div className="product-returns-panel">
      <button className="bck-button" onClick={() => navigate(-1)}>← Back</button>
      <h2>📦 Product Returns Management</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Section */}
      {summary && (
        <div className="returns-summary" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>📊 Returns Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="summary-card">
              <h4>Total Returns</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>{summary.totalReturns}</p>
            </div>
            <div className="summary-card">
              <h4>Total Quantity</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fd7e14' }}>{summary.totalQuantity}</p>
            </div>
            <div className="summary-card">
              <h4>Total Value</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>₹{summary.totalValue?.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Returns by Type */}
          {summary.returnsByType && Object.keys(summary.returnsByType).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Returns by Type</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(summary.returnsByType).map(([type, data]) => (
                  <div key={type} style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <strong>{type}</strong>
                    <div>Count: {data.count}</div>
                    <div>Qty: {data.quantity}</div>
                    <div>Value: ₹{data.value?.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Returns Table */}
      <div className="returns-table-section">
        <h3>🔄 All Product Returns</h3>
        {returns.length === 0 ? (
          <p>No returns found.</p>
        ) : (
          <table border="1" cellPadding="8" style={{ fontSize: '12px', width: '100%' }}>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>GST Amount</th>
                <th>Return Type</th>
                <th>Credit Note #</th>
                <th>Return Date</th>
                <th>Reason</th>
                <th>Processed By</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret.id} style={{ 
                  backgroundColor: ret.returnType === 'credit-note' ? '#d4edda' : '#fff3cd'
                }}>
                  <td>{ret.itemCode}</td>
                  <td>{ret.itemName}</td>
                  <td style={{ fontWeight: 'bold', color: '#28a745' }}>{ret.quantity}</td>
                  <td>₹{ret.unitPrice?.toFixed(2)}</td>
                  <td>₹{ret.totalAmount?.toFixed(2)}</td>
                  <td>₹{ret.gstAmount?.toFixed(2)}</td>
                  <td style={{ 
                    color: ret.returnType === 'credit-note' ? '#155724' : '#856404',
                    fontWeight: 'bold'
                  }}>
                    {ret.returnType === 'credit-note' ? 'Credit Note' : ret.returnType}
                  </td>
                  <td>{ret.creditNoteNumber || 'N/A'}</td>
                  <td>{ret.formattedReturnDate}</td>
                  <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                    {ret.reason || 'Customer return'}
                  </td>
                  <td>{ret.processedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Returns Section */}
      {summary?.recentReturns && summary.recentReturns.length > 0 && (
        <div className="recent-returns" style={{ marginTop: '2rem' }}>
          <h3>🕒 Recent Returns (Last 10)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {summary.recentReturns.map((ret, index) => (
              <div key={index} style={{ 
                padding: '1rem', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                border: '1px solid #dee2e6' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>{ret.itemName}</strong>
                  <span style={{ 
                    backgroundColor: ret.returnType === 'credit-note' ? '#d4edda' : '#fff3cd',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {ret.returnType === 'credit-note' ? 'Credit Note' : ret.returnType}
                  </span>
                </div>
                <div>Item Code: {ret.itemCode}</div>
                <div>Quantity: <strong style={{ color: '#28a745' }}>{ret.quantity}</strong></div>
                <div>Value: ₹{((ret.quantity || 0) * (ret.unitPrice || 0)).toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                  {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .product-returns-panel {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .bck-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        
        .bck-button:hover {
          background: #0056b3;
        }
        
        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
          color: #6c757d;
        }
        
        .summary-card {
          text-align: center;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .summary-card h4 {
          margin: 0 0 0.5rem 0;
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .summary-card p {
          margin: 0;
        }
        
        table {
          border-collapse: collapse;
          margin-top: 1rem;
        }
        
        th {
          background: #f8f9fa;
          font-weight: bold;
          text-align: left;
        }
        
        th, td {
          padding: 0.5rem;
          border: 1px solid #dee2e6;
        }
        
        tr:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default ProductReturns;
