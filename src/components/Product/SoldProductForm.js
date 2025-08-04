import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './Products.css';

const SoldProductForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    itemCode: '',
    itemName: '',
    hsn: '',
    gst: 0,
    unitRate: 0,
    quantity: 1,
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [allSoldItems, setAllSoldItems] = useState([]);
  const [filters, setFilters] = useState({
    source: 'all',
    startDate: '',
    endDate: '',
    searchTerm: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const api = useMemo(() => axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    timeout: 10000,
  }), []);

  const fetchSoldItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/sold-products/all-sold-items');
      if (response.data.success) {
        setAllSoldItems(response.data.data);
      } else {
        setError('Failed to fetch sold items');
      }
    } catch (err) {
      console.error('Error fetching sold items:', err);
      setError(err.response?.data?.message || 'Failed to fetch sold items');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSoldItems();
  }, [fetchSoldItems]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
    const data = {
      itemCode: form.itemCode,
      itemName: form.itemName,
      hsn: form.hsn,
      gst: parseFloat(form.gst) || 0,
      unitRate: parseFloat(form.unitRate) || 0,
      quantity: parseInt(form.quantity, 10) || 1,
    };
if (
      !data.itemCode ||
      !data.itemName ||
      !data.hsn ||
      data.gst < 0 ||
      data.unitRate < 0 ||
      data.quantity < 1
    ) {
      setError(
        'All fields (Item Code, Item Name, HSN) are required. GST, Unit Rate must be non-negative, and Quantity must be at least 1.'
      );
      setLoading(false);
      return;
    }
      const response = editingProduct
        ? await api.put(`/sold-products/${editingProduct._id}`, data)
        : await api.post('/sold-products', data);

      if (response.data.success) {
        setForm({ itemCode: '', itemName: '', hsn: '', gst: 0, unitPrice: 0, quantity: 1 });
        setEditingProduct(null);
        fetchSoldItems();
        if (onSuccess) onSuccess();
      } else {
        setError(response.data.message || 'Failed to save sale');
      }
    } catch (err) {
      console.error('Error saving sale:', err);
      setError(err.response?.data?.message || 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({ itemCode: '', itemName: '', hsn: '', gst: 0, unitPrice: 0, quantity: 1 });
    setEditingProduct(null);
  };

  const handleEdit = (item) => {
    setEditingProduct(item);
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      hsn: item.hsn,
      gst: item.gst || 0,
      unitRate: item.unitRate || 0,
      quantity: item.quantity || 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split(':');
    setSortConfig({ key, direction });
  };

  const filteredProducts = useMemo(() => {
    let result = [...allSoldItems];

    if (filters.source !== 'all') {
      result = result.filter((item) => item.source === filters.source);
    }

    if (filters.startDate) {
      result = result.filter((item) => new Date(item.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      result = result.filter((item) => new Date(item.date) <= new Date(filters.endDate));
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.itemCode.toLowerCase().includes(term) ||
          item.itemName.toLowerCase().includes(term) ||
          (item.invoice && item.invoice.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (sortConfig.key === 'date') {
        return (new Date(aValue) - new Date(bValue)) * direction;
      }
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      return (aValue - bValue) * direction;
    });

    return result;
  }, [allSoldItems, filters, sortConfig]);

  return (
    <div className="spf-wrapper">
      <div className="spf-form-section">
        <h2>{editingProduct ? 'Edit Sale Record' : 'Record New Sale'}</h2>
        <form onSubmit={handleSubmit} className="spf-grid">
          {['itemCode', 'itemName', 'hsn', 'gst', 'unitPrice', 'quantity'].map((field) => (
            <div className="spf-field" key={field}>
              <label>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}:</label>
              <input
                type={field === 'gst' || field === 'unitPrice' || field === 'quantity' ? 'number' : 'text'}
                name={field}
                value={form[field]}
                onChange={handleFormChange}
                required
              />
            </div>
          ))}

          <div className="spf-form-buttons">
            <button type="submit" className="spf-btn spf-submit" disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Sale' : 'Record Sale'}
            </button>
            {editingProduct && (
              <button type="button" className="spf-btn spf-cancel" onClick={handleCancelEdit} disabled={loading}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="spf-filter-section">
        <h2>Sold Products</h2>
        <div className="spf-filter-grid">
          {[
            { label: 'Source', name: 'source', type: 'select', options: ['all', 'SoldProduct', 'CashBill', 'CreditBill', 'CreditNote'] },
            { label: 'Start Date', name: 'startDate', type: 'date' },
            { label: 'End Date', name: 'endDate', type: 'date' },
            { label: 'Search', name: 'searchTerm', type: 'text' },
          ].map(({ label, name, type, options }) => (
            <div className="spf-filter-group" key={name}>
              <label>{label}:</label>
              {type === 'select' ? (
                <select name={name} value={filters[name]} onChange={handleFilterChange}>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input type={type} name={name} value={filters[name]} onChange={handleFilterChange} />
              )}
            </div>
          ))}

          <div className="spf-filter-group">
            <label>Sort By:</label>
            <select value={`${sortConfig.key}:${sortConfig.direction}`} onChange={handleSortChange}>
              <option value="date:desc">Date (Newest First)</option>
              <option value="date:asc">Date (Oldest First)</option>
              <option value="itemName:asc">Item Name (A-Z)</option>
              <option value="itemName:desc">Item Name (Z-A)</option>
              <option value="itemCode:asc">Item Code (A-Z)</option>
              <option value="itemCode:desc">Item Code (Z-A)</option>
              <option value="unitRate:desc">Price (High to Low)</option>
              <option value="unitRate:asc">Price (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="spf-loader">Loading...</div>}
      {error && <div className="spf-error">{error}</div>}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="spf-empty">No sold products found.</div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <div className="spf-table-section">
          <h3>All Sold Items</h3>
          <table className="spf-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>HSN</th>
                <th>GST (%)</th>
                <th>Unit Rate (₹)</th>
                <th>Quantity</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item._id}>
                  <td>{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td>{item.hsn}</td>
                  <td>{item.gst}</td>
                  <td>{item.unitRate}</td>
                  <td>{item.quantity}</td>
                  <td>{item.source}</td>
                  <td>
                    <button
                      className="spf-edit-btn"
                      onClick={() => handleEdit(item)}
                      title="Edit Sale"
                    >✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SoldProductForm;
