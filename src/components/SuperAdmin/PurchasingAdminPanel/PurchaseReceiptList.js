import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPurchases, deletePurchase } from './PurchaseService';
import './PurchasingAdminPanel.css';

const PurchaseReceiptList = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchPurchases();
      setPurchases(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch purchases');
      console.error('API Error:', err); // Add logging for debugging
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase?')) return;
    try {
      setLoading(true);
      setError(null);
      await deletePurchase(id);
      setPurchases(purchases.filter(purchase => purchase._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete purchase');
      console.error('Delete Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (purchase) => {
    navigate(`/purchasing-admin-panel/purchases/rescipt?id=${purchase._id}`);
  };

  const handleBack = () => {
    navigate('/purchasing-admin-panel');
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  return (
    <div className="purchase-receipt-list card-3d" style={{ backgroundColor: 'var(--rose-gold-secondary)' }}>
      <div className="collapse-header">
        <h2>Purchase Receipts</h2>
        <button
          className="btn-3d collapse-btn"
          onClick={toggleCollapse}
          style={{ backgroundColor: 'var(--rose-gold-accent)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {error && <div className="error-message" style={{ color: 'var(--rose-gold-accent)' }}>{error}</div>}
          {loading && <div>Loading...</div>}

          <table className="receipt-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--rose-gold-primary)' }}>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>GST (%)</th>
                <th>Total Price</th>
                <th>Purchase Date</th>
                <th>Vendor</th>
                <th>Invoice Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(purchase => (
                <tr key={purchase._id}>
                  <td>{purchase.itemCode}</td>
                  <td>{purchase.itemName}</td>
                  <td>{purchase.quantity}</td>
                  <td>₹{purchase.unitPrice.toFixed(2)}</td>
                  <td>{purchase.gst}%</td>
                  <td>₹{purchase.totalPrice}</td>
                  <td>{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                  <td>{purchase.vendor || '-'}</td>
                  <td>{purchase.invoiceNumber || '-'}</td>
                  <td>
                    <button
                      className="btn-3d btn-edit"
                      onClick={() => handleEdit(purchase)}
                      style={{ backgroundColor: 'var(--rose-gold-accent)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-3d btn-delete"
                      onClick={() => handleDelete(purchase._id)}
                      disabled={loading}
                      style={{ backgroundColor: 'var(--rose-gold-primary)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-actions">
            <button
              className="btn-3d"
              onClick={handleBack}
              style={{ backgroundColor: 'var(--rose-gold-secondary)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseReceiptList;