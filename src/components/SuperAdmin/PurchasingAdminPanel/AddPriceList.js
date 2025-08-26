import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PurchasingAdminPanel.css';
import { useAuth } from '../../../contexts/AuthContext';

const AddPriceList = () => {
  const [validFrom, setValidFrom] = useState('');
  const [products, setProducts] = useState([
    { itemName: '', itemId: '', mrp: '', dp: '', sp: '', qty: '', profitPerPc: '', totalProfit: '' }
  ]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  const handleChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;

    if (field === 'profitPerPc' || field === 'qty') {
      const profit = parseFloat(updated[index].profitPerPc || 0);
      const qty = parseInt(updated[index].qty || 0);
      updated[index].totalProfit = (profit * qty).toFixed(2);
    }

    setProducts(updated);
  };

  const handleAddRow = () => {
    setProducts([...products, { itemName: '', itemId: '', mrp: '', dp: '', sp: '', qty: '', profitPerPc: '', totalProfit: '' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check permissions - only Super Admin and Purchase Admin can access
    if (!userProfile) {
      setError('User profile not found. Please login again.');
      return;
    }

    const userRole = userProfile.role?.toLowerCase();
    const userDept = userProfile.department?.toLowerCase();
    
    if (userRole !== 'superadmin' && userRole !== 'super_admin' && 
        !(userRole === 'admin' && userDept === 'purchase')) {
      setError('Access denied. Only Super Admin and Purchase Admin can create Price Lists.');
      return;
    }
    
    try {
      const token = await getAuthToken();
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`${API_BASE_URL}/api/price-lists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ validFrom, products }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to save');

      alert('Price List Saved Successfully!');
      // Navigate based on user role
      if (userRole === 'superadmin' || userRole === 'super_admin') {
        navigate('/price-lists');
      } else {
        navigate('/purchasing-admin/price-lists');
      }
    } catch (err) {
      console.error('Submit Error:', err);
      alert(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="price-list-container">
      <button 
        className="bck-button" 
        onClick={() => {
          // Navigate back based on user role
          if (userProfile?.role?.toLowerCase() === 'superadmin' || userProfile?.role?.toLowerCase() === 'super_admin') {
            navigate('/price-lists');
          } else {
            navigate('/purchasing-admin/price-lists');
          }
        }}
        style={{
          backgroundColor: '#997a8d',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Back to Price Lists
      </button>
      <h2>WYENFOS PRICE LIST</h2>
      {error && <p className="error" style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
      <label>
        Valid from:
        <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
      </label>
      <form onSubmit={handleSubmit}>
        <table>
          <thead>
            <tr>
              <th>NO</th>
              <th>ITEM NAME</th>
              <th>ITEM ID</th>
              <th>MRP</th>
              <th>DP /PCS</th>
              <th>SP</th>
              <th>QTY</th>
              <th>PROFIT /PCS</th>
              <th>TOTAL PROFIT</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input value={p.itemName} onChange={e => handleChange(i, 'itemName', e.target.value)} /></td>
                <td><input value={p.itemId} onChange={e => handleChange(i, 'itemId', e.target.value)} /></td>
                <td><input value={p.mrp} onChange={e => handleChange(i, 'mrp', e.target.value)} /></td>
                <td><input value={p.dp} onChange={e => handleChange(i, 'dp', e.target.value)} /></td>
                <td><input value={p.sp} onChange={e => handleChange(i, 'sp', e.target.value)} /></td>
                <td><input value={p.qty} onChange={e => handleChange(i, 'qty', e.target.value)} /></td>
                <td><input value={p.profitPerPc} onChange={e => handleChange(i, 'profitPerPc', e.target.value)} /></td>
                <td>{p.totalProfit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="button-group">
          <button type="button" className="back-button" onClick={() => {
            // Navigate back based on user role
            if (userProfile?.role?.toLowerCase() === 'superadmin' || userProfile?.role?.toLowerCase() === 'super_admin') {
              navigate('/price-lists');
            } else {
              navigate('/purchasing-admin/price-lists');
            }
          }}>Back</button>
          <button type="button" onClick={handleAddRow}>Add Row</button>
          <button type="submit">Save Price List</button>
        </div>
      </form>
    </div>
  );
};

export default AddPriceList;