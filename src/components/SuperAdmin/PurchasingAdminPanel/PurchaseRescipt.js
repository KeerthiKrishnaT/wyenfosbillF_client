import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPurchase, updatePurchase } from './PurchaseService';
import './PurchasingAdminPanel.css';

const PurchaseReceiptDetails = ({ onCancel, onSubmit, initialData }) => {
  const [billFile, setBillFile] = useState(null);
  const [manualEntry, setManualEntry] = useState({
    itemCode: '',
    itemName: '',
    quantity: '',
    unitPrice: '',
    gst: '',
    invoiceNumber: '',
    vendor: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setManualEntry({
        itemCode: initialData.itemCode || '',
        itemName: initialData.itemName || '',
        quantity: initialData.quantity || '',
        unitPrice: initialData.unitPrice || '',
        gst: initialData.gst || '',
        invoiceNumber: initialData.invoiceNumber || '',
        vendor: initialData.vendor || '',
        purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  const handleFileChange = (e) => {
    setBillFile(e.target.files[0]);
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      if (billFile) {
        formData.append('bill', billFile);
      }
      Object.entries(manualEntry).forEach(([key, value]) => {
        formData.append(key, value);
      });

      let result;
      if (initialData) {
        result = await updatePurchase(initialData._id, formData);
      } else {
        result = await createPurchase(formData);
      }

      onSubmit(result.data);
      navigate('/purchasing-admin-panel/purchases/rescipt-List');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save purchase receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/purchasing-admin-panel');
  };
 return (
    <div className="purchase-receipt-form card-3d" style={{ backgroundColor: 'var(--rose-gold-secondary)' }}>
       <>
          {error && <div className="error-message" style={{ color: 'var(--rose-gold-accent)' }}>{error}</div>}

          <div className="form-section">
            <h2>Add Purchase Receipt</h2><br/>
            <label htmlFor="itemCode">Item Code</label>
            <input
              type="text"
              name="itemCode"
              value={manualEntry.itemCode}
              onChange={handleManualChange}
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="itemName">Item Name</label>
            <input
              type="text"
              name="itemName"
              value={manualEntry.itemName}
              onChange={handleManualChange}
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={manualEntry.quantity}
              onChange={handleManualChange}
              min="1"
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="unitPrice">Unit Price</label>
            <input
              type="number"
              name="unitPrice"
              value={manualEntry.unitPrice}
              onChange={handleManualChange}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="gst">GST (%)</label>
            <input
              type="number"
              name="gst"
              value={manualEntry.gst}
              onChange={handleManualChange}
              min="0"
              step="0.1"
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="invoiceNumber">Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={manualEntry.invoiceNumber}
              onChange={handleManualChange}
            />
          </div>

          <div className="form-section">
            <label htmlFor="vendor">Vendor</label>
            <input
              type="text"
              name="vendor"
              value={manualEntry.vendor}
              onChange={handleManualChange}
            />
          </div>

          <div className="form-section">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              type="date"
              name="purchaseDate"
              value={manualEntry.purchaseDate}
              onChange={handleManualChange}
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              name="notes"
              value={manualEntry.notes}
              onChange={handleManualChange}
            />
          </div>

          <div className="form-section">
            <label htmlFor="bill">Upload Purchase Bill (PDF/Image)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
          </div>

          <div className="form-actions">
            <button
              className="btn-3d"
              onClick={handleSubmit}
              disabled={loading}
              style={{ backgroundColor: 'var(--rose-gold-primary)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
            >
              {loading ? 'Submitting...' : (initialData ? 'Save' : 'Submit')}
            </button>
            {initialData && (
              <button
                className="btn-3d btn-edit"
                onClick={handleSubmit}
                disabled={loading}
                style={{ backgroundColor: 'var(--rose-gold-accent)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
              >
                Edit
              </button>
            )}
            <button
              className="btn-3d"
              onClick={handleBack}
              disabled={loading}
              style={{ backgroundColor: 'var(--rose-gold-secondary)', ':hover': { backgroundColor: 'var(--button-hover-bg)' } }}
            >
              Back
            </button>
          </div>
        </>
    
    </div>
  );
};

export default PurchaseReceiptDetails;