import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PurchasingAdminPanel.css';
import { useAuth } from '../../../contexts/AuthContext';

const PriceListView = () => {
  const [lists, setLists] = useState([]);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedList, setEditedList] = useState(null);
  const { currentUser, userProfile } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const navigate = useNavigate();

  // Get Firebase ID token for API calls
  const getAuthToken = useCallback(async () => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return await currentUser.getIdToken(true);
  }, [currentUser]);

  useEffect(() => {
    const fetchPriceLists = async () => {
      if (!currentUser) return;
      
      // Check permissions - only Super Admin and Purchase Admin can access
      if (!userProfile) {
        setError('User profile not found. Please login again.');
        return;
      }

      const userRole = userProfile.role?.toLowerCase();
      const userDept = userProfile.department?.toLowerCase();
      
      if (userRole !== 'superadmin' && userRole !== 'super_admin' && 
          !(userRole === 'admin' && userDept === 'purchase')) {
        setError('Access denied. Only Super Admin and Purchase Admin can access Price Lists.');
        return;
      }
      
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/price-lists`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch price lists');
        }

        setLists(data.data || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      }
    };

    fetchPriceLists();
  }, [currentUser, userProfile, getAuthToken, API_BASE_URL]);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedList({ ...lists[index], products: lists[index].products.map(p => ({ ...p })) });
  };

  const handleChange = (productIndex, field, value) => {
    const updated = { ...editedList };
    updated.products[productIndex][field] = value;

    if (field === 'profitPerPc' || field === 'qty') {
      const profit = parseFloat(updated.products[productIndex].profitPerPc || 0);
      const qty = parseInt(updated.products[productIndex].qty || 0);
      updated.products[productIndex].totalProfit = (profit * qty).toFixed(2);
    }

    setEditedList(updated);
  };

  const handleSave = async (index) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/price-lists/${lists[index]._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedList),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to save');

      const updatedLists = [...lists];
      updatedLists[index] = editedList;
      setLists(updatedLists);
      setEditingIndex(null);
      setEditedList(null);
      alert('Price List Updated Successfully!');
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Something went wrong');
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this price list?')) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/price-lists/${lists[index]._id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Failed to delete');

        setLists(lists.filter((_, i) => i !== index));
        alert('Price List Deleted Successfully!');
      } catch (err) {
        console.error('Delete error:', err);
        setError(err.message || 'Something went wrong');
      }
    }
  };

  return (
    <div className="price-list-view">
      <button 
        className="bck-button" 
        onClick={() => {
          // Navigate back based on user role
          if (userProfile?.role?.toLowerCase() === 'superadmin' || userProfile?.role?.toLowerCase() === 'super_admin') {
            navigate('/super-admin');
          } else {
            navigate('/purchasing-admin');
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
        ← Back to Admin Panel
      </button>
      <div className="price-list-header">
        <h2>SAVED PRICE LISTS</h2>
        <button 
          className="create-button" 
          onClick={() => {
            // Navigate based on user role
            if (userProfile?.role?.toLowerCase() === 'superadmin' || userProfile?.role?.toLowerCase() === 'super_admin') {
              navigate('/add-price-list');
            } else {
              navigate('/purchasing-admin/add-price-list');
            }
          }}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Create New Price List
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {lists.length === 0 ? (
        <p>No price lists found.</p>
      ) : (
        lists.map((list, idx) => (
          <div key={idx} className="price-list-block">
            <div className="price-list-header">
              <h4>Valid from: {new Date(list.validFrom).toLocaleDateString()}</h4>
              <div className="button-group">
                {editingIndex === idx ? (
                  <>
                    <button className="save-button" onClick={() => handleSave(idx)}>Save</button>
                    <button className="cancel-button" onClick={() => setEditingIndex(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="edit-button" onClick={() => handleEdit(idx)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(idx)}>Delete</button>
                  </>
                )}
              </div>
            </div>
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
                {(editingIndex === idx ? editedList.products : list.products).map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.itemName}
                          onChange={(e) => handleChange(i, 'itemName', e.target.value)}
                        />
                      ) : (
                        p.itemName
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.itemId}
                          onChange={(e) => handleChange(i, 'itemId', e.target.value)}
                        />
                      ) : (
                        p.itemId
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.mrp}
                          onChange={(e) => handleChange(i, 'mrp', e.target.value)}
                        />
                      ) : (
                        p.mrp
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.dp}
                          onChange={(e) => handleChange(i, 'dp', e.target.value)}
                        />
                      ) : (
                        p.dp
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.sp}
                          onChange={(e) => handleChange(i, 'sp', e.target.value)}
                        />
                      ) : (
                        p.sp
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.qty}
                          onChange={(e) => handleChange(i, 'qty', e.target.value)}
                        />
                      ) : (
                        p.qty
                      )}
                    </td>
                    <td>
                      {editingIndex === idx ? (
                        <input
                          value={p.profitPerPc}
                          onChange={(e) => handleChange(i, 'profitPerPc', e.target.value)}
                        />
                      ) : (
                        p.profitPerPc
                      )}
                    </td>
                    <td>{p.totalProfit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default PriceListView;